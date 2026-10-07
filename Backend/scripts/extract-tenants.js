/**
 * Extract Tenant IDs from MongoDB and populate tenants.csv
 * Run this AFTER seeding the database with: npm run seed
 * 
 * Usage: node scripts/extract-tenants.js
 */

import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Tenant from '../src/models/tenant.model.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set. Aborting.');
  process.exit(1);
}

const TENANT_CSV_PATH = path.join(process.cwd(), 'tenants.csv');
const LIMIT = 25000; // Extract 25000 IDs for load testing

async function extractTenantIds() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    
    console.log(`📊 Fetching ${LIMIT} tenant IDs...`);
    const tenants = await Tenant.find({})
      .select('_id')
      .limit(LIMIT)
      .lean();
    
    if (tenants.length === 0) {
      console.error('❌ No tenants found! Run `npm run seed` first.');
      process.exit(1);
    }
    
    console.log(`✅ Found ${tenants.length} tenants`);
    
    // Build CSV content
    const csvContent = 'tenantId\n' + 
      tenants.map(t => t._id.toString()).join('\n');
    
    // Write to file
    fs.writeFileSync(TENANT_CSV_PATH, csvContent, 'utf-8');
    
    console.log(`✅ Saved to: ${TENANT_CSV_PATH}`);
    console.log(`📋 CSV Preview (first 5 rows):`);
    console.log(csvContent.split('\n').slice(0, 6).join('\n'));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

extractTenantIds();
