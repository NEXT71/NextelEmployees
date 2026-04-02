import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '../../components/common/AdminHeader';
import StatsCard from '../../components/common/StatsCard';
import AdminMessageCenter from '../../components/admin/AdminMessageCenter';
import EmployeesTab from './components/EmployeesTab';
import FinesTab from './components/FinesTab';
import SalariesTab from './components/SalariesTab';
import SalesTab from './components/SalesTab';
import { 
  Users, CheckCircle, AlertTriangle, DollarSign, TrendingUp, RefreshCw 
} from 'lucide-react';
import { employeeAPI, fineAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';

// ✅ OPTIMIZATION: Refactored AdminDashboard - split into tab components
const AdminDashboard = memo(() => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Main dashboard state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('employees');
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalFinesCount: 0,
    totalFineAmount: 0
  });
  const [showMessageCenter, setShowMessageCenter] = useState(false);

  // Fetch dashboard summary on mount
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const [employeesRes, finesRes] = await Promise.all([
          employeeAPI.getAllEmployees({ bypassCache: true }),
          fineAPI.getAllFines({ bypassCache: true })
        ]);

        const employees = employeesRes.data || [];
        const fines = finesRes.data || [];
        const filteredEmp = employees.filter(e => e.email !== user?.email && e.user?._id !== user?._id);

        setSummary({
          totalEmployees: filteredEmp.length,
          activeEmployees: filteredEmp.filter(e => e.status === 'Active').length,
          totalFinesCount: fines.length,
          totalFineAmount: fines.reduce((sum, f) => sum + (f.amount || 0), 0)
        });
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSummary();
    }
  }, [user]);

  const handleLogout = useCallback(async () => {
    try {
      await authAPI.logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, [navigate]);

  const refreshDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [employeesRes, finesRes] = await Promise.all([
        employeeAPI.getAllEmployees({ bypassCache: true }),
        fineAPI.getAllFines({ bypassCache: true })
      ]);

      const employees = employeesRes.data || [];
      const fines = finesRes.data || [];
      const filteredEmp = employees.filter(e => e.email !== user?.email && e.user?._id !== user?._id);

      setSummary({
        totalEmployees: filteredEmp.length,
        activeEmployees: filteredEmp.filter(e => e.status === 'Active').length,
        totalFinesCount: fines.length,
        totalFineAmount: fines.reduce((sum, f) => sum + (f.amount || 0), 0)
      });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  if (loading && !Object.keys(summary).length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <AdminHeader userName={user?.username} onLogout={handleLogout} />

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 relative z-10">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-300 hover:text-white">✕</button>
          </div>
        )}

        {/* Dashboard Header with Refresh */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            Dashboard Overview
          </h2>
          <button
            onClick={refreshDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatsCard
            title="Total Employees"
            value={summary.totalEmployees || 0}
            icon={<Users className="w-6 h-6 sm:w-8 sm:h-8" />}
            color="blue"
          />
          <StatsCard
            title="Active Employees"
            value={summary.activeEmployees || 0}
            icon={<CheckCircle className="w-6 h-6 sm:w-8 sm:h-8" />}
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
            value={`RS${(summary.totalFineAmount || 0).toLocaleString()}`}
            icon={<DollarSign className="w-8 h-8" />}
            color="red"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-white/10 pb-0 overflow-x-auto">
          {[
            { id: 'employees', label: 'Employees', icon: Users },
            { id: 'fines', label: 'Fines', icon: AlertTriangle },
            { id: 'salaries', label: 'Salaries', icon: DollarSign },
            { id: 'sales', label: 'Sales', icon: TrendingUp }
          ].map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium flex items-center space-x-2 text-sm whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'text-blue-300 border-b-2 border-blue-400' 
                    : 'text-blue-200/70 hover:text-blue-300'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Message Center Toggle */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowMessageCenter(!showMessageCenter)}
            className="text-blue-300 hover:text-blue-200 text-sm px-3 py-2 hover:bg-white/5 rounded-lg"
          >
            {showMessageCenter ? 'Hide' : 'Show'} Messages
          </button>
        </div>

        {/* Message Center */}
        {showMessageCenter && (
          <AdminMessageCenter />
        )}

        {/* Tab Content - Only active tab renders */}
        <div>
          {activeTab === 'employees' && <EmployeesTab user={user} onRefresh={refreshDashboard} />}
          {activeTab === 'fines' && <FinesTab user={user} onRefresh={refreshDashboard} />}
          {activeTab === 'salaries' && <SalariesTab user={user} onRefresh={refreshDashboard} />}
          {activeTab === 'sales' && <SalesTab onRefresh={refreshDashboard} />}
        </div>
      </div>
    </div>
  );
});

AdminDashboard.displayName = 'AdminDashboard';

export default AdminDashboard;
