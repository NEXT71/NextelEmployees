import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('Missing MongoDB connection string. Set MONGO_URI or MONGODB_URI in .env.');
  process.exit(1);
}

const DEFAULT_STAFF_NAMES = [
  'Astishna',
  'rakhil',
  'rimsha',
  'shamraiz',
  'kumail',
  'Umer',
  'Maqsood',
  'Zaheer',
  'Asmatullah',
  'Abuzar Khan',
  'Shaban',
  'Ahmed Ali',
  'Qaiser Abbas',
  'Abdul Wahab',
  'Atifa'
];
const requestedNames = process.argv
  .slice(2)
  .filter(argument => argument.startsWith('--name='))
  .map(argument => argument.slice('--name='.length).trim())
  .filter(Boolean);
const STAFF_NAMES = requestedNames.length > 0 ? requestedNames : DEFAULT_STAFF_NAMES;

const normalize = (value = '') =>
  String(value)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const capitalize = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const slugify = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.+/g, '.');

const splitName = (value = '') => {
  const parts = String(value)
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean);

  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: capitalize(parts[0]), lastName: '' };

  return {
    firstName: capitalize(parts[0]),
    lastName: capitalize(parts.slice(1).join(' '))
  };
};

const getRoleConfig = () => ({
  userRole: 'employee',
  department: 'Sales',
  isCloser: false,
  password: 'Pakistan@786'
});

const getFullName = employee =>
  normalize([employee.firstName, employee.lastName].filter(Boolean).join(' '));

const findMatchingEmployees = (existingEmployees, targetName) => {
  const normalizedTarget = normalize(targetName);
  const targetWords = normalizedTarget.split(' ').filter(Boolean);

  return existingEmployees.filter(employee => {
    const fullName = getFullName(employee);
    if (fullName === normalizedTarget) return true;
    if (fullName.startsWith(`${normalizedTarget} `)) return true;
    if (fullName.endsWith(` ${normalizedTarget}`)) return true;
    if (targetWords.length === 1 && normalize(employee.firstName) === normalizedTarget) return true;
    return false;
  });
};

const buildUniqueUsername = (base, existingUsernames) => {
  let username = slugify(base);
  if (!username) username = 'user';

  let candidate = username;
  let counter = 1;
  while (existingUsernames.has(candidate)) {
    candidate = `${username}${counter}`;
    counter += 1;
  }

  return candidate;
};

const getNextEmployeeId = existingIds => {
  const maxNumber = existingIds.reduce((max, id) => {
    const match = String(id).match(/EMP(\d+)/i);
    if (!match) return max;
    const numeric = Number(match[1]);
    return Number.isNaN(numeric) ? max : Math.max(max, numeric);
  }, 0);

  return `EMP${String(maxNumber + 1).padStart(4, '0')}`;
};

