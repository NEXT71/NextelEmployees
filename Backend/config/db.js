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
        
        // Check for bad unique indexes on single fields
        for (const [indexName, indexSpec] of Object.entries(indexes)) {
          if (indexSpec.unique && Object.keys(indexSpec.key).length === 1) {
            const field = Object.keys(indexSpec.key)[0];
            // Don't drop _id index
            if (field !== '_id') {
              console.log(`🗑️  Dropping bad unique index on ${field}...`);
              await SalesTarget.collection.dropIndex(indexName);
            }
          }
        }
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