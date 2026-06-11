import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SalesTarget from '../models/SalesTarget.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

const deleteAllSalesSubmissions = async () => {
  try {
    if (!mongoUri) {
      console.error('❌ Missing MongoDB connection string. Set MONGO_URI or MONGODB_URI.');
      process.exit(1);
    }

    const args = process.argv.slice(2);
    const isConfirmed = args.includes('--confirm');

    if (!isConfirmed) {
      console.log(`
⚠️  WARNING: This script will delete ALL sales submission records.

This removes every document from the SalesTarget collection.

To proceed, run:
  node Backend/scripts/deleteAllSalesSubmissions.js --confirm
      `);
      process.exit(0);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const beforeCount = await SalesTarget.countDocuments();
    console.log(`🔍 Found ${beforeCount} sales submission records`);

    const deleteResult = await SalesTarget.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} sales submission records`);

    const afterCount = await SalesTarget.countDocuments();
    console.log(`📊 Remaining sales submission records: ${afterCount}`);
    console.log('🎉 Sales submission purge completed successfully');
  } catch (error) {
    console.error('❌ Error deleting sales submissions:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit(process.exitCode || 0);
  }
};

deleteAllSalesSubmissions();