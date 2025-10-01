// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://nextelemployees-1.onrender.com/api';

export const FINE_TYPES = [
  { name: 'Clothing', amount: 300, code: 'CLT' },
  { name: 'Late', amount: 300, code: 'LAT' },
  { name: 'Absent', amount: 500, code: 'ABS' },
  { name: 'Performance', amount: 500, code: 'PRF' },
  { name: 'Late After Break', amount: 300, code: 'LAB' },
  { name: 'MisBehave', amount: 1000, code: 'MIS' },
  { name: 'Vape-Pod', amount: 300, code: 'VAP' },
  { name: 'Saturday Off', amount: 500, code: 'SOF' },
  { name: 'Mobile Usage/Wifi', amount: 300, code: 'MWF' },
  { name: 'Sleeping', amount: 300, code: 'SLP' }
];

export const DEPARTMENTS = [
  'Sales',
  'Quality Assurance',
  'HR'
];

export const EMPLOYEE_STATUS = [
  'Active',
  'Inactive',
  'On Leave'
];

export const ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
};