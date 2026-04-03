import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 50, // Increased from 10 to handle concurrent operations (30-40 agents)
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      maxIdleTimeMS: 60000, // Increased from 30000 - close connections after 60 seconds of inactivity
    });
    console.log('MongoDB connected with optimizations (maxPoolSize: 50)');
    
    // Cleanup bad unique indexes that might exist from previous deployments
    const cleanupIndexes = async () => {
      try {
        const SalesTarget = (await import('../models/SalesTarget.js')).default;
        const indexes = await SalesTarget.collection.getIndexes();
        
        console.log('📋 Current indexes:', Object.keys(indexes));
        
        // Drop all unique indexes on single fields (except _id)
        for (const [indexName, indexSpec] of Object.entries(indexes)) {
          if (indexSpec.unique && Object.keys(indexSpec.key).length === 1) {
            const field = Object.keys(indexSpec.key)[0];
            // Keep only: _id
            if (field !== '_id') {
              console.log(`🗑️  Dropping unique index on '${field}'...`);
              await SalesTarget.collection.dropIndex(indexName);
            }
          }
        }
        
        console.log('✅ Index cleanup complete - allowing duplicate DIDs and employee submissions');
      } catch (err) {
        console.warn('⚠️  Index cleanup warning:', err.message);
        // Don't fail connection if cleanup fails
      }
    };
    
    await cleanupIndexes();
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

export default connectDB;