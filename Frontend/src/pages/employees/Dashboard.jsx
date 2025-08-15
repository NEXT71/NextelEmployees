import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  CheckCircle, XCircle, DollarSign, Clock, Calendar,
  User, Mail, AlertTriangle, X, ChevronDown, ChevronUp, Home, AlertCircle, RefreshCw
} from 'lucide-react';
import Header from '../../components/common/Header';
import StatsCard from '../../components/common/StatsCard';

const EmployeeDashboard = () => {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contact: { phone: '' },
    position: '',
    employeeId: '',
    salary: { baseSalary: 0 }
  });
  const [attendance, setAttendance] = useState([]);
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAttendanceDetails, setShowAttendanceDetails] = useState(false);
  const [showFinesDetails, setShowFinesDetails] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingFines, setLoadingFines] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [finesError, setFinesError] = useState(null);
  const navigate = useNavigate();

  // Helper function to format dates in local timezone
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

const fetchEmployeeData = async (token, userId) => {
  try {
    const response = await axios.get(
      `http://localhost:5000/api/employees/user/${userId}`,
      { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.success && response.data.data) {
      const employeeData = response.data.data;
      return {
        ...employeeData,
        name: `${employeeData.firstName} ${employeeData.lastName}`,
        salary: employeeData.salary || { baseSalary: 0 },
        phone: employeeData.contact?.phone || 'N/A',
        // Ensure all required fields are set
        position: employeeData.position || 'Not specified',
        employeeId: employeeData.employeeId || 'N/A'
      };
    } else {
      throw new Error('Invalid employee data structure');
    }
  } catch (err) {
    console.error("Error fetching employee data:", err);
    throw err; // Re-throw to handle in the calling function
  }
};

const fetchAttendanceData = async (token, employeeId) => {
  setLoadingAttendance(true);
  setAttendanceError(null);
  try {
    const response = await axios.get('http://localhost:5000/api/attendance', {
      headers: { Authorization: `Bearer ${token}` },
      params: { employeeId }
    });
    
    // Handle different response structures
    const attendanceData = response.data?.data || response.data || [];
    setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
  } catch (err) {
    console.error("Attendance fetch error:", err);
    setAttendanceError(err.response?.data?.message || "Failed to load attendance records");
    setAttendance([]); // Reset to empty array on error
  } finally {
    setLoadingAttendance(false);
  }
};

const fetchFinesData = async (token) => {
  setLoadingFines(true);
  setFinesError(null);
  try {
    const response = await axios.get('http://localhost:5000/api/fines/employee', {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Handle response based on your backend structure
    const finesData = response.data?.data || response.data;
    if (Array.isArray(finesData)) {
      setFines(finesData);
    } else {
      setFines([]);
      setFinesError("Unexpected fines data format");
    }
  } catch (err) {
    console.error("Fines fetch error:", err);
    setFinesError(err.response?.data?.message || "Failed to load fines records");
    setFines([]);
  } finally {
    setLoadingFines(false);
  }
};

const checkClockInStatus = async (token, employeeId) => {
  try {
    const response = await axios.get(
      'http://localhost:5000/api/attendance/status',
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { employeeId }
      }
    );
    
    // Update based on the backend response
    if (response.data?.data?.isClockedIn) {
      setClockedIn(true);
      setClockInTime(new Date(response.data.data.record.clockIn).toLocaleTimeString());
    } else {
      setClockedIn(false);
      setClockInTime(null);
    }
  } catch (err) {
    console.error("Error checking clock-in status:", err);
    setClockedIn(false);
    setClockInTime(null);
  }
};

  useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      // Get user data first
      const userResponse = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!userResponse.data?.data?._id) {
        throw new Error('Invalid user data received');
      }

      setUser(userResponse.data.data);
      const userId = userResponse.data.data._id;

      // Fetch employee data
      const employee = await fetchEmployeeData(token, userId);
      setEmployee(employee);

      // Fetch other data in parallel
      await Promise.all([
        fetchAttendanceData(token, employee._id),
        fetchFinesData(token)
      ]);

      // Check clock-in status
      await checkClockInStatus(token, employee._id);

    } catch (err) {
      console.error("Data fetch error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  fetchData();

  const timer = setInterval(() => {
    setCurrentTime(new Date());
  }, 60000);

  return () => clearInterval(timer);
}, [navigate]);

  const refreshAttendanceData = async () => {
    const token = localStorage.getItem('token');
    if (token && employee._id) {
      await fetchAttendanceData(token, employee._id);
    }
  };

  const refreshFinesData = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      await fetchFinesData(token);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      localStorage.removeItem('token');
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

