import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminShell, { ADMIN_TABS } from '../../components/admin/AdminShell';
import BulkFineModal from '../../components/admin/BulkFineModal';
import GenerateSalaryModal from '../../components/admin/GenerateSalaryModal';
import BonusModal from '../../components/admin/BonusModal';
import BonusesTab from './components/BonusesTab';
import SalesRecordingModal from '../../components/admin/SalesRecordingModal';
import SalesAnalytics from '../../components/admin/SalesAnalytics';
import PendingSalesReview from '../../components/admin/PendingSalesReview';
import EmployeeDocumentsModal from '../../components/admin/EmployeeDocumentsModal';
import { formatPKR } from '../../components/employees/MonthLedger';
import Panel from '../../components/ui/Panel';
import StatGroup from '../../components/ui/StatGroup';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Dialog from '../../components/ui/Dialog';
import { Tabs } from '../../components/ui/Tabs';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { FINE_TYPES, DEPARTMENTS } from '../../utils/constants';
import { employeeAPI, fineAPI, salaryAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Pencil, UserX, Paperclip, ReceiptText, Search, Check, Trash2,
  RefreshCw, Download, Wallet, Gift, TrendingUp, Users
} from 'lucide-react';

const TAB_TITLES = {
  employees: 'Employees',
  fines: 'Fines',
  bonuses: 'Bonuses',
  salaries: 'Salaries',
  sales: 'Sales',
};

// CSRs and verifiers: the only staff admin and HR may delete permanently.
// Mirrors isFrontlineEmployee on the backend, which enforces it.
const isFrontline = (employee) => {
  const loginRole = employee.user?.role;
  if (loginRole && loginRole !== 'employee') return false;
  return employee.isCloser === true || ['Sales', 'Verifier'].includes(employee.department);
};

const employeeStatusTone = (status) => {
  const s = String(status || 'active').toLowerCase();
  if (s === 'active') return 'present';
  if (s === 'on leave') return 'late';
  return 'absent';
};

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtMonth = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';

const netOf = (salary) => (salary.baseSalary || 0) + (salary.bonuses || 0) - (salary.deductions || 0);

