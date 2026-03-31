// API Configuration with intelligent routing
const getApiUrl = () => {
  // Priority: 1. Environment var, 2. Localhost, 3. Production
  
  if (process.env.REACT_APP_API_URL) {
    console.log('✓ Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Localhost development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  
  // Render production - use separate backend service
  // IMPORTANT: On Render, backend and frontend should be SEPARATE services
  // Frontend: https://nextel-employees.onrender.com
  // Backend:  https://nextel-employees-api.onrender.com
  // or whatever your backend service URL is
  
  const currentHost = window.location.hostname;
  
  // If frontend is nextel-employees.onrender.com, backend is likely nextel-employees-api.onrender.com
  if (currentHost.includes('nextel-employees') && !currentHost.includes('-api')) {
    // Try to construct backend URL
    const backendUrl = window.location.origin.replace('nextelemployees-1', 'nextelemployees-backend') + '/api';
    console.log('📍 Detected Render frontend, using backend at:', backendUrl);
    return backendUrl;
  }
  
  // Fallback: same domain /api (only works if backend serves this route)
  console.log('⚠️  Using fallback /api (ensure backend is at same domain)');
  return window.location.origin + '/api';
};

export const API_BASE_URL = getApiUrl();

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

export const ATTENDANCE_STATUS = [
  { value: 'Present', label: 'Present', color: 'bg-green-500' },
  { value: 'Absent', label: 'Absent', color: 'bg-red-500' },
  { value: 'Late', label: 'Late', color: 'bg-yellow-500' },
  { value: 'Half-day', label: 'Half Day', color: 'bg-blue-500' }
];