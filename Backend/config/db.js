import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 50, // Increased from 10 to handle concurrent operations (30-40 agents)
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      maxIdleTimeMS: 60000, // Increased from 30000 - close connections after 60 seconds of inactivity
      // Remove deprecated options that are no longer supported:
      // useNewUrlParser: true (default in Mongoose 6+)
      // useUnifiedTopology: true (default in Mongoose 6+)
      // bufferMaxEntries: 0 (deprecated, use bufferCommands instead)
      // bufferCommands: false (can cause issues, better to leave default)
    });
    console.log('MongoDB connected with optimizations (maxPoolSize: 50)');
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

export default connectDB;