const handleClockIn = async () => {
  try {
    setError('');
    const token = localStorage.getItem('token');
    
    const response = await axios.post(
      'http://localhost:5000/api/attendance/clock-in',
      {}, // No body needed - backend gets user ID from token
      { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      }
    );

    if (response.data.success) {
      setClockedIn(true);
      setClockInTime(new Date(response.data.data.clockIn).toLocaleTimeString());
      await fetchAttendanceData(token);
    }
  } catch (err) {
    console.error('ClockIn Error:', err);
    
    if (err.response?.data?.message) {
      setError(err.response.data.message);
      if (err.response.data.existingRecord) {
        setClockedIn(true);
        setClockInTime(new Date(err.response.data.existingRecord.clockIn).toLocaleTimeString());
      }
    }
    else if (err.message.includes('timeout')) {
      setError('Request timed out - please try again');
    }
    else {
      setError('Failed to complete clock in. Please try again.');
    }
  }
};

const handleClockOut = async () => {
  try {
    setError('');
    const token = localStorage.getItem('token');

    const response = await axios.post(
      'http://localhost:5000/api/attendance/clock-out',
      {}, // No body needed - backend gets user ID from token
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.success) {
      setClockedIn(false);
      setClockInTime(null);
      await fetchAttendanceData(token);
    }
  } catch (err) {
    setError(err.response?.data?.message || 'Failed to clock out');
  }
};

