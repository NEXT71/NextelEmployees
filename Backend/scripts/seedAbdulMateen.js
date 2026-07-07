import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const EMAIL_DOMAIN = 'nextelbpo.co';
const NAME = 'Abdul Mateen';
const ROLE = 'CSR';

const normalizeSpaces = (value = '') => String(value).trim().replace(/\s+/g, ' ');
const splitName = (value = '') => {
  const parts = normalizeSpaces(value).split(' ').filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const slugify = (value = '') => normalizeSpaces(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '.')
  .replace(/^\.+|\.+$/g, '')
  .replace(/\.+/g, '.');

const createAccount = async () => {
  const { firstName, lastName } = splitName(NAME);
  const username = [slugify(firstName), slugify(lastName)].filter(Boolean).join('.') || 'abdul.mateen';
  const email = `${username}@${EMAIL_DOMAIN}`;
  const password = 'Pakistan@786';

  await User.deleteOne({ $or: [{ email }, { username }] });
  await Employee.deleteOne({ $or: [{ email }, { employeeId: 'EMP9999' }] });

  const employee = await Employee.create({
    employeeId: 'EMP9999',
    firstName,
    lastName,
    email,
    department: 'Sales',
    isCloser: false,
    hireDate: new Date(),
    status: 'Active',
    contact: {},
    registeredBy: null
  });

  const user = await User.create({
    username,
    email,
    password,
    role: 'employee',
    employeeId: employee._id,
    isActive: true,
    verified: true
  });

  await Employee.findByIdAndUpdate(employee._id, { user: user._id });

  console.log('✅ Seeded CSR account for Abdul Mateen');
  console.log(`Username: ${username}`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    await createAccount();
  } catch (error) {
    console.error('Error seeding Abdul Mateen:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();
