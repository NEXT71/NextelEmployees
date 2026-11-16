// Recompute the stored daily tier (achievedTier / tierBonus / totalEarning) on approved CSR
// sales from CSR_LINE_BONUS_START_SHIFT_DATE onwards, using the bonus-line tiers in payRules.
// Dry run by default. Run from Backend/:
//   node scripts/recalcCsrLineTiers.js          (show what would change)
//   node scripts/recalcCsrLineTiers.js --apply  (write the changes)
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import mongoose from 'mongoose';
import SalesTarget from '../models/SalesTarget.js';
import { getSalesShiftRange } from '../utils/salesShift.js';
import { CSR_LINE_BONUS_START_SHIFT_DATE, getDailyTier, calcDailyEarning, groupCsrSalesByDay } from '../utils/payRules.js';

const apply = process.argv.includes('--apply');

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured in Backend/.env');
  await mongoose.connect(process.env.MONGO_URI);

  const start = getSalesShiftRange(CSR_LINE_BONUS_START_SHIFT_DATE).start;
  const sales = await SalesTarget.find({ status: 'approved', agent: { $ne: null }, createdAt: { $gte: start } })
    .select('agent createdAt saleDate dids achievedTier tierBonus totalEarning')
    .lean();

  // Group per agent, then per shift day
  const byAgent = {};
  sales.forEach((s) => {
    const key = String(s.agent);
    (byAgent[key] = byAgent[key] || []).push(s);
  });

  let daysChanged = 0;
  let salesChanged = 0;
  for (const [agent, agentSales] of Object.entries(byAgent)) {
    const days = groupCsrSalesByDay(agentSales);
    for (const day of Object.values(days)) {
      const { tier: achievedTier, bonus: tierBonus } = getDailyTier(day);
      const totalEarning = Math.round(calcDailyEarning(day));
      const range = getSalesShiftRange(day.shiftDate);
      const daySales = agentSales.filter((s) => s.createdAt >= range.start && s.createdAt < range.end);
      const stale = daySales.filter((s) => s.achievedTier !== achievedTier || s.tierBonus !== tierBonus || s.totalEarning !== totalEarning);
      if (!stale.length) continue;

      daysChanged += 1;
      salesChanged += stale.length;
      console.log(`${agent} ${day.shiftDate}: ${day.total} approved, ${day.lineSales} on lines -> tier ${achievedTier}, bonus ${tierBonus} (was tier ${stale[0].achievedTier}, bonus ${stale[0].tierBonus})`);
      if (apply) {
        await SalesTarget.updateMany(
          { _id: { $in: daySales.map((s) => s._id) } },
          { $set: { achievedTier, tierBonus, totalEarning } }
        );
      }
    }
  }

  console.log(`\n${apply ? 'Updated' : 'Would update'} ${salesChanged} sales across ${daysChanged} agent-days.`);
  if (!apply && salesChanged) console.log('Re-run with --apply to write these changes.');
};

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