// Read-only label/value pair used in the employee details dialog
const Detail = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs text-muted">{label}</dt>
    <dd className="text-sm text-ink break-words">{children}</dd>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = ADMIN_TABS.includes(tabParam) ? tabParam : 'employees';

  const [employees, setEmployees] = useState([]);
  const [fines, setFines] = useState([]);
  const [salaries, setSalaries] = useState([]);
  // Backend summary still loads, but its totals include inactive employees, so the
  // figures shown are computed from active employees instead
  const [, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [salesSubTab, setSalesSubTab] = useState('pending');

  // Modals
  const [showFineModal, setShowFineModal] = useState(false);
  const [showBulkFineModal, setShowBulkFineModal] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [showGenerateSalaryModal, setShowGenerateSalaryModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showSalesRecordingModal, setShowSalesRecordingModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeFines, setEmployeeFines] = useState([]);
  const [employeeSalaries, setEmployeeSalaries] = useState([]);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [employeeForDocuments, setEmployeeForDocuments] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingEmployee, setDeletingEmployee] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  // 'active' (default, includes On Leave) | 'inactive' | 'all'
  // Admin pages show active employees only (On Leave counts as active); inactive ones are hidden
  const employeeStatusFilter = 'active';
  const [fineFilter, setFineFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [fineSearchTerm, setFineSearchTerm] = useState('');
  const [salarySearchTerm, setSalarySearchTerm] = useState('');

  // Applied filters (for fines tab)
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedMonthFilter, setAppliedMonthFilter] = useState('');
  const [appliedDateFilter, setAppliedDateFilter] = useState('');
  const [appliedEmployeeFilter, setAppliedEmployeeFilter] = useState('');
  const [appliedFineFilter, setAppliedFineFilter] = useState('');

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
    email: '',
    department: 'Sales',
    employeeId: '',
    hireDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    contact: {
      phone: '',
      address: ''
    }
  });

  // Calculate summary from current data
  const calculateSummary = useCallback((empList, fineList) => {
    const employeesCount = empList.length;
    const activeCount = empList.filter(emp => emp.status === 'Active').length;
    const totalFinesCount = fineList.length;
    const totalFineAmount = fineList.reduce((sum, fine) => sum + (fine.amount || 0), 0);
    
    setSummary({
      totalEmployees: employeesCount,
      activeEmployees: activeCount,
      totalFinesCount,
      totalFineAmount
    });
  }, []);

  // Refresh summary stats - no dependencies on employees/fines to avoid loops
  const refreshSummary = useCallback(async (empList, fineList) => {
    try {
      const summaryResponse = await fineAPI.getEmployeeSummary();
      setSummary(summaryResponse.data || {});
    } catch (summaryErr) {
      console.warn('Summary endpoint not available:', summaryErr);
      // Use provided data or fall back to current state
      calculateSummary(empList, fineList);
    }
  }, [calculateSummary]);

  // Refresh all dashboard data with cache bypass
  const refreshDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      // Get all employees (bypass cache for fresh data)
      const employeesResponse = await employeeAPI.getAllEmployees({ bypassCache: true });
      const allEmployees = employeesResponse.data || [];
      
      // Filter out the current user
      const filteredEmployees = allEmployees.filter(employee => {
        return (
          employee.email !== user?.email &&
          employee.user?._id !== user?._id &&
          employee.user?.role !== 'admin' &&
          employee.user?.username !== user?.username
        );
      });
      
      setEmployees(filteredEmployees);

      // Get all fines (bypass cache for fresh data)
      const finesResponse = await fineAPI.getAllFines({ bypassCache: true });
      setFines(finesResponse.data || []);

      // Get summary stats (bypass cache for fresh data)
      try {
        const summaryResponse = await fineAPI.getEmployeeSummary({ bypassCache: true });
        setSummary(summaryResponse.data || {});
      } catch (err) {
        calculateSummary(filteredEmployees, finesResponse.data || []);
      }

    } catch (err) {
      console.error("Error refreshing dashboard:", err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        localStorage.removeItem('token');
        navigate('/');
      } else {
        setError('Failed to refresh dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch all data on component mount and tab change
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get all employees (backend should filter out admins)
        const employeesResponse = await employeeAPI.getAllEmployees();
        const allEmployees = employeesResponse.data || [];
        
        // Additional frontend filtering to ensure admin doesn't see themselves
        const filteredEmployees = allEmployees.filter(employee => {
          return (
            // Different email
            employee.email !== user?.email &&
            // Different user ID if linked
            employee.user?._id !== user?._id &&
            // Not admin role if populated
            employee.user?.role !== 'admin' &&
            // Different username if available
            employee.user?.username !== user?.username
          );
        });
        
        setEmployees(filteredEmployees);

        // Get all fines
        const finesResponse = await fineAPI.getAllFines();
        const allFines = finesResponse.data || [];
        setFines(allFines);

        // Get all salaries
        try {
          const salariesResponse = await salaryAPI.getAllSalaries();
          setSalaries(salariesResponse.data || []);
        } catch (salaryErr) {
          console.warn('Salary data not available:', salaryErr);
          setSalaries([]);
        }

        // Get summary stats with the fetched data
        try {
          const summaryResponse = await fineAPI.getEmployeeSummary();
          setSummary(summaryResponse.data || {});
        } catch (err) {
          // Fallback: calculate from fetched data
          calculateSummary(filteredEmployees, allFines);
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
    
    if (user) {
      fetchData();
    }
  }, [activeTab, user, navigate, calculateSummary]);

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

  const closeDeleteDialog = () => {
    if (deletingEmployee) return;
    setEmployeeToDelete(null);
    setDeleteConfirmText('');
    setDeleteError('');
  };

  // Permanent delete (CSRs and verifiers only). The backend snapshots everything to the
  // audit log first, so a super admin can restore it.
  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setDeletingEmployee(true);
    setDeleteError('');
    try {
      const response = await employeeAPI.deleteEmployee(employeeToDelete._id);
      if (response?.error) throw new Error(response.message);
      setEmployees((prev) => prev.filter((e) => e._id !== employeeToDelete._id));
      setFines((prev) => prev.filter((f) => f.employee?._id !== employeeToDelete._id));
      setSalaries((prev) => prev.filter((s) => s.employee?._id !== employeeToDelete._id));
      setEmployeeToDelete(null);
      setDeleteConfirmText('');
    } catch (err) {
      setDeleteError(err.message || 'Could not delete this employee. Try again.');
    } finally {
      setDeletingEmployee(false);
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
        refreshSummary(); // Refresh summary stats
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
      email: employee.email,
      department: employee.department,
      employeeId: employee.employeeId,
      hireDate: employee.hireDate || new Date().toISOString().split('T')[0],
      status: employee.status || 'Active',
      contact: employee.contact || {
        phone: '',
        address: ''
      }
    });
    setShowEditModal(true);
  };

  const openDocumentsModal = (employee) => {
    setEmployeeForDocuments(employee);
    setShowDocumentsModal(true);
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
          !employeeForm.employeeId || !employeeForm.department) {
        setError('Please fill all required fields');
        return;
      }

      const response = await employeeAPI.updateEmployee(employeeToEdit._id, employeeForm);

      if (response.success) {
        // Refresh employees list
        const employeesResponse = await employeeAPI.getAllEmployees();
        setEmployees(employeesResponse.data);
        refreshSummary(); // Refresh summary stats
        closeEditModal();
      }
    } catch (err) {
      setError(err.message || 'Failed to update employee');
    }
  };

  // Soft removal: deactivates (or reactivates) the employee and their login; history is kept.
  const handleToggleEmployeeActive = async (employee) => {
    const deactivating = employee.status !== 'Inactive';
    const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
    const message = deactivating
      ? `Deactivate ${name}? They will be logged out and unable to sign in. Their records are kept.`
      : `Reactivate ${name}? They will be able to sign in again.`;
    if (!window.confirm(message)) return;

    try {
      const response = deactivating
        ? await employeeAPI.deactivateEmployee(employee._id)
        : await employeeAPI.activateEmployee(employee._id);

      if (response.success) {
        const employeesResponse = await employeeAPI.getAllEmployees();
        setEmployees(employeesResponse.data);
        refreshSummary(); // Refresh summary stats
      }
    } catch (err) {
      setError(err.message || `Failed to ${deactivating ? 'deactivate' : 'reactivate'} employee`);
    }
  };

  // Fine Management Functions
  const approveFine = async (fineId) => {
    try {
      const response = await fineAPI.approveFine(fineId);

      if (response.success) {
        // Refresh fines data
        const finesResponse = await fineAPI.getAllFines();
        setFines(finesResponse.data);
        refreshSummary(); // Refresh summary stats
      }
    } catch (err) {
      setError(err.message || 'Failed to approve fine');
    }
  };

  const deleteFine = async (fineId) => {
    try {
      const response = await fineAPI.deleteFine(fineId);

      if (response.success) {
        // Refresh fines data
        const finesResponse = await fineAPI.getAllFines();
        setFines(finesResponse.data);
        refreshSummary(); // Refresh summary stats
      }
    } catch (err) {
      setError(err.message || 'Failed to delete fine');
    }
  };

  // Bulk Fine Application
  const handleBulkFine = async (bulkFineData) => {
    try {
      const response = await fineAPI.applyBulkFine(bulkFineData);

      if (response.success) {
        // Refresh fines data
        const finesResponse = await fineAPI.getAllFines();
        setFines(finesResponse.data);
        refreshSummary();
        setShowBulkFineModal(false);
        alert(`Successfully applied fine to ${bulkFineData.employeeIds.length} employees`);
      }
    } catch (err) {
      setError(err.message || 'Failed to apply bulk fine');
    }
  };

  // Report Download Functions
  const convertToCSV = (data, headers) => {
    const headerRow = headers.join(',');
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );
    return [headerRow, ...rows].join('\n');
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadEmployeeReport = async () => {
    try {
      const response = await fineAPI.generateEmployeeReport();
      if (response.success && response.data) {
        const headers = ['employeeId', 'name', 'email', 'department', 'status', 'totalFines', 'totalAmount'];
        const csvContent = convertToCSV(response.data, headers);
        const filename = `employee-report-${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(csvContent, filename);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate employee report');
    }
  };

  const handleDownloadFineReport = async () => {
    try {
      const queryParams = new URLSearchParams({
        month: appliedMonthFilter || '',
        date: appliedDateFilter || '',
        employeeId: appliedEmployeeFilter || '',
        type: appliedFineFilter || ''
      }).toString();

      const response = await fineAPI.generateFineReport(queryParams);
      if (response.success && response.data) {
        const headers = ['date', 'employeeId', 'employeeName', 'type', 'description', 'amount', 'status'];
        const csvContent = convertToCSV(response.data, headers);
        const filename = `fine-report-${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(csvContent, filename);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate fine report');
    }
  };

  const handleDownloadSalaryReport = async () => {
    try {
      const response = await salaryAPI.generateSalaryReport();
      if (response.success && response.data) {
        // Map the salary data to include flattened employee name
        const formattedData = (Array.isArray(response.data) ? response.data : response.data.data || []).map(salary => ({
          employeeId: salary.employee?.employeeId || 'N/A',
          employeeName: `${salary.employee?.firstName || ''} ${salary.employee?.lastName || ''}`.trim(),
          baseSalary: salary.baseSalary || 0,
          bonuses: salary.bonuses || 0,
          deductions: salary.deductions || 0,
          netSalary: (salary.baseSalary || 0) + (salary.bonuses || 0) - (salary.deductions || 0),
          month: new Date(salary.month).toLocaleDateString('default', { month: 'short', year: 'numeric' })
        }));
        
        const headers = ['employeeId', 'employeeName', 'baseSalary', 'bonuses', 'deductions', 'netSalary', 'month'];
        const csvContent = convertToCSV(formattedData, headers);
        const filename = `salary-report-${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(csvContent, filename);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate salary report');
    }
  };

  // Clear fines filters
  const clearFinesFilters = () => {
    setFineSearchTerm('');
    setMonthFilter('');
    setDateFilter('');
    setEmployeeFilter('');
    setFineFilter('');
    setAppliedSearchTerm('');
    setAppliedMonthFilter('');
    setAppliedDateFilter('');
    setAppliedEmployeeFilter('');
    setAppliedFineFilter('');
  };
  // Employee status lookup, shared by the Employees, Fines and Salaries tabs.
  // Records for an employee missing from the list are treated as active.
  const employeeStatusById = useMemo(() => {
    const map = {};
    employees.forEach(e => { map[e._id] = String(e.status || '').toLowerCase(); });
    return map;
  }, [employees]);

  const matchesEmployeeStatus = useCallback((employeeId) => {
    if (employeeStatusFilter === 'all') return true;
    const isInactive = employeeStatusById[employeeId] === 'inactive';
    return employeeStatusFilter === 'inactive' ? isInactive : !isInactive;
  }, [employeeStatusFilter, employeeStatusById]);

  // Employees offered in pickers (bulk fine, generate salary): never inactive ones
  const activeEmployees = useMemo(
    () => employees.filter(e => String(e.status || '').toLowerCase() !== 'inactive'),
    [employees]
  );

  // Memoized filter operations for employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = 
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = departmentFilter ? employee.department === departmentFilter : true;

      return matchesSearch && matchesDepartment && matchesEmployeeStatus(employee._id);
    });
  }, [employees, searchTerm, departmentFilter, matchesEmployeeStatus]);

  // Memoized filter operations for fines
  const filteredFines = useMemo(() => {
    return fines.filter(fine => {
      if (!fine.employee) return false;
      
      const employee = employees.find(e => e._id === fine.employee._id);
      if (!employee) return false;
      if (!matchesEmployeeStatus(employee._id)) return false;

      const matchesEmployee = appliedEmployeeFilter ? fine.employee._id === appliedEmployeeFilter : true;
      const matchesType = appliedFineFilter ? fine.type === appliedFineFilter : true;
      
      // Month filter
      const matchesMonth = appliedMonthFilter ? 
        new Date(fine.date).toISOString().slice(0, 7) === appliedMonthFilter : true;
      
      // Date filter
      const matchesDate = appliedDateFilter ? 
        new Date(fine.date).toISOString().slice(0, 10) === appliedDateFilter : true;
      
      // Search filter
      const matchesSearch = appliedSearchTerm ? 
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
        employee.employeeId?.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
        fine.type.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
        fine.description?.toLowerCase().includes(appliedSearchTerm.toLowerCase()) : true;
      
      return matchesEmployee && matchesType && matchesMonth && matchesDate && matchesSearch;
    });
  }, [fines, employees, matchesEmployeeStatus, appliedEmployeeFilter, appliedFineFilter, appliedMonthFilter, appliedDateFilter, appliedSearchTerm]);

  // Group fines by employee for the grouped display (memoized)
  const groupedFines = useMemo(() => {
    return filteredFines.reduce((groups, fine) => {
      const employeeId = fine.employee._id;
      if (!groups[employeeId]) {
        groups[employeeId] = [];
      }
      groups[employeeId].push(fine);
      return groups;
    }, {});
  }, [filteredFines]);

  // Memoized filter operations for salaries
  const filteredSalaries = useMemo(() => {
    return salaries.filter(salary => {
      if (!salary.employee) return false;
      if (!matchesEmployeeStatus(salary.employee._id)) return false;

      const matchesSearch = salarySearchTerm ?
        `${salary.employee.firstName} ${salary.employee.lastName}`.toLowerCase().includes(salarySearchTerm.toLowerCase()) ||
        salary.employee.employeeId?.toLowerCase().includes(salarySearchTerm.toLowerCase()) ||
        salary.employee.email?.toLowerCase().includes(salarySearchTerm.toLowerCase()) : true;
      
      return matchesSearch;
    });
  }, [salaries, salarySearchTerm, matchesEmployeeStatus]);


  const refreshSalaries = async () => {
    try {
      const salariesResponse = await salaryAPI.getAllSalaries();
      setSalaries(salariesResponse.data || []);
    } catch (err) {
      console.error('Error refreshing salaries:', err);
    }
  };

  const applyFineFilters = () => {
    setAppliedSearchTerm(fineSearchTerm);
    setAppliedMonthFilter(monthFilter);
    setAppliedDateFilter(dateFilter);
    setAppliedEmployeeFilter(employeeFilter);
    setAppliedFineFilter(fineFilter);
  };

  const payrollTotal = filteredSalaries.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
  const bonusTotal = filteredSalaries.reduce((sum, s) => sum + (s.bonuses || 0), 0);

  // Page actions next to the title, per section
  const headerActions = {
    employees: (
      <>
        <Button variant="secondary" icon={ReceiptText} onClick={() => setShowBulkFineModal(true)}>Fine several</Button>
        <Button variant="secondary" icon={Download} onClick={handleDownloadEmployeeReport}>Report</Button>
      </>
    ),
    fines: <Button variant="secondary" icon={Download} onClick={handleDownloadFineReport}>Report</Button>,
    salaries: (
      <>
        <Button variant="secondary" icon={Download} onClick={handleDownloadSalaryReport}>Report</Button>
        <Button icon={Wallet} onClick={() => setShowGenerateSalaryModal(true)}>Generate salaries</Button>
      </>
    ),
    sales: salesSubTab === 'analytics' && (
      <Button icon={TrendingUp} onClick={() => setShowSalesRecordingModal(true)}>Record sales</Button>
    ),
    bonuses: null,
  }[activeTab];

  // Fines on active employees only, for the summary figures
  const activeFines = fines.filter((f) => f.employee && matchesEmployeeStatus(f.employee._id));

  const searchBox = (value, onChange, placeholder) => (
    <div className="relative flex-1 min-w-0 sm:min-w-[220px] w-full sm:w-auto">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
      <Input type="text" aria-label="Search" placeholder={placeholder} value={value} onChange={onChange} className="pl-9" />
    </div>
  );

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-ink">{TAB_TITLES[activeTab]}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          {['employees', 'fines'].includes(activeTab) && (
            <Button variant="ghost" size="icon" icon={RefreshCw} onClick={refreshDashboard} disabled={loading} aria-label="Refresh" title="Refresh" />
          )}
        </div>
      </div>

      <div className="space-y-6">
        {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

        {['employees', 'fines'].includes(activeTab) && (
          <StatGroup
            items={[
              { label: 'Active employees', value: activeEmployees.length },
              { label: 'Fines issued', value: activeFines.length },
              { label: 'Fines total', value: formatPKR(activeFines.reduce((sum, f) => sum + (f.amount || 0), 0)), tone: 'absent' },
            ]}
          />
        )}

        {/* ── Employees ── */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {searchBox(searchTerm, (e) => setSearchTerm(e.target.value), 'Search name, email or employee ID')}
              <Select aria-label="Department" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="sm:w-48">
                <option value="">All departments</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </Select>
            </div>

            <DataTable
              loading={loading}
              empty="No active employees match your search and filters."
              rows={filteredEmployees}
              columns={[
                {
                  key: 'name',
                  header: 'Employee',
                  render: (employee) => (
                    <button
                      type="button"
                      onClick={() => viewEmployeeDetails(employee)}
                      className="text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift"
                    >
                      <span className="font-medium text-ink hover:underline underline-offset-2">{employee.firstName} {employee.lastName}</span>
                      <span className="block text-xs text-muted">{employee.email || 'No email'}</span>
                    </button>
                  ),
                },
                { key: 'id', header: 'ID', render: (employee) => employee.employeeId || '—' },
                { key: 'dept', header: 'Department', render: (employee) => employee.department || 'Not assigned' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (employee) => <Badge tone={employeeStatusTone(employee.status)}>{employee.status || 'Active'}</Badge>,
                },
                { key: 'seen', header: 'Last seen', render: (employee) => employee.lastSeen || 'Never' },
                {
                  key: 'actions',
                  header: <span className="sr-only">Actions</span>,
                  align: 'right',
                  render: (employee) => (
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon" icon={Pencil} onClick={() => openEditModal(employee)} aria-label="Edit employee" title="Edit employee" />
                      <Button variant="ghost" size="icon" icon={ReceiptText} onClick={() => openFineModal(employee)} aria-label="Add fine" title="Add fine" />
                      <Button variant="ghost" size="icon" icon={Paperclip} onClick={() => openDocumentsModal(employee)} aria-label="Documents" title="Documents" />
                      <Button
                        variant="ghost"
                        size="icon"
                        icon={UserX}
                        onClick={() => handleToggleEmployeeActive(employee)}
                        aria-label="Deactivate employee"
                        title="Deactivate employee"
                        className="hover:text-absent"
                      />
                      {isFrontline(employee) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          icon={Trash2}
                          onClick={() => setEmployeeToDelete(employee)}
                          aria-label="Delete employee permanently"
                          title="Delete permanently"
                          className="hover:text-absent"
                        />
                      )}
                    </div>
                  ),
                },
              ]}
            />
            {!loading && (
              <p className="text-sm text-muted">Showing {filteredEmployees.length} of {activeEmployees.length} active employees</p>
            )}
          </div>
        )}

        {/* ── Fines ── */}
        {activeTab === 'fines' && (
          <div className="space-y-4">
            <Panel className="p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Search" htmlFor="fine-search" className="sm:col-span-2 lg:col-span-1">
                  <Input id="fine-search" type="text" placeholder="Employee, type or description" value={fineSearchTerm} onChange={(e) => setFineSearchTerm(e.target.value)} />
                </Field>
                <Field label="Employee" htmlFor="fine-employee">
                  <Select id="fine-employee" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
                    <option value="">All employees</option>
                    {employees.filter(employee => matchesEmployeeStatus(employee._id)).map(employee => (
                      <option key={employee._id} value={employee._id}>
                        {employee.firstName} {employee.lastName} ({employee.employeeId})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Month" htmlFor="fine-month">
                  <Input id="fine-month" type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
                </Field>
                <Field label="Day" htmlFor="fine-date">
                  <Input id="fine-date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                </Field>
                <Field label="Fine type" htmlFor="fine-type">
                  <Select id="fine-type" value={fineFilter} onChange={(e) => setFineFilter(e.target.value)}>
                    <option value="">All fine types</option>
                    {FINE_TYPES.map(type => (
                      <option key={type.name} value={type.name}>{type.name}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" size="sm" onClick={clearFinesFilters}>Clear</Button>
                <Button size="sm" icon={Search} onClick={applyFineFilters}>Apply filters</Button>
              </div>
            </Panel>

            <p className="text-sm text-muted">
              {filteredFines.length} {filteredFines.length === 1 ? 'fine' : 'fines'} across {Object.keys(groupedFines).length} {Object.keys(groupedFines).length === 1 ? 'employee' : 'employees'}
            </p>

            {loading ? (
              <Panel><p className="px-5 py-8 text-sm text-muted">Loading fines…</p></Panel>
            ) : Object.keys(groupedFines).length === 0 ? (
              <Panel><p className="px-5 py-8 text-sm text-muted">No fines match these filters.</p></Panel>
            ) : (
              Object.entries(groupedFines).map(([employeeId, finesForEmployee]) => {
                const employee = finesForEmployee[0].employee;
                const totalAmount = finesForEmployee.reduce((sum, fine) => sum + (fine.amount || 0), 0);
                const approvedCount = finesForEmployee.filter(fine => fine.approved).length;
                const pendingCount = finesForEmployee.length - approvedCount;

                return (
                  <Panel key={employeeId} className="overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-line bg-paper">
                      <div>
                        <p className="text-sm font-semibold text-ink">{employee.firstName} {employee.lastName}</p>
                        <p className="text-xs text-muted">
                          {employee.employeeId || 'No ID'}, {employee.department || 'no department'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-absent tabular-nums">{formatPKR(totalAmount)}</p>
                        <p className="text-xs text-muted">{approvedCount} approved, {pendingCount} pending</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm tabular-nums whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-line text-left">
                            {['Date', 'Type', 'Amount', 'Status', 'Description', ''].map((h, i) => (
                              <th key={h || 'actions'} scope="col" className={`${i === 0 ? 'pl-5' : ''} px-3 py-2.5 text-xs font-medium text-muted ${i === 2 ? 'text-right' : ''}`}>
                                {h || <span className="sr-only">Actions</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {finesForEmployee.map((fine) => (
                            <tr key={fine._id}>
                              <td className="pl-5 px-3 py-2.5 text-ink">{fmtDate(fine.date)}</td>
                              <td className="px-3 py-2.5 text-ink">{fine.type}</td>
                              <td className="px-3 py-2.5 text-ink text-right">{formatPKR(fine.amount)}</td>
                              <td className="px-3 py-2.5">
                                <Badge tone={fine.approved ? 'absent' : 'late'}>{fine.approved ? 'Approved' : 'Pending'}</Badge>
                              </td>
                              <td className="px-3 py-2.5 text-muted max-w-xs truncate" title={fine.description || ''}>
                                {fine.description || 'No description'}
                              </td>
                              <td className="px-3 py-2.5 pr-5">
                                <div className="flex items-center justify-end gap-1">
                                  {!fine.approved && (
                                    <Button variant="secondary" size="sm" icon={Check} onClick={() => approveFine(fine._id)}>Approve</Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    icon={Trash2}
                                    onClick={() => deleteFine(fine._id)}
                                    aria-label="Delete fine"
                                    title="Delete fine"
                                    className="hover:text-absent"
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                );
              })
            )}
          </div>
        )}

        {/* ── Bonuses ── */}
        {activeTab === 'bonuses' && <BonusesTab />}

        {/* ── Salaries ── */}
        {activeTab === 'salaries' && (
          <div className="space-y-4">
            <StatGroup
              items={[
                { label: 'Base payroll', value: formatPKR(payrollTotal) },
                { label: 'Average base salary', value: formatPKR(filteredSalaries.length > 0 ? Math.round(payrollTotal / filteredSalaries.length) : 0) },
                { label: 'Bonuses paid', value: formatPKR(bonusTotal), tone: 'present' },
                { label: 'Salary records', value: filteredSalaries.length },
              ]}
            />
            <div className="flex flex-wrap gap-3">
              {searchBox(salarySearchTerm, (e) => setSalarySearchTerm(e.target.value), 'Search name, email or employee ID')}
            </div>
            <DataTable
              loading={loading}
              empty="No salary records yet. Use Generate salaries to create this month's."
              rows={filteredSalaries}
              columns={[
                {
                  key: 'employee',
                  header: 'Employee',
                  render: (salary) => (
                    <>
                      <span className="font-medium">{salary.employee?.firstName} {salary.employee?.lastName}</span>
                      <span className="block text-xs text-muted">{salary.employee?.employeeId || 'No ID'}</span>
                    </>
                  ),
                },
                { key: 'month', header: 'Month', render: (salary) => fmtMonth(salary.month) },
                { key: 'base', header: 'Base', align: 'right', render: (salary) => formatPKR(salary.baseSalary) },
                { key: 'bonus', header: 'Bonuses', align: 'right', render: (salary) => <span className={salary.bonuses ? 'text-present' : ''}>{formatPKR(salary.bonuses)}</span> },
                { key: 'deduct', header: 'Deductions', align: 'right', render: (salary) => <span className={salary.deductions ? 'text-absent' : ''}>{formatPKR(salary.deductions)}</span> },
                { key: 'net', header: 'Net', align: 'right', render: (salary) => <span className="font-semibold">{formatPKR(netOf(salary))}</span> },
                {
                  key: 'actions',
                  header: <span className="sr-only">Actions</span>,
                  align: 'right',
                  render: (salary) => (
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        icon={Gift}
                        onClick={() => {
                          setSelectedSalary(salary);
                          setShowBonusModal(true);
                        }}
                        aria-label="Add bonus"
                        title="Add bonus"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        icon={Users}
                        onClick={() => salary.employee && viewEmployeeDetails(salary.employee)}
                        aria-label="Employee details"
                        title="Employee details"
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}

        {/* ── Sales ── */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <Tabs
              value={salesSubTab}
              onChange={setSalesSubTab}
              items={[
                { key: 'pending', label: 'Pending review' },
                { key: 'analytics', label: 'Analytics' },
              ]}
            />
            {salesSubTab === 'analytics' ? <SalesAnalytics /> : <PendingSalesReview />}
          </div>
        )}
      </div>

      {/* Employee Details */}
      <Dialog
        open={showEmployeeDetails && !!selectedEmployee}
        onClose={closeEmployeeDetails}
        size="max-w-4xl"
        title={selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : ''}
        description={selectedEmployee?.department || 'No department'}
        footer={<Button variant="secondary" onClick={closeEmployeeDetails}>Close</Button>}
      >
        {selectedEmployee && (
          <div className="space-y-6">
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <Detail label="Employee ID">{selectedEmployee.employeeId || '—'}</Detail>
              <Detail label="Email">{selectedEmployee.email || 'Not provided'}</Detail>
              <Detail label="Phone">{selectedEmployee.contact?.phone || 'Not provided'}</Detail>
              <Detail label="Status">
                <Badge tone={employeeStatusTone(selectedEmployee.status)}>{selectedEmployee.status || 'Active'}</Badge>
              </Detail>
              <Detail label="Department">{selectedEmployee.department || 'Not assigned'}</Detail>
              <Detail label="Hired">{fmtDate(selectedEmployee.hireDate)}</Detail>
              <div className="col-span-2">
                <Detail label="Address">{selectedEmployee.contact?.address || 'Not provided'}</Detail>
              </div>
            </dl>

            <div>
              <h3 className="text-base font-semibold text-ink mb-2">Salary history</h3>
              <DataTable
                empty="No salary records yet."
                rows={employeeSalaries}
                columns={[
                  { key: 'month', header: 'Month', render: (s) => fmtMonth(s.month) },
                  { key: 'base', header: 'Base', align: 'right', render: (s) => formatPKR(s.baseSalary) },
                  { key: 'bonus', header: 'Bonuses', align: 'right', render: (s) => formatPKR(s.bonuses) },
                  { key: 'deduct', header: 'Deductions', align: 'right', render: (s) => formatPKR(s.deductions) },
                  { key: 'net', header: 'Net', align: 'right', render: (s) => <span className="font-semibold">{formatPKR(netOf(s))}</span> },
                ]}
              />
            </div>

            <div>
              <h3 className="text-base font-semibold text-ink mb-2">Fines</h3>
              <DataTable
                empty="No fines on record."
                rows={employeeFines}
                columns={[
                  { key: 'date', header: 'Date', render: (f) => fmtDate(f.date) },
                  { key: 'type', header: 'Type', render: (f) => f.type },
                  { key: 'amount', header: 'Amount', align: 'right', render: (f) => formatPKR(f.amount) },
                  { key: 'status', header: 'Status', render: (f) => <Badge tone={f.approved ? 'absent' : 'late'}>{f.approved ? 'Approved' : 'Pending'}</Badge> },
                  { key: 'desc', header: 'Description', render: (f) => <span className="text-muted">{f.description || 'No description'}</span> },
                ]}
              />
            </div>
          </div>
        )}
      </Dialog>

      {/* Edit Employee */}
      <Dialog
        open={showEditModal && !!employeeToEdit}
        onClose={closeEditModal}
        size="max-w-lg"
        title="Edit employee"
        footer={
          <>
            <Button variant="secondary" onClick={closeEditModal}>Cancel</Button>
            <Button icon={Check} onClick={handleEditEmployee}>Save changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name" htmlFor="edit-first">
              <Input id="edit-first" type="text" value={employeeForm.firstName} onChange={(e) => setEmployeeForm({ ...employeeForm, firstName: e.target.value })} required />
            </Field>
            <Field label="Last name" htmlFor="edit-last">
              <Input id="edit-last" type="text" value={employeeForm.lastName} onChange={(e) => setEmployeeForm({ ...employeeForm, lastName: e.target.value })} required />
            </Field>
          </div>
          <Field label="Email" htmlFor="edit-email">
            <Input id="edit-email" type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Department" htmlFor="edit-dept">
              <Select id="edit-dept" value={employeeForm.department} onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })} required>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </Select>
            </Field>
            <Field label="Employee ID" htmlFor="edit-id">
              <Input id="edit-id" type="text" value={employeeForm.employeeId} onChange={(e) => setEmployeeForm({ ...employeeForm, employeeId: e.target.value })} />
            </Field>
          </div>
          <Field label="Phone" htmlFor="edit-phone">
            <Input
              id="edit-phone"
              type="text"
              value={employeeForm.contact.phone}
              onChange={(e) => setEmployeeForm({ ...employeeForm, contact: { ...employeeForm.contact, phone: e.target.value } })}
            />
          </Field>
          <Field label="Address" htmlFor="edit-address">
            <Textarea
              id="edit-address"
              rows={2}
              value={employeeForm.contact.address}
              onChange={(e) => setEmployeeForm({ ...employeeForm, contact: { ...employeeForm.contact, address: e.target.value } })}
            />
          </Field>
          <Field label="Status" htmlFor="edit-status">
            <Select id="edit-status" value={employeeForm.status} onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On leave</option>
            </Select>
          </Field>
        </div>
      </Dialog>

      {/* Add Fine */}
      <Dialog
        open={showFineModal && !!selectedEmployee}
        onClose={closeFineModal}
        size="max-w-md"
        title="Add fine"
        description={selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} (${selectedEmployee.employeeId})` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={closeFineModal}>Cancel</Button>
            <Button variant="danger" icon={ReceiptText} onClick={applyFine}>Add fine</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Fine type" htmlFor="fine-modal-type">
            <Select id="fine-modal-type" value={fineForm.type} onChange={handleFineTypeChange}>
              {FINE_TYPES.map((type) => (
                <option key={type.name} value={type.name}>
                  {type.name} ({formatPKR(type.amount)})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount (PKR)" htmlFor="fine-modal-amount">
            <Input id="fine-modal-amount" type="number" value={fineForm.amount} onChange={(e) => setFineForm({ ...fineForm, amount: e.target.value })} required />
          </Field>
          <Field label="Description" htmlFor="fine-modal-desc" hint="The employee sees this next to the fine.">
            <Textarea id="fine-modal-desc" rows={3} value={fineForm.description} onChange={(e) => setFineForm({ ...fineForm, description: e.target.value })} />
          </Field>
        </div>
      </Dialog>

      {/* Delete Employee (permanent) */}
      <Dialog
        open={!!employeeToDelete}
        onClose={closeDeleteDialog}
        size="max-w-md"
        title={employeeToDelete ? `Delete ${employeeToDelete.firstName} ${employeeToDelete.lastName}?` : ''}
        description="This permanently removes the employee, their login, and all their salaries, sales, fines and attendance."
        footer={
          <>
            <Button variant="secondary" onClick={closeDeleteDialog} disabled={deletingEmployee}>Cancel</Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={handleDeleteEmployee}
              disabled={deletingEmployee || deleteConfirmText.trim() !== (employeeToDelete?.employeeId || '')}
            >
              {deletingEmployee ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </>
        }
      >
        {employeeToDelete && (
          <div className="space-y-4">
            {deleteError && <Alert>{deleteError}</Alert>}
            <p className="text-sm text-ink">
              If they might come back, <strong className="font-semibold">deactivate</strong> them instead. That keeps their records
              and blocks sign-in. Only a super admin can restore a deleted employee.
            </p>
            <Field label={`Type ${employeeToDelete.employeeId} to confirm`} htmlFor="delete-confirm">
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                autoComplete="off"
                autoFocus
              />
            </Field>
          </div>
        )}
      </Dialog>

      {/* Bulk Fine Modal */}
      <BulkFineModal
        isOpen={showBulkFineModal}
        onClose={() => setShowBulkFineModal(false)}
        employees={activeEmployees}
        onApply={handleBulkFine}
      />

      {/* Employee Documents Modal */}
      <EmployeeDocumentsModal
        isOpen={showDocumentsModal}
        employee={employeeForDocuments}
        onClose={() => {
          setShowDocumentsModal(false);
          setEmployeeForDocuments(null);
        }}
      />

      {/* Sales Recording Modal */}
      <SalesRecordingModal
        isOpen={showSalesRecordingModal}
        onClose={() => setShowSalesRecordingModal(false)}
        onSuccess={() => {
          // Refresh is handled by the analytics component via API
          setShowSalesRecordingModal(false);
        }}
      />

      {/* Generate Salary Modal */}
      <GenerateSalaryModal
        isOpen={showGenerateSalaryModal}
        onClose={() => setShowGenerateSalaryModal(false)}
        onSuccess={refreshSalaries}
        employees={activeEmployees}
      />

      {/* Bonus Modal */}
      <BonusModal
        isOpen={showBonusModal}
        onClose={() => {
          setShowBonusModal(false);
          setSelectedSalary(null);
        }}
        onSuccess={refreshSalaries}
        salary={selectedSalary}
      />
    </AdminShell>
  );
};

export default AdminDashboard;
