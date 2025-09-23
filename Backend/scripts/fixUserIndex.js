import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixUserIndex = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Get the employees collection
    const db = mongoose.connection.db;
    const employeesCollection = db.collection('employees');
    
    // Check existing indexes
    console.log('Checking existing indexes...');
    const indexes = await employeesCollection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key, sparse: idx.sparse })));
    
    // Drop the problematic user_1 index if it exists
    try {
      await employeesCollection.dropIndex('user_1');
      console.log('✅ Successfully dropped user_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('⚠️  user_1 index does not exist - this is fine');
      } else {
        console.log('❌ Error dropping index:', error.message);
      }
    }
    
    // Create a new sparse unique index for the user field
    try {
      await employeesCollection.createIndex(
        { user: 1 }, 
        { unique: true, sparse: true, name: 'user_1_sparse' }
      );
      console.log('✅ Successfully created sparse unique index for user field');
    } catch (error) {
      console.log('❌ Error creating index:', error.message);
    }
    
    // Verify the new indexes
    console.log('\nChecking indexes after changes...');
    const newIndexes = await employeesCollection.indexes();
    console.log('Updated indexes:', newIndexes.map(idx => ({ name: idx.name, key: idx.key, sparse: idx.sparse })));
    
    console.log('\n🎉 Index fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing index:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the fix
fixUserIndex();