import { API_BASE_URL } from './constants';
import { apiCache, requestDeduplicator, performanceMonitor } from './apiCache';

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

// Helper function to create cache key
const createCacheKey = (endpoint, options = {}) => {
  const method = options.method || 'GET';
  const body = options.body || '';
  return `${method}:${endpoint}:${body}`;
};

// Helper function to determine if request should be cached
const shouldCache = (endpoint, method = 'GET') => {
  if (method !== 'GET') return false;
  
  const cacheableEndpoints = [
    '/auth/me',
    '/employees',
    '/messages/available-admins',
    '/attendance',
    '/fines',
    '/salaries'
  ];
  
  return cacheableEndpoints.some(path => endpoint.includes(path));
};

// Helper function to make API requests with proper error handling and caching
const apiRequest = async (endpoint, options = {}) => {
  const requestKey = `${options.method || 'GET'}:${endpoint}`;
  performanceMonitor.start(requestKey);
  
  // Check cache first for GET requests
  const cacheKey = createCacheKey(endpoint, options);
  if (shouldCache(endpoint, options.method)) {
    const cachedResult = apiCache.get(cacheKey);
    if (cachedResult) {
      performanceMonitor.end(requestKey);
      return cachedResult;
    }
  }

  // Use request deduplication for GET requests
  if (!options.method || options.method === 'GET') {
    return requestDeduplicator.dedupe(requestKey, async () => {
      return makeApiCall(endpoint, options, cacheKey);
    });
  }

  return makeApiCall(endpoint, options, cacheKey);
};

const makeApiCall = async (endpoint, options = {}, cacheKey) => {
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

    // Cache successful GET responses
    if (shouldCache(endpoint, options.method) && cacheKey) {
      // Set cache TTL based on endpoint type
      let ttl = 5 * 60 * 1000; // Default 5 minutes
      if (endpoint.includes('/auth/me')) ttl = 15 * 60 * 1000; // 15 minutes for user data
      if (endpoint.includes('/available-admins')) ttl = 30 * 60 * 1000; // 30 minutes for admin list
      
      apiCache.set(cacheKey, data, ttl);
    }

    const requestKey = `${options.method || 'GET'}:${endpoint}`;
    performanceMonitor.end(requestKey);
    
    return data;
  } catch (error) {
    const requestKey = `${options.method || 'GET'}:${endpoint}`;
    performanceMonitor.end(requestKey);
    
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

  // Get fine summary for dashboard
  getFineSummary: () =>
    apiRequest('/fines/summary'),

  // Get employee summary with fine stats for dashboard
  getEmployeeSummary: () =>
    apiRequest('/fines/employeesSummary'),
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

// Message API calls
export const messageAPI = {
  // Send message to admins (employee)
  sendMessage: (messageData) =>
    apiRequest('/messages/send', {
      method: 'POST',
      body: JSON.stringify(messageData),
    }),

  // Get employee's messages
  getMyMessages: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/messages/my-messages${queryString ? `?${queryString}` : ''}`);
  },

  // Get all messages for admin
  getAdminMessages: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/messages/admin/all${queryString ? `?${queryString}` : ''}`);
  },

  // Admin respond to message
  respondToMessage: (messageId, response) =>
    apiRequest(`/messages/${messageId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    }),

  // Mark message as read
  markAsRead: (messageId) =>
    apiRequest(`/messages/${messageId}/read`, {
      method: 'PATCH',
    }),

  // Get message statistics
  getMessageStats: () =>
    apiRequest('/messages/admin/stats'),

  // Resolve message
  resolveMessage: (messageId) =>
    apiRequest(`/messages/${messageId}/resolve`, {
      method: 'PATCH',
    }),

  // Get available admins for targeting
  getAvailableAdmins: () =>
    apiRequest('/messages/available-admins'),
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
  messages: messageAPI,
};

export default api;