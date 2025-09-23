import mongoose from 'mongoose';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import dotenv from 'dotenv';

dotenv.config();

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: 'moizzaidi71@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);

    // Get employee details
    if (user.employeeId) {
      const employee = await Employee.findById(user.employeeId);
      if (employee) {
        console.log(`   Employee Name: ${employee.firstName} ${employee.lastName}`);
        console.log(`   Current expected password: ${employee.firstName.toLowerCase()}${employee.lastName.toLowerCase()}123`);
      }
    }

    // Reset password to a simple one
    user.password = 'password123';
    await user.save();

    console.log('\n🔄 Password reset successful!');
    console.log('📧 Email: moizzaidi71@gmail.com');
    console.log('🔑 New Password: password123');
    console.log('\n💡 You can now login with these credentials');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔚 Database connection closed');
    process.exit(0);
  }
};

resetPassword();