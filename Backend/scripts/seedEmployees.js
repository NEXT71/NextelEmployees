import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

dotenv.config();

const EMAIL_DOMAIN = 'nextelbpo.co';

const STAFF = [
  { name: 'ADIL MAJEED', role: 'CSR' },
  { name: 'Abdul Moeed', role: 'CSR' },
  { name: 'AMAAN NADEEM', role: 'CSR' },
  { name: 'ADIL MEHMOOD', role: 'CSR' },
  { name: 'MAAZ KHAN', role: 'CSR' },
  { name: 'M AWAIS', role: 'CSR' },
  { name: 'M ADIL', role: 'CSR' },
  { name: 'MUNEEB', role: 'CSR' },
  { name: 'MALIK SAJID', role: 'CSR' },
  { name: 'M SHAYAN', role: 'CSR' },
  { name: 'M SHAHZAIB', role: 'CSR' },
  { name: 'NOUMAN', role: 'CSR' },
  { name: 'Raja Arslan', role: 'CSR' },
  { name: 'SHANZEB', role: 'CSR' },
  { name: 'SIRAJ', role: 'CSR' },
  { name: 'SHEHRYAR', role: 'CSR' },
  { name: 'TALHA', role: 'CSR' },
  { name: 'TALHA SHAH', role: 'CSR' },
  { name: 'TANZEEL', role: 'CSR' },
  { name: 'UMAIR MUMTAZ', role: 'CSR' },
  { name: 'WASIF SHAH', role: 'CSR' },
  { name: 'SHAFIA', role: 'CSR' },
  { name: 'ZOYA', role: 'CSR' },
  { name: 'RANIA', role: 'CSR' },
  { name: 'UMER TL', role: 'CLOSER/TL' },
  { name: 'MALIK HASSAN', role: 'Q/A MANAGER' },
  { name: 'Mubeen', role: 'CLOSER' },
  { name: 'EHTISHAM', role: 'CLOSER' },
  { name: 'RAJA SAAD', role: 'Q/A MANAGER' },
  { name: 'MALIK USAMA', role: 'Q/A MANAGER' },
  { name: 'RAJA AHMED', role: 'Q/A MANAGER' },
  { name: 'YASIR AHMED', role: 'Q/A MANAGER' }
];

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

const normalizeRole = (value = '') => {
  const normalized = normalizeSpaces(value).toLowerCase().replace(/\\/g, '/');
  if (normalized.includes('qa') || normalized.includes('q/a') || normalized.includes('q a')) return 'qa';
  if (normalized.includes('verifier')) return 'closer';
  if (normalized.includes('closer') || normalized.includes('tl')) return 'closer';
  return 'csr';
};

const getRoleConfig = (roleLabel) => {
  const role = normalizeRole(roleLabel);

  if (role === 'qa') {
    return {
      userRole: 'qa',
      department: 'Quality Assurance',
      isCloser: false,
      password: (firstName) => `${firstName.charAt(0).toUpperCase()}${firstName.slice(1).toLowerCase()}@786`
    };
  }

  if (role === 'closer') {
    return {
      userRole: 'employee',
      department: 'Verifier',
      isCloser: true,
      password: 'Pakistan123'
    };
  }

  return {
    userRole: 'employee',
    department: 'Sales',
    isCloser: false,
    password: 'Pakistan@786'
  };
};

const createStaffAccount = async (entry, index) => {
  const { firstName, lastName } = splitName(entry.name);
  const roleConfig = getRoleConfig(entry.role);
  const username = [slugify(firstName), slugify(lastName)].filter(Boolean).join('.') || `user${index + 1}`;
  const email = `${username}@${EMAIL_DOMAIN}`;
  const employeeId = `EMP${String(index + 1).padStart(4, '0')}`;
  const password = typeof roleConfig.password === 'function' ? roleConfig.password(firstName) : roleConfig.password;

  await User.deleteOne({ $or: [{ email }, { username }] });
  await Employee.deleteOne({ $or: [{ email }, { employeeId }] });

  const employee = await Employee.create({
    employeeId,
    firstName,
    lastName,
    email,
    department: roleConfig.department,
    isCloser: roleConfig.isCloser,
    hireDate: new Date(),
    status: 'Active',
    contact: {},
    registeredBy: null
  });

  const user = await User.create({
    username,
    email,
    password,
    role: roleConfig.userRole,
    employeeId: employee._id,
    isActive: true
  });

  await Employee.findByIdAndUpdate(employee._id, { user: user._id });

  return {
    name: entry.name,
    role: entry.role,
    username,
    email,
    employeeId,
    password,
    userRole: roleConfig.userRole,
    department: roleConfig.department
  };
};

const seedEmployees = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    for (let index = 0; index < STAFF.length; index += 1) {
      const result = await createStaffAccount(STAFF[index], index);
      console.log(`✅ Created ${result.name} (${result.role}) -> ${result.username} / ${result.password}`);
    }

    console.log('────────────────────────────────────────');
    console.log(`Created ${STAFF.length} accounts successfully.`);
  } catch (error) {
    console.error('Error creating staff accounts:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seedEmployees();