import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import SalesTarget from '../models/SalesTarget.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const employees = await Employee.find(
    { firstName: { $regex: 'umair', $options: 'i' } },
    'firstName lastName employeeId isCloser'
  ).lean();

  console.log('Employees matching Umair:');
  console.log(JSON.stringify(employees, null, 2));

  const sales = await SalesTarget.find(
    { closer: { $regex: 'umair', $options: 'i' } },
    'closer closerRef agentName customer status saleDate'
  ).lean();

  console.log('Sales matching closer Umair:');
  console.log(JSON.stringify(sales.slice(0, 20), null, 2));

  await mongoose.disconnect();
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
