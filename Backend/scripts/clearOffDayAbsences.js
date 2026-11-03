import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Attendance from '../models/Attendance.js';
import { OFF_DAY_DATES } from '../utils/holidays.js';

dotenv.config();

/**
 * Remove Absent records (never clocked in) on official off days.
 * Usage: node scripts/clearOffDayAbsences.js          (dry run)
 *        node scripts/clearOffDayAbsences.js --apply  (delete)
 * Present/Late records of anyone who actually worked that day are kept.
 */
const run = async () => {
  const apply = process.argv.includes('--apply');
  try {
    await connectDB();

    const filter = { date: { $in: OFF_DAY_DATES }, status: 'Absent', clockIn: null };
    const count = await Attendance.countDocuments(filter);
    console.log(`📅 Off days: ${OFF_DAY_DATES.map((d) => d.toISOString().split('T')[0]).join(', ')}`);
    console.log(`❌ Absent records on off days: ${count}`);

    if (!apply) {
      console.log('ℹ️ Dry run - re-run with --apply to delete them');
    } else {
      const result = await Attendance.deleteMany(filter);
      console.log(`✅ Deleted ${result.deletedCount} records`);
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
