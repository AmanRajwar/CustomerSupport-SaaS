# Artillery Load Test Guide - Multi-Tenant Widget API

## Overview
This load test simulates a traffic spike (500 RPS sustained over 60 seconds) to establish a performance baseline before implementing Redis caching.

---

## Installation & Setup

### 1. Install Artillery Globally
```powershell
npm install -g artillery
```

Verify installation:
```powershell
artillery --version
```

---

## Running the Load Test

### Prerequisites
- **MongoDB running locally** or accessible via `MONGO_URI`
- **Backend server running** on `http://localhost:3000`
- **Database seeded** with 50,000+ tenant records (run `npm run seed` first)
- **tenants.csv** populated with valid MongoDB ObjectIds from your database

### Step 1: Generate Actual Tenant IDs (IMPORTANT)

Before running the test, you MUST extract real tenant IDs from your MongoDB database and populate `tenants.csv`:

```javascript
// Quick Node.js script to extract tenant IDs
import mongoose from 'mongoose';
import fs from 'fs';

const MONGO_URI = 'mongodb://localhost:27017/your_db_name';

await mongoose.connect(MONGO_URI);

const db = mongoose.connection;
const tenants = await db.collection('tenants').find({}).project({ _id: 1 }).limit(1000).toArray();

const csv = 'tenantId\n' + tenants.map(t => t._id.toString()).join('\n');
fs.writeFileSync('tenants.csv', csv);

console.log(`✓ Exported ${tenants.length} tenant IDs to tenants.csv`);
process.exit(0);
```

### Step 2: Start Backend Server (if not running)
```powershell
cd Backend
npm start
```

### Step 3: Run the Load Test
```powershell
cd Backend
artillery run artillery.yml
```

### Step 4: Generate HTML Report
```powershell
artillery report artillery-report.json --output artillery-report.html
```

Then open `artillery-report.html` in your browser for a visual dashboard.

---

## Key Metrics to Monitor in Terminal Output

### Critical Performance Indicators

| Metric | What It Means | Red Flag Threshold |
|--------|---------------|-------------------|
| **RPS (Requests/sec)** | Actual throughput achieved | < 400 RPS (vs. target 500) |
| **Latency (p50)** | Median response time | > 200ms indicates DB struggles |
| **Latency (p95)** | 95th percentile response time | > 1000ms = significant bottleneck |
| **Latency (p99)** | 99th percentile response time | > 2000ms = critical bottleneck |
| **Error Rate** | % of failed requests | > 1% = serious problem |
| **Error Code 429** | Too Many Requests (rate limit) | Any occurrence = need backoff |
| **Error Code 500** | Server errors | Any occurrence = DB/app crash |
| **Connection Pool Exhaustion** | No available DB connections | "EMFILE: too many open files" |

### Example Terminal Output (Good Baseline)
```
Summary report @ 11:45:32 (+0000)
  Scenarios launched:  500000
  Scenarios completed: 500000
  Requests launched:   500000
  Requests completed:  499850
  Mean latency:        65 ms
  Min latency:         8 ms
  Max latency:         2341 ms
  p50:                 42 ms
  p90:                 120 ms
  p95:                 245 ms
  p99:                 512 ms
  RPS sent: 499.95
  Data received: 1.2 MB
  Error rate: 0.03%
```

### Example Terminal Output (Struggling Baseline - Before Cache)
```
Summary report @ 11:45:32 (+0000)
  Scenarios launched:  500000
  Scenarios completed: 498500
  Requests launched:   500000
  Requests completed:  497200
  Mean latency:        342 ms        <-- Too high!
  Min latency:         45 ms
  Max latency:         12541 ms      <-- Timeout spikes
  p50:                 178 ms
  p90:                 892 ms        <-- p90 already high
  p95:                 1823 ms       <-- p95 > 1s = BAD
  p99:                 4521 ms       <-- p99 > 2s = CRITICAL
  RPS sent: 499.95
  Data received: 1.1 MB
  Error rate: 0.34%               <-- Errors present
```

---

## Common MongoDB Bottleneck Indicators

### Look for These Patterns in Terminal

#### 1. **Connection Pool Exhaustion**
```
Error: Pool is exhausted - waiting for connection
```
**Cause:** MongoDB connection pool limit reached  
**Fix (temp):** Increase `maxPoolSize` in Mongoose connection, or implement queuing

