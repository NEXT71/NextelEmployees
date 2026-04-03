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
        const db = mongoose.connection.db;
        
        // Get the actual collection name from the model
        const collectionName = SalesTarget.collection.name;
        console.log(`📋 Cleaning up indexes on collection: ${collectionName}`);
        
        const indexInfo = await db.collection(collectionName).getIndexes();
        console.log('📋 Current indexes:', Object.keys(indexInfo));
        
        // Drop ALL indexes except _id
        let droppedCount = 0;
        for (const [indexName, indexSpec] of Object.entries(indexInfo)) {
          if (indexName !== '_id_') {
            console.log(`🗑️  Dropping index: ${indexName}`, JSON.stringify(indexSpec));
            try {
              await db.collection(collectionName).dropIndex(indexName);
              droppedCount++;
            } catch (err) {
              console.warn(`⚠️  Could not drop index ${indexName}:`, err.message);
            }
          }
        }
        
        console.log(`✅ Dropped ${droppedCount} indexes. Now accepting duplicate agents and DIDs.`);
        
        // List remaining indexes
        const newIndexes = await db.collection(collectionName).getIndexes();
        console.log('📋 Remaining indexes:', Object.keys(newIndexes));
      } catch (err) {
        console.warn('⚠️  Index cleanup warning:', err.message);
        // Don't fail connection if cleanup fails
      }
    };
    
    // Run cleanup after short delay to ensure connection is ready
    setTimeout(cleanupIndexes, 1000);
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

export default connectDB;