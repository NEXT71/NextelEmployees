import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminHeader from '../../components/common/AdminHeader';
import StatsCard from '../../components/common/StatsCard';
import { 
  Users, CheckCircle, XCircle, Clock, Calendar,
  X, Filter, Search, List, Download, RefreshCw,
  Edit, Save
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DEPARTMENTS = [
  'Sales',
  'Quality Assurance',
  'HR'
];

const STATUS_OPTIONS = [
  { value: 'Present', label: 'Present', color: 'bg-green-500' },
  { value: 'Absent', label: 'Absent', color: 'bg-red-500' },
  { value: 'Late', label: 'Late', color: 'bg-yellow-500' },
  { value: 'Half-day', label: 'Half Day', color: 'bg-blue-500' }
];

const AdminAttendance = () => {
  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('daily');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [summary, setSummary] = useState({
    Present: 0,
    Absent: 0,
    Late: 0,
    'Half-day': 0,
    totalEmployees: 0
  });

  const navigate = useNavigate();

  // Core fetch attendance function
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // First, fetch the attendance data
      let url = 'https://nextelemployees-1.onrender.com/api/attendance/admin';
      const params = new URLSearchParams();
      
      if (activeTab === 'daily') {
        params.append('date', selectedDate.toISOString().split('T')[0]);
      } else {
        params.append('startDate', startDate.toISOString().split('T')[0]);
        params.append('endDate', endDate.toISOString().split('T')[0]);
      }
      
      if (departmentFilter) params.append('department', departmentFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      const attendanceRes = await axios.get(`${url}?${params.toString()}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      setAttendance(attendanceRes.data.data || []); // Ensure we always have an array
      
      // Then fetch the summary data
      const summaryParams = new URLSearchParams();
      if (activeTab === 'daily') {
        summaryParams.append('date', selectedDate.toISOString().split('T')[0]);
      } else {
        summaryParams.append('startDate', startDate.toISOString().split('T')[0]);
        summaryParams.append('endDate', endDate.toISOString().split('T')[0]);
      }
      if (departmentFilter) summaryParams.append('department', departmentFilter);
      
      const summaryRes = await axios.get('https://nextelemployees-1.onrender.com/api/attendance/admin/summary', { 
        headers: { Authorization: `Bearer ${token}` },
        params: summaryParams
      });
      
      setSummary(summaryRes.data.data || {
        Present: 0,
        Absent: 0,
        Late: 0,
        'Half-day': 0,
        totalEmployees: 0
      });
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
      setAttendance([]); // Reset to empty array on error
      setSummary({
        Present: 0,
        Absent: 0,
        Late: 0,
        'Half-day': 0,
        totalEmployees: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://nextelemployees-1.onrender.com/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      }
    }
  };

  useEffect(() => {
    fetchUser();
    fetchAttendanceData();
  }, [activeTab, selectedDate, startDate, endDate, departmentFilter, statusFilter]);

  const handleLogout = async () => {
    try {
      await axios.post('https://nextelemployees-1.onrender.com/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      localStorage.removeItem('token');
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Update single attendance record
  const updateAttendanceRecord = async (id, updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `https://nextelemployees-1.onrender.com/api/attendance/admin/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Update local state
        setAttendance(prev => prev.map(record => 
          record._id === id ? { ...record, ...updates } : record
        ));
        // Refresh data
        fetchAttendanceData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update record');
    }
  };

  // Bulk update attendance records
  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedRecords.length === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'https://nextelemployees-1.onrender.com/api/attendance/admin/bulk',
        { 
          updates: selectedRecords.map(id => ({
            id,
            status: bulkStatus
          }))
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Refresh data
        fetchAttendanceData();
        // Clear selection
        setSelectedRecords([]);
        setIsBulkEditing(false);
        setBulkStatus('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to perform bulk update');
    }
  };

  // Toggle record selection for bulk edit
  const toggleRecordSelection = (id) => {
    setSelectedRecords(prev => 
      prev.includes(id) 
        ? prev.filter(recordId => recordId !== id)
        : [...prev, id]
    );
  };

  // Select all records
  const selectAllRecords = () => {
    if (selectedRecords.length === attendance.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(attendance.map(record => record._id));
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (attendance.length === 0) {
      setError('No data to export');
      return;
    }

    const headers = [
      'Employee ID', 'Name', 'Department', 'Date', 
      'Status', 'Clock In', 'Clock Out'
    ];
    
    const data = [
      headers.join(','),
      ...attendance.map(record => [
        record.employee?.employeeId || '',
        `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(),
        record.employee?.department || '',
        new Date(record.date).toLocaleDateString(),
        record.status,
        record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '',
        record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : ''
      ].map(field => `"${field?.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered attendance
  const filteredAttendance = attendance.filter(record => {
    // Safely handle cases where employee data might be missing
    const employeeName = record.employee 
      ? `${record.employee.firstName || ''} ${record.employee.lastName || ''}`.toLowerCase()
      : '';
    const employeeId = record.employee?.employeeId?.toLowerCase() || '';
    
    const matchesSearch = 
      employeeName.includes(searchTerm.toLowerCase()) ||
      employeeId.includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <style dangerouslySetInnerHTML={{__html: `
        .admin-attendance-select option {
          background-color: rgba(15, 23, 42, 0.95) !important;
          color: white !important;
          padding: 8px !important;
        }
        .admin-attendance-select option:hover {
          background-color: rgba(59, 130, 246, 0.2) !important;
        }
      `}} />
      <AdminHeader
        userName={user?.username}
        onLogout={handleLogout}
      />

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-300 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Overview - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatsCard
            title="Total Employees"
            value={summary.totalEmployees || 0}
            icon={<Users className="w-6 h-6 sm:w-8 sm:h-8" />}
            color="blue"
          />
          <StatsCard
            title="Present"
            value={summary.Present || 0}
            icon={<CheckCircle className="w-6 h-6 sm:w-8 sm:h-8" />}
            color="green"
          />
          <StatsCard
            title="Absent"
            value={summary.Absent || 0}
            icon={<XCircle className="w-6 h-6 sm:w-8 sm:h-8" />}
            color="red"
          />
          <StatsCard
            title="Late"
            value={summary.Late || 0}
            icon={<Clock className="w-8 h-8" />}
            color="yellow"
          />
        </div>

        {/* Tabs - Mobile Friendly */}
        <div className="flex flex-wrap gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 sm:px-4 py-2 font-medium flex items-center space-x-2 text-sm sm:text-base ${activeTab === 'daily' ? 'text-blue-300 border-b-2 border-blue-400' : 'text-blue-200/70 hover:text-blue-300'}`}
          >
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Daily View</span>
          </button>
          <button
            onClick={() => setActiveTab('range')}
            className={`px-3 sm:px-4 py-2 font-medium flex items-center space-x-2 text-sm sm:text-base ${activeTab === 'range' ? 'text-blue-300 border-b-2 border-blue-400' : 'text-blue-200/70 hover:text-blue-300'}`}
          >
            <List className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Date Range</span>
          </button>
        </div>

        {/* Date Selection - Responsive */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {activeTab === 'daily' ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <label className="text-sm text-blue-200/80 whitespace-nowrap">Select Date:</label>
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 sm:px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm sm:text-base w-full sm:w-auto"
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full lg:w-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <label className="text-sm text-blue-200/80 whitespace-nowrap">From:</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  className="bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-blue-200/80">To:</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  className="bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
              </div>
            </div>
          )}
          
          <div className="flex-1"></div>
          
          <div className="flex gap-2">
            <button
              onClick={fetchAttendanceData}
              className="px-4 py-2 bg-blue-600/50 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600/50 hover:bg-green-600 text-white rounded-lg flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-blue-200/70" />
            </div>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-blue-200/70" />
              </div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="admin-attendance-select pl-10 bg-white/5 border border-white/10 rounded-lg py-2 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-attendance-select bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>

       
        {/* Attendance Table */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {activeTab === 'daily' 
                  ? `Attendance for ${selectedDate.toLocaleDateString()}`
                  : `Attendance from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`}
              </h3>
              <div className="text-sm text-blue-200/70">
                Showing {filteredAttendance.length} of {attendance.length} records
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  {isBulkEditing && (
                    <th className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRecords.length === attendance.length && attendance.length > 0}
                        onChange={selectAllRecords}
                        className="rounded bg-white/10 border-white/20"
                      />
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Employee Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Clock In</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Clock Out</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredAttendance.length > 0 ? (
                  filteredAttendance.map((record) => (
                    <tr key={record._id} className="hover:bg-white/5">
                      {isBulkEditing && (
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRecords.includes(record._id)}
                            onChange={() => toggleRecordSelection(record._id)}
                            className="rounded bg-white/10 border-white/20"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-blue-100">
                        {record.employee?.employeeId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-100">
                        {record.employee?.department || 'Not assigned'}
                      </td>

                      <td className="px-6 py-4">
                        <select
                          value={record.status}
                          onChange={(e) => updateAttendanceRecord(record._id, { status: e.target.value })}
                          className={`admin-attendance-select bg-transparent border rounded px-2 py-1 text-xs ${getStatusColor(record.status)}`}
                        >
                          {STATUS_OPTIONS.map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-100">
                        {record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '--:--'}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-100">
                        {record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : '--:--'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              const newClockIn = prompt('Enter new clock-in time (HH:MM)', 
                                record.clockIn ? new Date(record.clockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '09:00');
                              if (newClockIn) {
                                const [hours, minutes] = newClockIn.split(':');
                                const newDate = new Date(record.date);
                                newDate.setHours(parseInt(hours), parseInt(minutes));
                                updateAttendanceRecord(record._id, { clockIn: newDate });
                              }
                            }}
                            className="p-2 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg"
                            title="Edit Clock In"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const newClockOut = prompt('Enter new clock-out time (HH:MM)', 
                                record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '17:00');
                              if (newClockOut) {
                                const [hours, minutes] = newClockOut.split(':');
                                const newDate = new Date(record.date);
                                newDate.setHours(parseInt(hours), parseInt(minutes));
                                updateAttendanceRecord(record._id, { clockOut: newDate });
                              }
                            }}
                            className="p-2 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg"
                            title="Edit Clock Out"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isBulkEditing ? 9 : 8} className="px-6 py-4 text-center text-blue-200/70">
                      {attendance.length === 0 ? 'No attendance records found' : 'No records match your filters'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

function getStatusColor(status) {
  const statusObj = STATUS_OPTIONS.find(s => s.value === status);
  if (!statusObj) return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  
  switch(statusObj.value) {
    case 'Present': return 'bg-green-500/20 text-green-300 border-green-500/30';
    case 'Absent': return 'bg-red-500/20 text-red-300 border-red-500/30';
    case 'Late': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'Half-day': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
}

export default AdminAttendance;