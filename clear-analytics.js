// clear-analytics.js
// Run this ONCE to delete all stored analytics records so the next sync writes fresh real data.
// Usage: node clear-analytics.js
require('dotenv').config();
const { mongoose } = require('./db');

async function main() {
  await new Promise(r => setTimeout(r, 2000)); // wait for DB connection
  const Analytics = require('./models/Analytics');
  const count = await Analytics.countDocuments({});
  console.log(`Found ${count} analytics record(s). Deleting all...`);
  const result = await Analytics.deleteMany({});
  console.log(`Deleted ${result.deletedCount} analytics records. Done!`);
  console.log('Now restart the backend and click "Sync Now" on the dashboard to pull fresh data.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
