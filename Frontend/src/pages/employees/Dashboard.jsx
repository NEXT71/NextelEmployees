import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, XCircle, DollarSign, Clock, Calendar,
  User, Mail, AlertTriangle, X, ChevronDown, ChevronUp, Home, AlertCircle, RefreshCw, MessageCircle
} from 'lucide-react';
import Header from '../../components/common/Header';
import StatsCard from '../../components/common/StatsCard';
import AttendanceTimeStatus from '../../components/common/AttendanceTimeStatus';
import MessageCenter from '../../components/common/MessageCenter';
import { authAPI, employeeAPI, attendanceAPI, fineAPI, messageAPI, isAuthenticated, clearAuth } from '../../utils/api';
import { isWithinAttendanceWindow } from '../../utils/attendanceTimeAccess';

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
  const [showMessageCenter, setShowMessageCenter] = useState(false);
  const navigate = useNavigate();

const fetchAttendanceData = async (employeeId) => {
  setLoadingAttendance(true);
  setAttendanceError(null);
  try {
    const response = await attendanceAPI.getAttendanceByEmployee(employeeId);
    
    // Handle different response structures
    const attendanceData = response?.data || response || [];
    setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
  } catch (err) {
    console.error("Attendance fetch error:", err);
    setAttendanceError(err.message || "Failed to load attendance records");
    setAttendance([]); // Reset to empty array on error
  } finally {
    setLoadingAttendance(false);
  }
};

const fetchFinesData = async () => {
  setLoadingFines(true);
  setFinesError(null);
  try {
    const response = await fineAPI.getEmployeeFines();
    
    // Handle response based on your backend structure
    const finesData = response?.data || response;
    if (Array.isArray(finesData)) {
      setFines(finesData);
    } else {
      setFines([]);
      setFinesError("Unexpected fines data format");
    }
  } catch (err) {
    console.error("Fines fetch error:", err);
    setFinesError(err.message || "Failed to load fines records");
    setFines([]);
  } finally {
    setLoadingFines(false);
  }
};

