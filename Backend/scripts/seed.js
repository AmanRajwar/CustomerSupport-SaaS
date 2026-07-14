import dotenv from "dotenv";
dotenv.config();
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';

import Tenant from '../src/models/tenant.model.js';
import WidgetConfig from '../src/models/widget.model.js';

const TOTAL_RECORDS = 50_000;
const BATCH_SIZE = 2_000;
const SUBSCRIPTION_TIERS = ['basic', 'pro', 'enterprise'];

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set in the environment. Aborting seed.');
  process.exit(1);
}

const formatDuration = (ms) => `${(ms / 1000).toFixed(2)}s`;

const buildTenant = () => ({
  name: faker.person.fullName(),
  // Suffix guarantees uniqueness in case a future unique index is added on email.
  email: `${faker.string.alphanumeric(8).toLowerCase()}.${faker.internet.email().toLowerCase()}`,
  subscriptionTier: faker.helpers.arrayElement(SUBSCRIPTION_TIERS),
});

const buildWidgetConfig = (tenantId) => ({
  tenantId,
  primaryColor: faker.color.rgb({ format: 'hex' }),
  welcomeMessage: faker.company.catchPhrase(),
  botAvatarUrl: faker.image.avatar(),
});

async function seed() {
  const overallStart = Date.now();

  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected. Starting seed...');

  console.log('Clearing existing Tenants and WidgetConfigs...');
  await Promise.all([Tenant.deleteMany({}), WidgetConfig.deleteMany({})]);

  const totalBatches = Math.ceil(TOTAL_RECORDS / BATCH_SIZE);
  let insertedTenants = 0;
  let insertedWidgets = 0;

  for (let batch = 1; batch <= totalBatches; batch++) {
    const batchStart = Date.now();
    const currentBatchSize = Math.min(
      BATCH_SIZE,
      TOTAL_RECORDS - insertedTenants
    );

    // Build tenants for this batch only. Keeping the working set bounded to
    // BATCH_SIZE (not 50k) is what prevents the Node.js heap from ballooning.
    let tenantDocs = Array.from({ length: currentBatchSize }, buildTenant);

    // `ordered: false` lets MongoDB continue past any single-doc error and
    // parallelize writes; `lean: true` skips returning full hydrated Mongoose
    // documents, which saves substantial memory across 50k inserts.
    const insertedTenantDocs = await Tenant.insertMany(tenantDocs, {
      ordered: false,
      lean: true,
    });

    // Release the tenant payloads immediately — we only need the ids from here.
    tenantDocs.length = 0;
    tenantDocs = null;

    let widgetDocs = insertedTenantDocs.map((t) => buildWidgetConfig(t._id));

    await WidgetConfig.insertMany(widgetDocs, {
      ordered: false,
      lean: true,
    });

    insertedTenants += insertedTenantDocs.length;
    insertedWidgets += widgetDocs.length;

    // Explicitly drop references so the batch's memory is GC-eligible before
    // the next iteration allocates its own arrays.
    widgetDocs.length = 0;
    widgetDocs = null;
    insertedTenantDocs.length = 0;

    console.log(
      `Batch ${batch}/${totalBatches} done in ${formatDuration(
        Date.now() - batchStart
      )} | Tenants: ${insertedTenants}/${TOTAL_RECORDS} | Widgets: ${insertedWidgets}/${TOTAL_RECORDS}`
    );
  }

  console.log(
    `Seed complete. Inserted ${insertedTenants} tenants and ${insertedWidgets} widget configs in ${formatDuration(
      Date.now() - overallStart
    )}.`
  );
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  });