const run = async () => {
  await mongoose.connect(MONGO_URI);

  const existingEmployees = await Employee.find({}, 'firstName lastName employeeId email department isCloser status user')
    .populate('user', 'username role isActive')
    .lean();
  const existingUsers = await User.find({}, 'username email').lean();
  const existingUsernames = new Set(existingUsers.map(user => normalize(user.username)));
  const existingEmails = new Set(existingUsers.map(user => normalize(user.email)));
  const existingEmployeeIds = existingEmployees.map(emp => emp.employeeId);

  if (process.argv.includes('--list-all') || process.argv.includes('--deactivate-others')) {
    const agents = existingEmployees.filter(employee => employee.department === 'Sales' && !employee.isCloser);
    const keptIds = new Set(
      requestedNames.flatMap(name => findMatchingEmployees(agents, name).map(employee => String(employee._id)))
    );
    const otherAgents = agents.filter(employee => !keptIds.has(String(employee._id)));

    console.log('Sales non-closer employee accounts (passwords are not available):');
    agents.forEach(employee => {
      const name = [employee.firstName, employee.lastName].filter(Boolean).join(' ');
      const group = keptIds.has(String(employee._id)) ? 'KEEP' : 'OTHER';
      const loginStatus = employee.user ? (employee.user.isActive ? 'login active' : 'login inactive') : 'no linked user';
      console.log(`  ${group} | ${name} | ${employee.employeeId} | ${employee.email} | ${employee.user?.username || 'no linked user'} | ${employee.status} | ${loginStatus}`);
    });

    console.log(`\nTotal: ${agents.length}; matched to supplied names: ${keptIds.size}; other Sales non-closers: ${otherAgents.length}`);

    if (process.argv.includes('--deactivate-others')) {
      if (requestedNames.length === 0) throw new Error('Pass the keep-list with --name="..." before deactivating others.');
      if (otherAgents.length !== 24) throw new Error(`Expected 24 other Sales non-closers, found ${otherAgents.length}; nothing was changed.`);
      if (otherAgents.some(employee => !employee.user || employee.user.role !== 'employee')) {
        throw new Error('At least one target has no linked employee user account; nothing was changed.');
      }

      if (process.argv.includes('--apply')) {
        const employeeIds = otherAgents.map(employee => employee._id);
        const userIds = otherAgents.map(employee => employee.user._id);
        const session = await mongoose.startSession();

        try {
          await session.withTransaction(async () => {
            const employeeResult = await Employee.updateMany(
              { _id: { $in: employeeIds }, department: 'Sales', isCloser: false },
              { $set: { status: 'Inactive' } },
              { session }
            );
            const userResult = await User.updateMany(
              { _id: { $in: userIds }, role: 'employee' },
              { $set: { isActive: false } },
              { session }
            );

            if (employeeResult.matchedCount !== 24 || userResult.matchedCount !== 24) {
              throw new Error('The matched record count changed during update; transaction aborted.');
            }
          });
        } finally {
          await session.endSession();
        }

        console.log('Deactivated 24 Employee profiles and linked User accounts. Historical records were not changed.');
      } else {
        console.log('Preview only. Add --apply to deactivate these 24 accounts.');
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  }

  const missingNames = [];
  const existingResults = [];

  for (const name of STAFF_NAMES) {
    const matches = findMatchingEmployees(existingEmployees, name);
    if (matches.length > 0) {
      existingResults.push({ name, present: true, matches });
    } else {
      missingNames.push(name);
      existingResults.push({ name, present: false, matches: [] });
    }
  }

  console.log('Employee presence report:');
  existingResults.forEach(result => {
    if (result.present) {
      console.log(`  ✅ ${result.name} — already present (${result.matches.map(m => `${m.firstName} ${m.lastName} ${m.employeeId ? `/${m.employeeId}` : ''}`.trim()).join(', ')})`);
    } else {
      console.log(`  ⚠️ ${result.name} — missing`);
    }
  });

  if (missingNames.length === 0) {
    console.log('\nNo missing employees found.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const shouldSeed = process.argv.includes('--seed');
  console.log(`\nMissing count: ${missingNames.length}. Use --seed to create them in the database.`);

  if (!shouldSeed) {
    await mongoose.disconnect();
    process.exit(0);
  }

  let nextIdNumber = existingEmployeeIds.reduce((max, id) => {
    const match = String(id).match(/EMP(\d+)/i);
    if (!match) return max;
    const numeric = Number(match[1]);
    return Number.isNaN(numeric) ? max : Math.max(max, numeric);
  }, 0) + 1;

  for (const name of missingNames) {
    const { firstName, lastName } = splitName(name);
    const roleConfig = getRoleConfig();

    const baseUsername = [firstName, lastName].filter(Boolean).join(' ');
    const username = buildUniqueUsername(baseUsername, existingUsernames);
    existingUsernames.add(normalize(username));

    let email = `${username}@nextelbpo.co`;
    let emailCounter = 1;
    while (existingEmails.has(normalize(email))) {
      email = `${username}${emailCounter}@nextelbpo.co`;
      emailCounter += 1;
    }
    existingEmails.add(normalize(email));

    const employeeId = `EMP${String(nextIdNumber).padStart(4, '0')}`;
    nextIdNumber += 1;

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
      password: roleConfig.password,
      role: roleConfig.userRole,
      employeeId: employee._id,
      isActive: true
    });

    await Employee.findByIdAndUpdate(employee._id, { user: user._id });

    console.log(`  ✅ Created ${name}: ${username} / ${email} / ${employeeId}`);
  }

  console.log('\nMissing employees created successfully.');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(error => {
  console.error('Error running seedMissingEmployees.js:', error);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
