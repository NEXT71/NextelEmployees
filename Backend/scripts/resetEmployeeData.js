import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Fine from '../models/Fine.js';
import Salary from '../models/Salary.js';
import dotenv from 'dotenv';

dotenv.config();

const resetEmployeeData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const args = process.argv.slice(2);
    const isConfirmed = args.includes('--confirm');

    if (!isConfirmed) {
      console.log(`
⚠️  WARNING: This script will delete ALL employee data!

This will remove:
- All Employee records (except admin employee)
- All User accounts (except admin users)
- All Attendance records
- All Fine records  
- All Salary records

The admin user and employee will be preserved.

To proceed, run: npm run reset:employees -- --confirm
      `);
      process.exit(0);
    }

    console.log('🔄 Starting employee data reset...\n');

    // Find admin users to preserve them
    const adminUsers = await User.find({ role: 'admin' });
    const adminUserIds = adminUsers.map(user => user._id);
    const adminEmployeeIds = adminUsers.map(user => user.employeeId).filter(Boolean);

    console.log(`📋 Found ${adminUsers.length} admin users to preserve`);

    // Delete non-admin employee records
    const employeeDeleteResult = await Employee.deleteMany({ 
      _id: { $nin: adminEmployeeIds } 
    });
    console.log(`🗑️  Deleted ${employeeDeleteResult.deletedCount} employee records`);

    // Delete non-admin user accounts
    const userDeleteResult = await User.deleteMany({ 
      _id: { $nin: adminUserIds },
      role: { $ne: 'admin' }
    });
    console.log(`🗑️  Deleted ${userDeleteResult.deletedCount} user accounts`);

    // Delete all attendance records
    const attendanceDeleteResult = await Attendance.deleteMany({});
    console.log(`🗑️  Deleted ${attendanceDeleteResult.deletedCount} attendance records`);

    // Delete all fine records
    const fineDeleteResult = await Fine.deleteMany({});
    console.log(`🗑️  Deleted ${fineDeleteResult.deletedCount} fine records`);

    // Delete all salary records
    const salaryDeleteResult = await Salary.deleteMany({});
    console.log(`🗑️  Deleted ${salaryDeleteResult.deletedCount} salary records`);

    // Fix indexes
    console.log('\n🔧 Fixing database indexes...');
    const collection = mongoose.connection.db.collection('employees');
    
    try {
      await collection.dropIndex('user_1');
      console.log('   ✅ Dropped old user index');
    } catch (error) {
      if (error.codeName !== 'IndexNotFound') {
        console.log('   ⚠️  Error dropping index:', error.message);
      }
    }

    await collection.createIndex({ user: 1 }, { unique: true, sparse: true });
    console.log('   ✅ Created new sparse unique index for user field');

    // Verify remaining data
    const remainingEmployees = await Employee.countDocuments();
    const remainingUsers = await User.countDocuments();
    
    console.log('\n📊 Reset Summary:');
    console.log(`   • Remaining employees: ${remainingEmployees} (should be ${adminEmployeeIds.length} admin employee(s))`);
    console.log(`   • Remaining users: ${remainingUsers} (should be ${adminUsers.length} admin user(s))`);
    console.log(`   • All attendance, fines, and salary records: Deleted`);

    console.log('\n🎉 Employee data reset completed successfully!');
    console.log('💡 You can now register new employees without the duplicate key error.');

  } catch (error) {
    console.error('❌ Error resetting employee data:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

resetEmployeeData();