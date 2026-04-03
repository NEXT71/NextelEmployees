import mongoose from 'mongoose';
import SalesTarget from '../models/SalesTarget.js';

/**
 * Fix script to drop bad unique indexes on SalesTarget model
 * Run: node scripts/fixSalesIndexes.js
 */

const fixIndexes = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/nextel-employees';
    console.log('🔧 MongoDB URI:', mongoUri.substring(0, 50) + '...');
    await mongoose.connect(mongoUri);
    
    console.log('📋 Current indexes:');
    const indexes = await SalesTarget.collection.getIndexes();
    console.log(JSON.stringify(indexes, null, 2));
    
    console.log('\n🗑️  Dropping all indexes...');
    await SalesTarget.collection.dropIndexes();
    console.log('✅ Indexes dropped');
    
    console.log('\n🔨 Recreating proper indexes...');
    await SalesTarget.collection.createIndex({ agent: 1, saleDate: 1 });
    await SalesTarget.collection.createIndex({ agent: 1, status: 1 });
    await SalesTarget.collection.createIndex({ status: 1, createdAt: -1 });
    await SalesTarget.collection.createIndex({ saleDate: 1 });
    await SalesTarget.collection.createIndex({ agent: 1, createdAt: -1 });
    await SalesTarget.collection.createIndex({ 'customer.phone': 1 });
    await SalesTarget.collection.createIndex({ 'customer.state': 1 });
    await SalesTarget.collection.createIndex({ closer: 1 });
    await SalesTarget.collection.createIndex({ createdAt: -1 });
    
    console.log('✅ Indexes recreated');
    
    console.log('\n📋 New indexes:');
    const newIndexes = await SalesTarget.collection.getIndexes();
    console.log(JSON.stringify(newIndexes, null, 2));
    
    console.log('\n✨ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixIndexes();
