import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Employee from '../models/Employee.js';
import User from '../models/User.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const email = 'hr@nextelbpo.co';
const username = 'hr.nextel';
const employeeId = 'HR001';

const seedHr = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
    await mongoose.connect(process.env.MONGO_URI);

    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user && (user.email !== email || user.username !== username)) {
      throw new Error('The HR username or email is already assigned to another account');
    }

    let employee = await Employee.findOne({ $or: [{ email }, { employeeId }] });
    if (employee && (employee.email !== email || employee.employeeId !== employeeId)) {
      throw new Error('HR001 or the HR email is already assigned to another employee');
    }

    if (!user && !process.env.HR_PASSWORD) {
      throw new Error('Set HR_PASSWORD before creating the HR account');
    }

    if (employee?.user && user && String(employee.user) !== String(user._id)) {
      throw new Error('The HR employee record is linked to a different user');
    }

    if (!employee) {
      employee = await Employee.create({
        employeeId,
        firstName: 'HR',
        lastName: 'Nextel',
        email,
        department: 'HR',
        status: 'Active',
        ...(user ? { user: user._id } : {})
      });
    }

    if (!user) {
      user = await User.create({
        username,
        email,
        password: process.env.HR_PASSWORD,
        role: 'hr',
        employeeId: employee._id,
        isActive: true
      });
    } else {
      user.role = 'hr';
      user.isActive = true;
      user.employeeId = employee._id;
      await user.save();
    }

    if (String(employee.user || '') !== String(user._id)) {
      employee.user = user._id;
      await employee.save();
    }

    console.log(`HR account ready: ${username} (${email})`);
  } catch (error) {
    console.error('Error seeding HR account:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seedHr();