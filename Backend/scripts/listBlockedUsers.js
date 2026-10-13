// Lists accounts that the isActive check (auth middleware + login) will block.
// Run BEFORE deploying so no legitimate admin/QA/HR/CSR gets locked out.
//   node scripts/listBlockedUsers.js           -> list only
//   node scripts/listBlockedUsers.js --enable  -> set isActive:true for users whose employee is not Inactive
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/nextel-employees');
  const enable = process.argv.includes('--enable');

  const users = await User.find({ isActive: { $ne: true }, role: { $ne: 'superadmin' } })
    .select('username email role isActive employeeId')
    .lean();

  if (users.length === 0) {
    console.log('✅ No accounts would be blocked.');
    return;
  }

  let enabled = 0;
  for (const u of users) {
    const emp = await Employee.findOne({ user: u._id }).select('status employeeId').lean();
    const status = emp ? emp.status : 'no employee record';
    console.log(`${u.role.padEnd(10)} ${u.username.padEnd(28)} ${u.email.padEnd(34)} employee: ${status}`);

    if (enable && (!emp || emp.status !== 'Inactive')) {
      await User.updateOne({ _id: u._id }, { $set: { isActive: true } });
      enabled += 1;
    }
  }

  console.log(`\n${users.length} account(s) would be blocked.`);
  if (enable) console.log(`Enabled ${enabled} (employees marked Inactive were left disabled).`);
  else console.log('Re-run with --enable to activate those that are not Inactive employees.');
};

run()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
