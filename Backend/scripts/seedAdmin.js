import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import dotenv from 'dotenv';

dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      process.exit(0);
    }

    // Create employee record first
    const adminEmployee = new Employee({
      firstName: 'Qamar',
      lastName: 'Rana',
      email: 'hr.manager.nextelbpo@gmail.com',
      department: 'HR',
      position: 'HR Manager',
      employeeId: 'ADMIN001',
      status: 'Active',
      hireDate: new Date(),
      contact: {
        phone: '+1234567890',
        address: 'Nextel HQ'
      }
    });

    const savedEmployee = await adminEmployee.save();
    console.log('Admin employee record created');

    // Create user account
    const adminUser = new User({
      username: 'qamar.rana',
      email: 'hr.manager.nextelbpo@gmail.com',
      password: 'NextelHR2024!', // Will be hashed by pre-save middleware
      role: 'admin',
      employeeId: savedEmployee._id,
      isActive: true
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('👤 Name: Qamar Rana');
    console.log('📧 Email: hr.manager.nextelbpo@gmail.com');
    console.log('👤 Username: qamar.rana');
    console.log('🔑 Password: NextelHR2024!');
    console.log('💼 Position: HR Manager');
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seedAdmin();