const calculateSummary = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Ensure attendance is an array
  const monthlyRecords = Array.isArray(attendance) 
    ? attendance.filter(record => {
        if (!record || !record.date) return false;
        const recordDate = new Date(record.date);
        return (
          recordDate.getMonth() === currentMonth &&
          recordDate.getFullYear() === currentYear
        );
      })
    : [];

  const presentDays = monthlyRecords.filter(record => record.status === 'Present').length;
  const absentDays = monthlyRecords.filter(record => record.status === 'Absent').length;
  
  const totalHours = monthlyRecords.reduce((total, record) => {
    if (record.clockIn && record.clockOut) {
      const clockIn = new Date(record.clockIn);
      const clockOut = new Date(record.clockOut);
      const hours = (clockOut - clockIn) / (1000 * 60 * 60);
      return total + hours;
    }
    return total;
  }, 0);

  const baseSalary = employee?.salary?.baseSalary || 0;
  const dailyRate = baseSalary / 30;
  const netSalary = baseSalary - (absentDays * dailyRate);

  // Ensure fines is an array before using reduce
  const totalFines = Array.isArray(fines) 
    ? fines.reduce((total, fine) => total + (fine.approved ? fine.amount : 0), 0)
    : 0;

  return {
    presentDays,
    absentDays,
    monthlySalary: baseSalary,
    netSalary: netSalary - totalFines,
    totalHours: Math.round(totalHours),
    totalFines
  };
};

  const summaryData = calculateSummary();

  const ProfileCard = ({ employee }) => (
    <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-6 h-full">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xl font-medium">
            {employee?.name?.split(' ').map(n => n[0]).join('') || 'US'}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">
            {employee?.name || 'No name'}
          </h2>
          <p className="text-blue-200/80">{employee?.position || 'Position not set'}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Mail className="w-5 h-5 text-blue-300/80" />
          <span className="text-sm text-blue-200">{employee?.email || 'No email'}</span>
        </div>
      </div>
    </div>
  );

  const ClockInOut = ({ clockedIn, clockInTime, currentTime, onClockIn, onClockOut }) => (
    <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="text-center md:text-left mb-6 md:mb-0">
          <h2 className="text-xl font-semibold text-white mb-2">
            {clockedIn ? 'Currently Working' : 'Ready to Start'}
          </h2>
          <p className="text-blue-200/80 mb-4">
            {clockedIn ? `Clocked in at ${clockInTime}` : 'Click the button to clock in'}
          </p>
          <div className="flex items-center justify-center md:justify-start space-x-2 text-sm text-blue-300/70">
            <Calendar className="w-4 h-4" />
            <span>
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-white mb-1">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-blue-300/70">Current Time</div>
          </div>
          
          <button
            onClick={clockedIn ? onClockOut : onClockIn}
            className={`
              relative px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300
              ${clockedIn 
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              }
            `}
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>{clockedIn ? 'Clock Out' : 'Clock In'}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const AttendanceTable = ({ data, title, loading: isLoading, error: hasError, onRefresh }) => {
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    const formatTime = (timeString) => {
      if (!timeString) return '-';
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'UTC'
      });
    };

    const calculateHours = (clockIn, clockOut) => {
      if (!clockIn || !clockOut) return '0h';
      const start = new Date(clockIn);
      const end = new Date(clockOut);
      const hours = (end - start) / (1000 * 60 * 60);
      return `${hours.toFixed(1)}h`;
    };

    return (
      <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div 
          className="p-6 border-b border-white/10 flex justify-between items-center cursor-pointer"
          onClick={() => setShowAttendanceDetails(!showAttendanceDetails)}
        >
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {data.length > 0 && (
              <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full">
                {data.length} records
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              disabled={isLoading}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-blue-300 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {showAttendanceDetails ? <ChevronUp className="text-blue-300" /> : <ChevronDown className="text-blue-300" />}
          </div>
        </div>
        
        {showAttendanceDetails && (
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 text-center text-blue-300 flex flex-col items-center justify-center h-32">
                <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                Loading attendance records...
              </div>
            ) : hasError ? (
              <div className="p-6 text-center text-red-300 flex flex-col items-center justify-center h-32">
                <AlertCircle className="w-5 h-5 mb-2" />
                <span className="mb-2">{hasError}</span>
                <button
                  onClick={onRefresh}
                  className="text-blue-300 hover:text-blue-200 underline text-sm"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Clock In</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Clock Out</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.length > 0 ? (
                    data.map((record, index) => (
                      <tr key={record._id || index} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-sm text-white">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-100 font-mono">
                          {formatTime(record.clockIn)}
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-100 font-mono">
                          {formatTime(record.clockOut)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${record.status === 'Present' 
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }
                          `}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-100 font-mono">
                          {calculateHours(record.clockIn, record.clockOut)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-blue-200/70">
                        No attendance records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    );
  };

  const FinesTable = ({ data, title, loading: isLoading, error: hasError, onRefresh }) => {
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0
      }).format(amount);
    };

    return (
      <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div 
          className="p-6 border-b border-white/10 flex justify-between items-center cursor-pointer"
          onClick={() => setShowFinesDetails(!showFinesDetails)}
        >
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {data.length > 0 && (
              <span className="bg-red-500/20 text-red-300 text-xs px-2 py-1 rounded-full">
                {data.length} fines
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              disabled={isLoading}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-blue-300 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {showFinesDetails ? <ChevronUp className="text-blue-300" /> : <ChevronDown className="text-blue-300" />}
          </div>
        </div>
        
        {showFinesDetails && (
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 text-center text-blue-300 flex flex-col items-center justify-center h-32">
                <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                Loading fines records...
              </div>
            ) : hasError ? (
              <div className="p-6 text-center text-red-300 flex flex-col items-center justify-center h-32">
                <AlertCircle className="w-5 h-5 mb-2" />
                <span className="mb-2">{hasError}</span>
                <button
                  onClick={onRefresh}
                  className="text-blue-300 hover:text-blue-200 underline text-sm"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.length > 0 ? (
                    data.map((fine, index) => (
                      <tr key={fine._id || index} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-sm text-white">
                          {formatDate(fine.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-100">
                          {fine.type}
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-100 font-mono">
                          {formatCurrency(fine.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-100">
                          {fine.description || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${fine.approved 
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' 
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }
                          `}>
                            {fine.approved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-blue-200/70">
                        No fines records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">Loading employee dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      <Header
        userName={user?.username}
        onLogout={handleLogout}
        showProfileButton={false}
      />

      <div className="container mx-auto p-6 space-y-8 relative z-10">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-300 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProfileCard employee={employee} />
          <div className="lg:col-span-2">
            <ClockInOut
              clockedIn={clockedIn}
              clockInTime={clockInTime}
              currentTime={currentTime}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Present Days"
            value={summaryData.presentDays || 0}
            icon={<CheckCircle className="w-6 h-6" />}
            color="green"
          />
          <StatsCard
            title="Absent Days"
            value={summaryData.absentDays || 0}
            icon={<XCircle className="w-6 h-6" />}
            color="red"
          />
          <StatsCard
            title="Fines"
            value={`PKR ${summaryData.netSalary?.toLocaleString() || '0'}`}
            icon={<DollarSign className="w-6 h-6" />}
            color="purple"
            tooltip={`After ${summaryData.totalFines > 0 ? `PKR ${summaryData.totalFines} in fines` : 'no fines'}`}
          />
        </div>

        <AttendanceTable 
          data={Array.isArray(attendance) ? attendance.slice(0, 10) : []}
          title="Recent Attendance Records"
          loading={loadingAttendance}
          error={attendanceError}
          onRefresh={refreshAttendanceData}
        />

        <FinesTable 
          data={fines.slice(0, 10)}
          title="Your Fines"
          loading={loadingFines}
          error={finesError}
          onRefresh={refreshFinesData}
        />
      </div>
    </div>
  );
};

export default EmployeeDashboard;