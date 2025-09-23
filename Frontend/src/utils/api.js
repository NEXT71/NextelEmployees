import { API_BASE_URL } from './constants';

// Helper function to get token from localStorage
const getToken = () => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    return null;
  }
};

// Helper function to set token in localStorage
const setToken = (token) => {
  try {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  } catch (error) {
    console.error('Failed to store token:', error);
  }
};

// Helper function to make API requests with proper error handling
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();
  
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    // Handle 403 specifically - could be time access restriction
    if (response.status === 403) {
      const data = await response.json().catch(() => ({ message: 'Access forbidden' }));
      
      // Check if it's an attendance-specific time restriction
      if (data.error === 'ATTENDANCE_TIME_RESTRICTED') {
        return { 
          error: true, 
          message: data.message, 
          status: 403, 
          attendanceTimeRestricted: true,
          currentTime: data.currentTime,
          allowedWindow: data.allowedWindow,
          nextAvailableTime: data.nextAvailableTime
        };
      }
      
      return { error: true, message: data.message || 'Access forbidden', status: 403 };
    }
    
    // Handle 401 specifically - user is not authenticated
    if (response.status === 401) {
      // Clear invalid token
      setToken(null);
      // Don't throw error for auth endpoints, let components handle gracefully
      if (endpoint.includes('/auth/')) {
        const data = await response.json().catch(() => ({ message: 'Authentication failed' }));
        return { error: true, message: data.message || 'Authentication failed', status: 401 };
      }
      // For other endpoints, redirect to login
      window.location.href = '/login';
      return { error: true, message: 'Please log in to continue', status: 401 };
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    // Handle network connection errors specifically
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error(`Connection failed for ${endpoint}:`, error);
      throw new Error('Cannot connect to server. Please ensure the backend is running.');
    }
    
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// Authentication API calls
export const authAPI = {
  // Register a new employee (admin only)
  registerEmployee: (employeeData) =>
    apiRequest('/auth/register/employee', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    }),

  // User login
  login: async (credentials) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // Store token if login successful
    if (response && response.token) {
      setToken(response.token);
    }
    
    return response;
  },

  // User logout
  logout: async () => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      });
    } finally {
      // Always clear token on logout, even if API call fails
      setToken(null);
    }
  },

  // Get current user
  getCurrentUser: () =>
    apiRequest('/auth/me'),
};

// Employee API calls
export const employeeAPI = {
  // Get all employees
  getAllEmployees: () =>
    apiRequest('/employees'),

  // Get employee by ID
  getEmployeeById: (id) =>
    apiRequest(`/employees/${id}`),

  // Get employee by user ID
  getEmployeeByUserId: (userId) =>
    apiRequest(`/employees/user/${userId}`),

  // Update employee
  updateEmployee: (id, updateData) =>
    apiRequest(`/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    }),

  // Delete employee
  deleteEmployee: (id) =>
    apiRequest(`/employees/${id}`, {
      method: 'DELETE',
    }),

  // Get employee statistics
  getEmployeeStats: () =>
    apiRequest('/auth/employees/stats'),
};

// Attendance API calls
export const attendanceAPI = {
  // Get all attendance records
  getAllAttendance: () =>
    apiRequest('/attendance'),

  // Get attendance by employee ID with query params
  getAttendanceByEmployee: (employeeId) =>
    apiRequest(`/attendance?employeeId=${employeeId}`),

  // Get attendance status for employee
  getAttendanceStatus: (employeeId) =>
    apiRequest(`/attendance/status?employeeId=${employeeId}`),

  // Get attendance time window status
  getAttendanceTimeWindow: () =>
    apiRequest('/attendance/time-window'),

  // Clock in
  clockIn: () =>
    apiRequest('/attendance/clock-in', {
      method: 'POST',
    }),

  // Clock out
  clockOut: () =>
    apiRequest('/attendance/clock-out', {
      method: 'POST',
    }),

  // Create attendance record
  createAttendance: (attendanceData) =>
    apiRequest('/attendance', {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    }),

  // Update attendance record
  updateAttendance: (id, updateData) =>
    apiRequest(`/attendance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    }),
};

// Fine API calls
export const fineAPI = {
  // Get all fines
  getAllFines: () =>
    apiRequest('/fines'),

  // Get fines for current employee (uses token to identify employee)
  getEmployeeFines: () =>
    apiRequest('/fines/employee'),

  // Get fines by employee ID
  getFinesByEmployee: (employeeId) =>
    apiRequest(`/fines/employee/${employeeId}`),

  // Create fine
  createFine: (fineData) =>
    apiRequest('/fines', {
      method: 'POST',
      body: JSON.stringify(fineData),
    }),

  // Update fine
  updateFine: (id, updateData) =>
    apiRequest(`/fines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    }),

  // Delete fine
  deleteFine: (id) =>
    apiRequest(`/fines/${id}`, {
      method: 'DELETE',
    }),
};

// Salary API calls
export const salaryAPI = {
  // Get all salaries
  getAllSalaries: () =>
    apiRequest('/salaries'),

  // Get salaries by employee ID
  getSalariesByEmployee: (employeeId) =>
    apiRequest(`/salaries/employee/${employeeId}`),

  // Create salary record
  createSalary: (salaryData) =>
    apiRequest('/salaries', {
      method: 'POST',
      body: JSON.stringify(salaryData),
    }),

  // Update salary record
  updateSalary: (id, updateData) =>
    apiRequest(`/salaries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    }),
};

// Utility functions for authentication
export const isAuthenticated = () => {
  return !!getToken();
};

export const clearAuth = () => {
  setToken(null);
};

// Export all APIs as a single object
export const api = {
  auth: authAPI,
  employees: employeeAPI,
  attendance: attendanceAPI,
  fines: fineAPI,
  salaries: salaryAPI,
};

export default api;