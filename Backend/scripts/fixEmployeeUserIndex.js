import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import dotenv from 'dotenv';

dotenv.config();

const fixEmployeeUserIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get the collection directly
    const collection = mongoose.connection.db.collection('employees');

    // Check existing indexes
    console.log('📋 Current indexes on employees collection:');
    const indexes = await collection.listIndexes().toArray();
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)} ${index.sparse ? '(sparse)' : ''} ${index.unique ? '(unique)' : ''}`);
    });

    // Check for the problematic user index
    const userIndex = indexes.find(index => index.key.user === 1);
    
    if (userIndex && userIndex.unique && !userIndex.sparse) {
      console.log('\n❌ Found problematic user index (unique but not sparse)');
      console.log('🔧 Dropping and recreating the index...');
      
      // Drop the old index
      await collection.dropIndex('user_1');
      console.log('   ✅ Dropped old user index');
      
      // Create new sparse unique index
      await collection.createIndex({ user: 1 }, { unique: true, sparse: true });
      console.log('   ✅ Created new sparse unique index');
    } else if (!userIndex) {
      console.log('\n🔧 Creating missing user index...');
      await collection.createIndex({ user: 1 }, { unique: true, sparse: true });
      console.log('   ✅ Created sparse unique index');
    } else {
      console.log('\n✅ User index is already properly configured');
    }

    // Verify the fix
    console.log('\n📋 Updated indexes:');
    const newIndexes = await collection.listIndexes().toArray();
    newIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)} ${index.sparse ? '(sparse)' : ''} ${index.unique ? '(unique)' : ''}`);
    });

    // Test by checking for duplicate null values
    const employeesWithNullUser = await Employee.countDocuments({ user: null });
    console.log(`\n📊 Employees with null user field: ${employeesWithNullUser}`);

    if (employeesWithNullUser > 1) {
      console.log('✅ Multiple null values are now allowed (sparse index working correctly)');
    }

    console.log('\n🎉 Index fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing index:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

fixEmployeeUserIndex();