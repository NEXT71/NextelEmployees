import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import mongoose from 'mongoose';
import SalesTarget from '../models/SalesTarget.js';
import Employee from '../models/Employee.js';

const normalizeName = (value = '') => String(value || '').trim().replace(/\s+/g, ' ');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const sales = await SalesTarget.find({
    $or: [
      { closerRef: null },
      { closerRef: { $exists: false } }
    ]
  }).lean();
  let updated = 0;

  for (const sale of sales) {
    const closerName = normalizeName(sale.closer || '');
    if (!closerName) continue;

    const closerParts = closerName.split(/\s+/).filter(Boolean);
    const closerFirst = closerParts[0] || '';
    const closerLast = closerParts.slice(1).join(' ') || '';

    let matchedCloser = null;
    if (closerFirst) {
      matchedCloser = await Employee.findOne({
        firstName: { $regex: new RegExp(`^${escapeRegex(closerFirst)}$`, 'i') },
        ...(closerLast ? { lastName: { $regex: new RegExp(`^${escapeRegex(closerLast)}$`, 'i') } } : {})
      }).select('_id');
    }

    if (matchedCloser) {
      await SalesTarget.updateOne({ _id: sale._id }, { $set: { closerRef: matchedCloser._id } });
      updated += 1;
    }
  }

  console.log(JSON.stringify({ updated }));
  await mongoose.disconnect();
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
