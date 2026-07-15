#!/usr/bin/env pwsh
# Load Test Quick Start - Execute this to run the full baseline test

Write-Host "🚀 Artillery Load Test - Quick Start Guide" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Artillery
Write-Host "📦 Step 1: Installing Artillery..." -ForegroundColor Yellow
npm install -g artillery
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Artillery" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Artillery installed" -ForegroundColor Green
Write-Host ""

# Step 2: Install project dependencies
Write-Host "📦 Step 2: Installing project dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 3: Check if database is seeded
Write-Host "🗄️  Step 3: Checking MongoDB connection..." -ForegroundColor Yellow
Write-Host "Make sure MongoDB is running and MONGO_URI is set in .env" -ForegroundColor Cyan
Write-Host ""

# Step 4: Seed database
Write-Host "🌱 Step 4: Seeding database with 50,000 tenants..." -ForegroundColor Yellow
npm run seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Seed may have failed. Check MongoDB connection." -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Extract tenant IDs for load test
Write-Host "📥 Step 5: Extracting tenant IDs for load test..." -ForegroundColor Yellow
npm run extract-tenants
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to extract tenant IDs" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Tenant IDs extracted to tenants.csv" -ForegroundColor Green
Write-Host ""

# Step 6: Start backend server
Write-Host "🚀 Step 6: Starting backend server in background..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit -Command npm start" -WorkingDirectory (Get-Location)
Start-Sleep -Seconds 3
Write-Host "✅ Backend server started" -ForegroundColor Green
Write-Host ""

# Step 7: Run artillery load test
Write-Host "⚡ Step 7: Running Artillery load test (60 seconds)..." -ForegroundColor Magenta
Write-Host "Target: http://localhost:3000/api/v1/widget/{{ tenantId }}" -ForegroundColor Cyan
Write-Host "Load Profile: Ramp to 500 RPS over 10s, sustain for 40s, cool-down 10s" -ForegroundColor Cyan
Write-Host ""

artillery run artillery.yml

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Load test completed!" -ForegroundColor Green
    Write-Host ""
    
    # Step 8: Generate HTML report
    Write-Host "📊 Step 8: Generating HTML report..." -ForegroundColor Yellow
    artillery report artillery-report.json --output artillery-report.html
    Write-Host "✅ Report generated: artillery-report.html" -ForegroundColor Green
    Write-Host ""
    Write-Host "📈 Open artillery-report.html in browser to view results" -ForegroundColor Cyan
} else {
    Write-Host "❌ Load test failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Key Metrics to Review:" -ForegroundColor Cyan
Write-Host "  • p95 Latency: Should be < 1000ms (without cache)" -ForegroundColor Gray
Write-Host "  • p99 Latency: Should be < 2000ms (without cache)" -ForegroundColor Gray
Write-Host "  • Error Rate: Should be < 1%" -ForegroundColor Gray
Write-Host "  • RPS Achieved: Should be close to 500" -ForegroundColor Gray
Write-Host ""
Write-Host "Read LOAD_TEST_GUIDE.md for detailed metrics analysis" -ForegroundColor Cyan
