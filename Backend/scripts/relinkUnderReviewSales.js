// Links "under review" sales to employees when the submitted agent name is a close spelling match.
// Dry run by default: prints what would change. Pass --apply to save.
//   node scripts/relinkUnderReviewSales.js
//   node scripts/relinkUnderReviewSales.js --apply
// Options: --skip=NAME1,NAME2 (leave these submitted names in review), --log=file.json (records original names)
import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SalesTarget from '../models/SalesTarget.js';
import Employee from '../models/Employee.js';
import { normalizeName, resolveEmployeeByName } from '../utils/employeeMatch.js';

dotenv.config();

const apply = process.argv.includes('--apply');
const argValue = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const skip = (argValue('skip') || '').split(',').map((n) => n.trim().toLowerCase()).filter(Boolean);
const logPath = argValue('log');
const changes = [];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const sales = await SalesTarget.find({ status: 'under_review' });
  console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${sales.length} under-review sale(s)\n`);

  const groups = {};
  let unmatched = 0;
  let linked = 0;

  for (const sale of sales) {
    const submitted = normalizeName(sale.agentName);
    const match = skip.includes(submitted.toLowerCase()) ? null : await resolveEmployeeByName(Employee, submitted);
    if (!match) {
      unmatched += 1;
      groups[`${submitted}  ->  (no safe match)`] = (groups[`${submitted}  ->  (no safe match)`] || 0) + 1;
      continue;
    }

    const fullName = normalizeName(`${match.employee.firstName || ''} ${match.employee.lastName || ''}`);
    const key = `${submitted}  ->  ${fullName}${match.exact ? ' (exact)' : ' (similar)'}`;
    groups[key] = (groups[key] || 0) + 1;

    if (apply) {
      changes.push({ saleId: String(sale._id), submittedName: sale.agentName, linkedTo: fullName, agent: String(match.employee._id) });
      sale.agent = match.employee._id;
      sale.agentName = fullName;
      sale.status = 'pending'; // still needs QA approval
      await sale.save();
      linked += 1;
    }
  }

  Object.entries(groups).sort().forEach(([key, count]) => console.log(`${String(count).padStart(4)}  ${key}`));
  console.log(`\n${apply ? `Linked ${linked}` : `Would link ${sales.length - unmatched}`}, left in review: ${unmatched}`);

  if (apply && logPath) fs.writeFileSync(logPath, JSON.stringify(changes, null, 2));

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