#### 2. **Long Query Times**
```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```
**Cause:** MongoDB can't keep up, or network timeout  
**Fix:** Add `.index({ tenantId: 1 })` on WidgetConfig (already done)

#### 3. **Too Many Open Files**
```
Error: EMFILE: too many open files
```
**Cause:** OS file descriptor limit exceeded  
**Fix:** Run `ulimit -n 65535` (macOS/Linux) or increase Windows handle limit

#### 4. **Slow Query Logs**
Enable MongoDB slow query log to see which queries are taking > 100ms:
```javascript
// In your mongo shell:
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5).pretty()
```

#### 5. **Memory Pressure**
```
MongoMemoryError: Excessive memory usage in inMemSortStage
```
**Cause:** Large result sets or complex aggregations  
**Fix:** Add pagination, lean queries, or implement caching

---

## Expected Baseline Results (Pre-Cache)

Before adding Redis, expect:
- **p95 Latency:** 800ms - 2000ms (database lookups)
- **p99 Latency:** 1500ms - 5000ms (occasional timeouts)
- **Error Rate:** 0.1% - 0.5% (connection pool exhaustion)
- **Actual RPS:** 400-480 (not fully achieving 500 RPS target)

### After Adding Redis Cache
You should see:
- **p95 Latency:** 10ms - 50ms (cache hits)
- **p99 Latency:** 50ms - 150ms (occasional misses)
- **Error Rate:** < 0.01% (stable)
- **Actual RPS:** 500+ (achieving target)

---

## Monitoring MongoDB During Load Test

### Terminal 1: Run Backend
```powershell
cd Backend
npm start
```

### Terminal 2: Run Artillery
```powershell
cd Backend
artillery run artillery.yml
```

### Terminal 3: Monitor MongoDB Connections
```bash
# For local MongoDB
db.serverStatus().connections

# Or use MongoDB Compass to watch real-time metrics
# - Connection Pool: Connections Used / Max Pool Size
# - Query Performance: Operations/sec
```

### Terminal 4: Monitor System Resources
```bash
# Windows PowerShell
while($true) { 
  $proc = Get-Process node | Select-Object PM, Handles, Threads
  Clear-Host
  Write-Host "Node.js Memory & Handles:"
  $proc | Format-Table
  Start-Sleep -Seconds 2
}
```

---

## Troubleshooting

### Issue: "ECONNREFUSED" or Connection Timeouts
**Cause:** Backend not running or MongoDB unreachable  
**Fix:**
```powershell
# Verify backend is running
curl http://localhost:3000/api/v1/widget/507f1f77bcf86cd799439011

# Verify MongoDB
mongosh "mongodb://localhost:27017"
```

### Issue: "ENOTFOUND localhost"
**Cause:** Hostname resolution issue  
**Fix:** Change `target` in `artillery.yml` to `http://127.0.0.1:3000`

### Issue: CSV File Not Loading
**Cause:** Wrong file path or format issue  
**Fix:**
```powershell
# Verify CSV exists and has proper format
Get-Content tenants.csv -First 5
# Should output:
# tenantId
# 507f1f77bcf86cd799439011
# etc.
```

### Issue: All Requests Returning 404
**Cause:** Route not implemented or tenantId doesn't exist in DB  
**Fix:**
- Verify endpoint exists: `GET /api/v1/widget/:tenantId`
- Verify tenants.csv has IDs that actually exist in MongoDB
- Check for import/path errors in widget.controller.js

---

## Next Steps After Baseline

1. **Record baseline metrics** from this test
2. **Implement Redis caching** layer for WidgetConfig lookups
3. **Run same test again** with cache enabled
4. **Compare metrics** to quantify cache performance improvement (typically 10-50x latency reduction)
5. **Monitor production** with same Artillery profile periodically

---

## Useful Artillery Commands

```powershell
# Run with custom target
artillery run artillery.yml --target http://api.example.com

# Run with debugging enabled
artillery run artillery.yml --debug

# Generate multiple report formats
artillery report artillery-report.json --output report.html

# Quick syntax check (no execution)
artillery validate artillery.yml
```

---

**File Structure:**
```
Backend/
├── artillery.yml        ← Load test configuration
├── tenants.csv         ← Tenant IDs for test (populate with real data!)
├── package.json        ← Add: npm install -g artillery
├── scripts/
│   └── seed.js        ← Run first to populate database
└── src/
    ├── index.js
    ├── models/
    │   ├── tenant.model.js
    │   └── widget.model.js
    └── controllers/
        └── widget.controller.js
```

