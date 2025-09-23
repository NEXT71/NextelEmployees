import mongoose from 'mongoose';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import dotenv from 'dotenv';

dotenv.config();

const checkDatabaseRelationships = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Get counts
    const totalUsers = await User.countDocuments();
    const totalEmployees = await Employee.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const employeeUsers = await User.countDocuments({ role: 'employee' });

    console.log('📊 Database Overview:');
    console.log(`   • Total Users: ${totalUsers}`);
    console.log(`   • Total Employees: ${totalEmployees}`);
    console.log(`   • Admin Users: ${adminUsers}`);
    console.log(`   • Employee Users: ${employeeUsers}\n`);

    // Check for orphaned User records
    console.log('🔍 Checking for orphaned User records...');
    const usersWithEmployeeId = await User.find({
      employeeId: { $exists: true, $ne: null },
      role: 'employee'
    }).select('username email employeeId');

    let orphanedUserCount = 0;
    for (const user of usersWithEmployeeId) {
      const employeeExists = await Employee.findById(user.employeeId);
      if (!employeeExists) {
        console.log(`   ⚠️  Orphaned user: ${user.username} (${user.email}) -> Employee ID: ${user.employeeId}`);
        orphanedUserCount++;
      }
    }
    console.log(`   Found ${orphanedUserCount} orphaned user records\n`);

    // Check for orphaned Employee user references
    console.log('🔍 Checking Employee user references...');
    const employeesWithUserRef = await Employee.find({
      user: { $exists: true, $ne: null }
    }).select('firstName lastName email user');

    let invalidUserRefCount = 0;
    for (const employee of employeesWithUserRef) {
      const userExists = await User.findById(employee.user);
      if (!userExists) {
        console.log(`   ⚠️  Employee with invalid user ref: ${employee.firstName} ${employee.lastName} -> User ID: ${employee.user}`);
        invalidUserRefCount++;
      }
    }
    console.log(`   Found ${invalidUserRefCount} employees with invalid user references\n`);

    // Check for consistency
    console.log('🔍 Checking relationship consistency...');
    const employeesWithUsers = await Employee.find({
      user: { $exists: true, $ne: null }
    }).populate('user');

    let inconsistentCount = 0;
    for (const employee of employeesWithUsers) {
      if (employee.user && employee.user.employeeId) {
        if (employee.user.employeeId.toString() !== employee._id.toString()) {
          console.log(`   ⚠️  Inconsistent relationship: Employee ${employee.firstName} ${employee.lastName} and User ${employee.user.username}`);
          inconsistentCount++;
        }
      }
    }
    console.log(`   Found ${inconsistentCount} inconsistent relationships\n`);

    // List all employees and their user status
    console.log('📋 Employee-User Relationship Status:');
    const allEmployees = await Employee.find().populate('user').select('firstName lastName email user employeeId');
    
    for (const employee of allEmployees) {
      const hasUser = employee.user ? '✅' : '❌';
      const userInfo = employee.user ? `${employee.user.username}` : 'No user account';
      console.log(`   ${hasUser} ${employee.firstName} ${employee.lastName} (${employee.employeeId}) -> ${userInfo}`);
    }

    console.log('\n📋 User-Employee Relationship Status:');
    const allEmployeeUsers = await User.find({ role: 'employee' }).populate('employeeId').select('username email employeeId');
    
    for (const user of allEmployeeUsers) {
      const hasEmployee = user.employeeId ? '✅' : '❌';
      const employeeInfo = user.employeeId ? `${user.employeeId.firstName} ${user.employeeId.lastName}` : 'No employee record';
      console.log(`   ${hasEmployee} ${user.username} (${user.email}) -> ${employeeInfo}`);
    }

    // Summary
    console.log('\n📊 Relationship Health Summary:');
    console.log(`   • Orphaned users: ${orphanedUserCount}`);
    console.log(`   • Invalid employee user references: ${invalidUserRefCount}`);
    console.log(`   • Inconsistent relationships: ${inconsistentCount}`);
    
    const totalIssues = orphanedUserCount + invalidUserRefCount + inconsistentCount;
    if (totalIssues === 0) {
      console.log('   🎉 All relationships are healthy!');
    } else {
      console.log(`   ⚠️  Found ${totalIssues} relationship issues`);
      console.log('\n💡 Run the cleanup script to fix these issues:');
      console.log('   node scripts/cleanupOrphanedRecords.js');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

checkDatabaseRelationships();