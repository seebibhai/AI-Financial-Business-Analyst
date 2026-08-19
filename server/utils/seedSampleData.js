/**
 * Loads sample-data/sample-transactions.csv into a demo account.
 * Run with: npm run seed  (from the server/ directory)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/User');
const DataSource = require('../models/DataSource');
const Transaction = require('../models/Transaction');
const { parseCsv } = require('../services/ingestion/fileParser');
const { autoDetectMapping } = require('../services/ingestion/columnMapper');
const { validateRows } = require('../services/ingestion/dataValidator');
const { normalizeRows } = require('../services/ingestion/dataNormalizer');

const DEMO_EMAIL = 'demo@aifinancialanalyst.test';
const DEMO_PASSWORD = 'Demo12345!';

async function seed() {
  await connectDB();

  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = await User.create({
      name: 'Demo User',
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      companyName: 'Sample Trading Co.',
      currency: 'PKR',
    });
    console.log(`[seed] Created demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } else {
    console.log(`[seed] Using existing demo user: ${DEMO_EMAIL}`);
    await Transaction.deleteMany({ userId: user._id });
    await DataSource.deleteMany({ userId: user._id });
    console.log('[seed] Cleared previous demo transactions/data sources');
  }

  const csvPath = path.join(__dirname, '..', '..', 'sample-data', 'sample-transactions.csv');
  const buffer = fs.readFileSync(csvPath);
  const { headers, rows } = parseCsv(buffer);
  const { mapping } = autoDetectMapping(headers);

  const dataSource = await DataSource.create({
    userId: user._id,
    fileName: 'sample-transactions.csv',
    fileType: 'csv',
    fileSize: buffer.length,
    status: 'processing',
    recordCount: rows.length,
    detectedColumns: headers,
    columnMapping: mapping,
  });

  const validation = validateRows(rows, mapping, false);
  const docs = normalizeRows(validation.validRows, mapping, user._id, dataSource._id, user.currency);
  const inserted = await Transaction.insertMany(docs);

  dataSource.status = 'completed';
  dataSource.validRecordCount = validation.validCount;
  dataSource.invalidRecordCount = validation.invalidCount;
  dataSource.duplicateCount = validation.duplicateCount;
  await dataSource.save();

  console.log(`[seed] Inserted ${inserted.length} transactions for demo user`);
  console.log('[seed] Done. Log in with:');
  console.log(`        email:    ${DEMO_EMAIL}`);
  console.log(`        password: ${DEMO_PASSWORD}`);

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
