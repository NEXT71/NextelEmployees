import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '../../components/common/AdminHeader';
import StatsCard from '../../components/common/StatsCard';
import { FINE_TYPES, DEPARTMENTS } from '../../utils/constants';
import { authAPI, employeeAPI, fineAPI, salaryAPI } from '../../utils/api';
import { 
  Users, CheckCircle, XCircle, AlertTriangle, 
  X, UserPlus, Edit, Trash2, AlertCircle,
  Filter, Search, List, DollarSign, Clock, Calendar,
  ChevronDown, ChevronUp, User as UserIcon, Home, Phone, Mail
} from 'lucide-react';

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [fines, setFines] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('employees');
  
  // Modals
  const [showFineModal, setShowFineModal] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeFines, setEmployeeFines] = useState([]);
  const [employeeSalaries, setEmployeeSalaries] = useState([]);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fineFilter, setFineFilter] = useState('');

  // Form states
  const [fineForm, setFineForm] = useState({
    type: FINE_TYPES[0].name,
    amount: FINE_TYPES[0].amount,
    description: ''
  });

  // Employee edit form state
  const [employeeForm, setEmployeeForm] = useState({
    firstName: '',
    lastName: '',
    fatherName: '',
    email: '',
    department: 'Customer Service',
    position: '',
    employeeId: '',
    hireDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    contact: {
      phone: '',
      address: '',
      emergencyContact: ''
    }
  });

  const navigate = useNavigate();

  // Fetch all data on component mount and tab change
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current user data
        const userResponse = await authAPI.getCurrentUser();
        setUser(userResponse.data);

        // Get all employees
        const employeesResponse = await employeeAPI.getAllEmployees();
        setEmployees(employeesResponse.data);

        // Get all salaries
        const salariesResponse = await salaryAPI.getAllSalaries();
        setSalaries(salariesResponse.data);

        // Get summary stats (fallback if endpoint doesn't exist)
        try {
          const summaryResponse = await fineAPI.getAllFines(); // Using fines API as fallback
          setSummary(summaryResponse.data || {});
        } catch (summaryErr) {
          console.warn('Summary endpoint not available:', summaryErr);
          setSummary({});
        }

      } catch (err) {
        console.error("Error fetching data:", err);
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          localStorage.removeItem('token');
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate, activeTab]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('token');
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // View Employee Details
  const viewEmployeeDetails = async (employee) => {
    try {
      setLoading(true);
      
      // Get employee fines
      const finesResponse = await fineAPI.getFinesByEmployee(employee._id);
      
      // Get employee salaries
      const salariesResponse = await salaryAPI.getSalariesByEmployee(employee._id);
      
      setSelectedEmployee(employee);
      setEmployeeFines(finesResponse.data || []);
      setEmployeeSalaries(salariesResponse.data || []);
      setShowEmployeeDetails(true);
    } catch (err) {
      setError(err.message || 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const closeEmployeeDetails = () => {
    setShowEmployeeDetails(false);
    setSelectedEmployee(null);
  };

  // Fine Modal Handlers
  const openFineModal = (employee) => {
    setSelectedEmployee(employee);
    setFineForm({
      type: FINE_TYPES[0].name,
      amount: FINE_TYPES[0].amount,
      description: ''
    });
    setShowFineModal(true);
  };

  const closeFineModal = () => setShowFineModal(false);

  const handleFineTypeChange = (e) => {
    const selectedType = FINE_TYPES.find(type => type.name === e.target.value);
    setFineForm({
      ...fineForm,
      type: selectedType.name,
      amount: selectedType.amount
    });
  };

  const applyFine = async () => {
    try {
      const response = await fineAPI.createFine({
        employeeId: selectedEmployee._id,
        type: fineForm.type,
        amount: fineForm.amount,
        description: fineForm.description
      });

      if (response.success) {
        // Refresh all relevant data
        const [employeesRes, finesRes] = await Promise.all([
          employeeAPI.getAllEmployees(),
          fineAPI.getAllFines()
        ]);
        
        setEmployees(employeesRes.data);
        setFines(finesRes.data);
        setSummary({}); // Reset summary or fetch if available
        closeFineModal();
      }
    } catch (err) {
      setError(err.message || 'Failed to apply fine');
    }
  };

  // Employee CRUD Operations
  const openEditModal = (employee) => {
    setEmployeeToEdit(employee);
    setEmployeeForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      fatherName: employee.fatherName || '',
      email: employee.email,
      department: employee.department,
      position: employee.position,
      employeeId: employee.employeeId,
      hireDate: employee.hireDate || new Date().toISOString().split('T')[0],
      status: employee.status || 'Active',
      contact: employee.contact || {
        phone: '',
        address: '',
        emergencyContact: ''
      }
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEmployeeToEdit(null);
  };

  const handleEditEmployee = async () => {
    try {
      if (!employeeToEdit?._id) return;
    
      // Validate required fields
      if (!employeeForm.firstName || !employeeForm.lastName || !employeeForm.email || 
          !employeeForm.employeeId || !employeeForm.department || !employeeForm.position) {
        setError('Please fill all required fields');
        return;
      }

      const response = await employeeAPI.updateEmployee(employeeToEdit._id, employeeForm);

      if (response.success) {
        // Refresh employees list
        const employeesResponse = await employeeAPI.getAllEmployees();
        setEmployees(employeesResponse.data);
        closeEditModal();
      }
    } catch (err) {
      setError(err.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    try {
      const response = await employeeAPI.deleteEmployee(employeeId);

      if (response.success) {
        const employeesResponse = await employeeAPI.getAllEmployees();
        setEmployees(employeesResponse.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete employee');
    }
  };

  // Filter functions
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter ? employee.department === departmentFilter : true;
    const matchesStatus = statusFilter ? employee.status === statusFilter : true;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const filteredFines = fines.filter(fine => {
    if (!fine.employee) return false;
    
    const employee = employees.find(e => e._id === fine.employee);
    if (!employee) return false;
    
    const matchesEmployee = 
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = fineFilter ? fine.type === fineFilter : true;
    
    return matchesEmployee && matchesType;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      <AdminHeader
        userName={user?.username}
        onLogout={handleLogout}
      />

      <div className="container mx-auto p-6 space-y-8 relative z-10">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-300 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Employees"
            value={summary.totalEmployees || 0}
            icon={<Users className="w-8 h-8" />}
            color="blue"
          />
          <StatsCard
            title="Active Employees"
            value={summary.activeEmployees || 0}
            icon={<CheckCircle className="w-8 h-8" />}
            color="green"
          />
          <StatsCard
            title="Total Fines"
            value={summary.totalFinesCount || 0}
            icon={<AlertTriangle className="w-8 h-8" />}
            color="orange"
          />
          <StatsCard
            title="Fines Amount"
            value={`RS${summary.totalFineAmount?.toLocaleString() || '0'}`}
            icon={<DollarSign className="w-8 h-8" />}
            color="red"
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 font-medium flex items-center space-x-2 ${activeTab === 'employees' ? 'text-blue-300 border-b-2 border-blue-400' : 'text-blue-200/70 hover:text-blue-300'}`}
          >
            <Users className="w-5 h-5" />
            <span>Employees</span>
          </button>

        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-blue-200/70" />
            </div>
            <input
              type="text"
              placeholder={`Search ${activeTab === 'employees' ? 'employees' : 'fines'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>
          
          <div className="flex gap-2">
            {activeTab === 'employees' ? (
              <>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-5 w-5 text-blue-200/70" />
                  </div>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="pl-10 bg-white/5 border border-white/10 rounded-lg py-2 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
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
                  className="bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </>
            ) : (
              <select
                value={fineFilter}
                onChange={(e) => setFineFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              >
                <option value="">All Fine Types</option>
                {FINE_TYPES.map(type => (
                  <option key={type.name} value={type.name}>{type.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Employees Table */}
        {activeTab === 'employees' && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-sm"></div>
            
            <div className="relative z-10">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Employee Management
                  </h3>
                  <div className="text-sm text-blue-200/70">
                    Showing {filteredEmployees.length} of {employees.length} employees
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Last Seen</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map((employee) => (
                        <tr key={employee._id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div 
                              className="flex items-center space-x-3 cursor-pointer"
                              onClick={() => viewEmployeeDetails(employee)}
                            >
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {employee.firstName?.charAt(0) || 'U'}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {employee.firstName} {employee.lastName}
                                </div>
                                <div className="text-xs text-blue-200/70">{employee.email || 'No email'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-blue-100 font-mono">
                            {employee.employeeId || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-blue-100">
                            {employee.department || 'Not assigned'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm
                              ${employee.status === 'active' || !employee.status
                                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                              }
                            `}>
                              {employee.status || 'active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-blue-100 font-mono">
                            {employee.lastSeen || 'Never'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openEditModal(employee)}
                                className="p-2 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg transition-colors"
                                title="Edit Employee"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openFineModal(employee)}
                                className="p-2 text-orange-300 hover:text-white hover:bg-orange-500/20 rounded-lg transition-colors"
                                title="Add Fine"
                              >
                                <AlertCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(employee._id)}
                                className="p-2 text-red-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Delete Employee"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-blue-200/70">
                          No employees found matching your criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Employee Details Modal */}
      {showEmployeeDetails && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/20 sticky top-0 bg-blue-900/50 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-medium">
                    {selectedEmployee.firstName?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h2>
                  <p className="text-sm text-blue-200/80">{selectedEmployee.position} • {selectedEmployee.department}</p>
                </div>
              </div>
              <button
                onClick={closeEmployeeDetails}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-blue-200/80 mb-3">Personal Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <UserIcon className="w-4 h-4 text-blue-300/80" />
                      <div>
                        <p className="text-xs text-blue-200/70">Full Name</p>
                        <p className="text-sm text-white">
                          {selectedEmployee.firstName} {selectedEmployee.lastName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <UserIcon className="w-4 h-4 text-blue-300/80" />
                      <div>
                        <p className="text-xs text-blue-200/70">Father's Name</p>
                        <p className="text-sm text-white">
                          {selectedEmployee.fatherName || 'Not provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-blue-300/80" />
                      <div>
                        <p className="text-xs text-blue-200/70">Email</p>
                        <p className="text-sm text-white">{selectedEmployee.email || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <UserIcon className="w-4 h-4 text-blue-300/80" />
                      <div>
                        <p className="text-xs text-blue-200/70">Employee ID</p>
                        <p className="text-sm text-white">{selectedEmployee.employeeId || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-blue-200/80 mb-3">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Phone className="w-4 h-4 text-blue-300/80" />
                      <div>
                        <p className="text-xs text-blue-200/70">Phone</p>
                        <p className="text-sm text-white">
                          {selectedEmployee.contact?.phone || 'Not provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-4 h-4 text-blue-300/80" />
                      <div>
                        <p className="text-xs text-blue-200/70">Emergency Contact</p>
                        <p className="text-sm text-white">
                          {selectedEmployee.contact?.emergencyContact || 'Not provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Home className="w-4 h-4 text-blue-300/80" />
                      <div>
                        <p className="text-xs text-blue-200/70">Address</p>
                        <p className="text-sm text-white">
                          {selectedEmployee.contact?.address || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-blue-200/80 mb-3">Employment Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <UserIcon className="w-4 h-4 text-blue-300/80" />
                      <div>
                        <p className="text-xs text-blue-200/70">Department</p>
                        <p className="text-sm text-white">
                          {selectedEmployee.department || 'Not assigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <UserIcon className="w-4 h-4 text-blue-300/80" />
                      <div>
                        <p className="text-xs text-blue-200/70">Position</p>
                        <p className="text-sm text-white">
                          {selectedEmployee.position || 'Not assigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 text-blue-300/80" />
                      <div>
                        <p className="text-xs text-blue-200/70">Hire Date</p>
                        <p className="text-sm text-white">
                          {selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString() : 'Not provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-blue-300/80" />
                      <div>
                        <p className="text-xs text-blue-200/70">Status</p>
                        <p className="text-sm text-white">
                          {selectedEmployee.status || 'active'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Salary History */}
              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-sm font-medium text-blue-200/80">Salary History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Month</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Base Salary</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Bonuses</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Deductions</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Net Salary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {employeeSalaries.length > 0 ? (
                        employeeSalaries.map((salary) => (
                          <tr key={salary._id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-sm text-blue-100">
                              {new Date(salary.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-100">
                              RS{salary.baseSalary?.toLocaleString() || '0'}
                            </td>
                            <td className="px-4 py-3 text-sm text-green-300">
                              RS{salary.bonuses?.toLocaleString() || '0'}
                            </td>
                            <td className="px-4 py-3 text-sm text-red-300">
                              RS{salary.deductions?.toLocaleString() || '0'}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-white">
                              RS{(salary.baseSalary + (salary.bonuses || 0) - (salary.deductions || 0)).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-3 text-center text-blue-200/70">
                            No salary records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fine History */}
              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-sm font-medium text-blue-200/80">Fine History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {employeeFines.length > 0 ? (
                        employeeFines.map((fine) => (
                          <tr key={fine._id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-sm text-blue-100">
                              {new Date(fine.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-100">
                              {fine.type}
                            </td>
                            <td className="px-4 py-3 text-sm text-red-300 font-medium">
                              RS{fine.amount}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`
                                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${fine.approved 
                                  ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                }
                              `}>
                                {fine.approved ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-200/80">
                              {fine.description || 'No description'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-3 text-center text-blue-200/70">
                            No fine records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={closeEmployeeDetails}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && employeeToEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/20 sticky top-0 bg-blue-900/50 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Edit className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Edit Employee</h2>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                  <input
                    type="text"
                    value={employeeForm.firstName}
                    onChange={(e) => setEmployeeForm({...employeeForm, firstName: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={employeeForm.lastName}
                    onChange={(e) => setEmployeeForm({...employeeForm, lastName: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Father's Name</label>
                <input
                  type="text"
                  value={employeeForm.fatherName}
                  onChange={(e) => setEmployeeForm({...employeeForm, fatherName: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Department</label>
                <select
                  value={employeeForm.department}
                  onChange={(e) => setEmployeeForm({...employeeForm, department: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  required
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept} className="bg-gray-800">{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
                <input
                  type="text"
                  value={employeeForm.position}
                  onChange={(e) => setEmployeeForm({...employeeForm, position: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Employee ID</label>
                <input
                  type="text"
                  value={employeeForm.employeeId}
                  onChange={(e) => setEmployeeForm({...employeeForm, employeeId: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
             
              {/* Contact Information Section */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-lg font-medium text-white mb-4">Contact Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input
                    type="text"
                    value={employeeForm.contact.phone}
                    onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      contact: {
                        ...employeeForm.contact,
                        phone: e.target.value
                      }
                    })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Emergency Contact</label>
                  <input
                    type="text"
                    value={employeeForm.contact.emergencyContact}
                    onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      contact: {
                        ...employeeForm.contact,
                        emergencyContact: e.target.value
                      }
                    })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                  <textarea
                    value={employeeForm.contact.address}
                    onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      contact: {
                        ...employeeForm.contact,
                        address: e.target.value
                      }
                    })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    rows="3"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="border-t border-white/10 pt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={employeeForm.status}
                  onChange={(e) => setEmployeeForm({...employeeForm, status: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div className="flex gap-3 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={closeEditModal}
                className="flex-1 px-4 py-3 bg-transparent border border-gray-500 hover:border-gray-400 text-gray-300 hover:text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleEditEmployee}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Update Employee</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Fine Employee Modal */}
      {/* Fine Employee Modal */}
      {showFineModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-md mx-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Apply Fine</h2>
              </div>
              <button
                onClick={closeFineModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Employee</label>
                <input
                  type="text"
                  value={`${selectedEmployee.firstName} ${selectedEmployee.lastName} (${selectedEmployee.employeeId})`}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Fine Type</label>
                <select
                  value={fineForm.type}
                  onChange={handleFineTypeChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                >
                  {FINE_TYPES.map((type) => (
                    <option key={type.name} value={type.name} className="bg-gray-800">
                      {type.name} (RS{type.amount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount (RS)</label>
                <input
                  type="number"
                  value={fineForm.amount}
                  onChange={(e) => setFineForm({...fineForm, amount: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={fineForm.description}
                  onChange={(e) => setFineForm({...fineForm, description: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  rows="3"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeFineModal}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyFine}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200"
                >
                  Apply Fine
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;