const checkClockInStatus = async (employeeId) => {
  try {
    const response = await attendanceAPI.getAttendanceStatus(employeeId);
    
    // Update based on the backend response
    if (response?.data?.isClockedIn) {
      setClockedIn(true);
      setClockInTime(new Date(response.data.record.clockIn).toLocaleTimeString());
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
        
        if (!isAuthenticated()) {
          navigate('/login');
          return;
        }

        // Get user data first
        const userResponse = await authAPI.getCurrentUser();
        
        // Check if the response indicates an authentication error
        if (userResponse?.error && userResponse?.status === 401) {
          clearAuth();
          navigate('/login');
          return;
        }
        
        if (!userResponse?.data?._id) {
          throw new Error('Invalid user data received');
        }

        setUser(userResponse.data);
        const userId = userResponse.data._id;

        // Fetch employee data using the new API
        const employeeResponse = await employeeAPI.getEmployeeByUserId(userId);
        if (employeeResponse?.data) {
          const employeeData = {
            ...employeeResponse.data,
            name: `${employeeResponse.data.firstName} ${employeeResponse.data.lastName}`,
            salary: employeeResponse.data.salary || { baseSalary: 0 },
            phone: employeeResponse.data.contact?.phone || 'N/A',
            position: employeeResponse.data.position || 'Not specified',
            employeeId: employeeResponse.data.employeeId || 'N/A'
          };
          setEmployee(employeeData);
          
          // Fetch other data in parallel using the updated functions
          await Promise.all([
            fetchAttendanceData(employeeData._id),
            fetchFinesData()
          ]);

          // Check clock-in status
          await checkClockInStatus(employeeData._id);
        }

      } catch (err) {
        console.error("Data fetch error:", err);
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          clearAuth();
          navigate('/login');
        } else {
          setError(err.message || 'Failed to load data');
        }
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
    if (employee._id) {
      await fetchAttendanceData(employee._id);
    }
  };

  const refreshFinesData = async () => {
    await fetchFinesData();
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

const handleClockIn = async () => {
  try {
    setError('');
    
    // Check if within attendance window before attempting
    if (!isWithinAttendanceWindow()) {
      setError('Clock in is only allowed between 6:00 PM - 5:30 AM Pakistan Standard Time');
      return;
    }
    
    const response = await attendanceAPI.clockIn();

    if (response?.success) {
      setClockedIn(true);
      setClockInTime(new Date(response.data.clockIn).toLocaleTimeString());
      await fetchAttendanceData(employee._id);
    }
  } catch (err) {
    console.error('ClockIn Error:', err);
    
    // Handle specific attendance time restriction error
    if (err.message && err.message.includes('only allowed between')) {
      setError(err.message);
    } else if (err.message) {
      setError(err.message);
      // Check if error indicates existing record
      if (err.message.includes('already clocked in')) {
        setClockedIn(true);
        // Try to get the current status
        await checkClockInStatus(employee._id);
      }
    } else {
      setError('Failed to complete clock in. Please try again.');
    }
  }
};

const handleClockOut = async () => {
  try {
    setError('');

    // Check if within attendance window before attempting
    if (!isWithinAttendanceWindow()) {
      setError('Clock out is only allowed between 6:00 PM - 5:30 AM Pakistan Standard Time');
      return;
    }

    const response = await attendanceAPI.clockOut();

    if (response?.success) {
      setClockedIn(false);
      setClockInTime(null);
      await fetchAttendanceData(employee._id);
    }
  } catch (err) {
    console.error('ClockOut Error:', err);
    
    // Handle specific attendance time restriction error
    if (err.message && err.message.includes('only allowed between')) {
      setError(err.message);
    } else {
      setError(err.message || 'Failed to clock out');
    }
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

  const ClockInOut = ({ clockedIn, clockInTime, currentTime, onClockIn, onClockOut }) => {
    const isTimeAllowed = isWithinAttendanceWindow();
    
    return (
      <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <h2 className="text-xl font-semibold text-white mb-2">
              {clockedIn ? 'Currently Working' : 'Ready to Start'}
            </h2>
            <p className="text-blue-200/80 mb-4">
              {clockedIn ? `Clocked in at ${clockInTime}` : 'Click the button to clock in'}
            </p>
            {!isTimeAllowed && (
              <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-orange-300">
                    Clock in/out only allowed 6:00 PM - 5:30 AM PKT
                  </span>
                </div>
              </div>
            )}
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
              disabled={!isTimeAllowed}
              className={`
                relative px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300
                ${!isTimeAllowed 
                  ? 'bg-gray-500/50 cursor-not-allowed opacity-50' 
                  : clockedIn 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                }
              `}
              title={!isTimeAllowed ? 'Clock in/out is only allowed between 6:00 PM - 5:30 AM PKT' : ''}
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
  };

  const AttendanceTable = ({ data, title, loading: isLoading, error: hasError, onRefresh }) => {
    const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

    // In AttendanceTable
const formatTime = (timeString) => {
  if (!timeString) return '-';
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-PK', { 
    hour: '2-digit', 
    minute: '2-digit'
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
      {/* Background elements - responsive */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 sm:w-64 sm:h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      <Header
        userName={user?.username}
        onLogout={handleLogout}
        showProfileButton={false}
      />

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 relative z-10">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-300 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <ProfileCard employee={employee} />
          <div className="xl:col-span-2">
            <ClockInOut
              clockedIn={clockedIn}
              clockInTime={clockInTime}
              currentTime={currentTime}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
            />
          </div>
        </div>

        {/* Attendance Time Status */}
        <AttendanceTimeStatus className="w-full" />

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

      {/* Floating Message Button */}
      <button
        onClick={() => setShowMessageCenter(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 group"
        title="Contact Admins"
      >
        <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
      </button>

      {/* Message Center Modal */}
      <MessageCenter 
        isOpen={showMessageCenter}
        onClose={() => setShowMessageCenter(false)}
      />
    </div>
  );
};

export default EmployeeDashboard;