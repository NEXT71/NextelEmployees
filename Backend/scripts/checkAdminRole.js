import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const checkAndFixAdminRole = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nextel-employees');
    console.log('✅ Connected to MongoDB');

    // Get admin email from command line or use default
    const adminEmail = process.argv[2] || 'admin@nextel.com';
    
    console.log(`\n🔍 Checking user: ${adminEmail}`);
    console.log('=' .repeat(50));

    // Find the user
    const user = await User.findOne({ 
      $or: [
        { email: adminEmail },
        { username: adminEmail }
      ]
    });

    if (!user) {
      console.log(`❌ User not found with email/username: ${adminEmail}`);
      console.log('\n💡 Tip: Run "npm run seed:admin" to create a new admin user');
      process.exit(1);
    }

    console.log(`\n✅ User found:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Current Role: ${user.role}`);
    console.log(`   Is Active: ${user.isActive}`);
    console.log(`   Is Logged In: ${user.isLoggedIn}`);

    if (user.role === 'admin') {
      console.log(`\n✅ User already has admin role!`);
      console.log(`\n🎉 You can login with:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
    } else {
      console.log(`\n⚠️  User role is "${user.role}" but should be "admin"`);
      console.log(`\n🔧 Fixing role to "admin"...`);
      
      user.role = 'admin';
      user.isActive = true;
      await user.save();
      
      console.log(`✅ Role updated successfully!`);
      console.log(`\n🎉 You can now login with:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

console.log('🔍 Admin Role Checker & Fixer');
console.log('=' .repeat(50));
checkAndFixAdminRole();
