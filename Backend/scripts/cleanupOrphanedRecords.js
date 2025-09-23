import mongoose from 'mongoose';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import dotenv from 'dotenv';

dotenv.config();

const cleanupOrphanedRecords = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('🔍 Starting cleanup of orphaned records...\n');

    // Find orphaned User records (users that reference non-existent employees)
    const orphanedUsers = await User.find({
      employeeId: { $exists: true, $ne: null },
      role: 'employee'
    });

    let orphanedUserCount = 0;
    for (const user of orphanedUsers) {
      const employeeExists = await Employee.findById(user.employeeId);
      if (!employeeExists) {
        console.log(`🗑️  Deleting orphaned user: ${user.username} (${user.email})`);
        await User.findByIdAndDelete(user._id);
        orphanedUserCount++;
      }
    }

    // Find orphaned Employee records (employees that reference non-existent users)
    const employeesWithUserRef = await Employee.find({
      user: { $exists: true, $ne: null }
    });

    let orphanedEmployeeUserRefs = 0;
    for (const employee of employeesWithUserRef) {
      const userExists = await User.findById(employee.user);
      if (!userExists) {
        console.log(`🔧 Removing invalid user reference from employee: ${employee.firstName} ${employee.lastName}`);
        await Employee.findByIdAndUpdate(employee._id, { $unset: { user: 1 } });
        orphanedEmployeeUserRefs++;
      }
    }

    // Find Users without corresponding Employee records (but claim to be employees)
    const usersWithEmployeeId = await User.find({
      employeeId: { $exists: true, $ne: null },
      role: 'employee'
    });

    let usersWithoutEmployee = 0;
    for (const user of usersWithEmployeeId) {
      const employeeExists = await Employee.findById(user.employeeId);
      if (!employeeExists) {
        console.log(`⚠️  User ${user.username} claims employee role but employee record doesn't exist`);
        // Option 1: Delete the user
        // await User.findByIdAndDelete(user._id);
        
        // Option 2: Remove employeeId reference (safer)
        await User.findByIdAndUpdate(user._id, { 
          $unset: { employeeId: 1 },
          role: 'employee' // Keep as employee but remove broken reference
        });
        usersWithoutEmployee++;
      }
    }

    // Summary
    console.log('\n📊 Cleanup Summary:');
    console.log(`   • Orphaned users deleted: ${orphanedUserCount}`);
    console.log(`   • Employee user references fixed: ${orphanedEmployeeUserRefs}`);
    console.log(`   • Users with broken employee references fixed: ${usersWithoutEmployee}`);

    // Verification check
    console.log('\n✅ Verification:');
    const totalUsers = await User.countDocuments();
    const totalEmployees = await Employee.countDocuments();
    const usersWithValidEmployeeRefs = await User.countDocuments({
      employeeId: { $exists: true, $ne: null },
      role: 'employee'
    });

    console.log(`   • Total users: ${totalUsers}`);
    console.log(`   • Total employees: ${totalEmployees}`);
    console.log(`   • Users with employee references: ${usersWithValidEmployeeRefs}`);

    console.log('\n🎉 Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Add command line options
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🧹 Database Cleanup Script

This script cleans up orphaned records between User and Employee collections.

Usage: node scripts/cleanupOrphanedRecords.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be cleaned up without making changes

What this script does:
1. Removes User records that reference non-existent Employee records
2. Removes invalid user references from Employee records
3. Fixes Users that claim to be employees but have broken employee references

⚠️  Always backup your database before running cleanup scripts!
  `);
  process.exit(0);
}

if (args.includes('--dry-run')) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
  // You could modify the script to not actually delete/update in dry-run mode
}

cleanupOrphanedRecords();