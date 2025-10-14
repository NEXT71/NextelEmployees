import mongoose from 'mongoose';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import dotenv from 'dotenv';

dotenv.config();

const createTestAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Delete existing admin if exists
    await User.deleteOne({ email: 'admin@test.com' });
    await Employee.deleteOne({ email: 'admin@test.com' });

    // Create simple employee record
    const adminEmployee = new Employee({
      firstName: 'Test',
      lastName: 'Admin',
      email: 'admin@test.com',
      department: 'IT',
      employeeId: 'TESTADMIN',
      status: 'Active',
      hireDate: new Date()
    });

    const savedEmployee = await adminEmployee.save();

    // Create simple admin user
    const adminUser = new User({
      username: 'testadmin',
      email: 'admin@test.com',
      password: 'admin123', // Simple password
      role: 'admin',
      employeeId: savedEmployee._id,
      isActive: true,
      verified: true
    });

    await adminUser.save();
    
    console.log('✅ Test admin created!');
    console.log('📧 Email: admin@test.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Username: testadmin');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createTestAdmin();