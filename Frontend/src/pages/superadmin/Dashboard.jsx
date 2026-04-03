import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../utils/constants';
import {
  Users, Shield, TrendingUp, DollarSign, Clock, CheckCircle,
  LogOut, RefreshCw,
  User as UserIcon, BarChart2, FileText, Award, X,
  AlertTriangle, ToggleLeft, ToggleRight, Eye
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const apiFetch = async (path) => {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const fmtCurrency = (n) =>
  typeof n === 'number' ? `RS ${n.toLocaleString()}` : 'RS 0';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// ─── StatsCard ───────────────────────────────────────────────────────────────
const StatsCard = ({ icon: Icon, label, value, color }) => (
  <div className={`bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 flex items-center gap-4`}>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-white/60 text-sm">{label}</p>
      <p className="text-white text-xl font-bold">{value}</p>
    </div>
  </div>
);

// ─── Badge ───────────────────────────────────────────────────────────────────
const Badge = ({ text, color }) => {
  const colors = {
    superadmin: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    employee: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    active: 'bg-green-500/20 text-green-300 border-green-500/30',
    inactive: 'bg-red-500/20 text-red-300 border-red-500/30',
    approved: 'bg-green-500/20 text-green-300 border-green-500/30',
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color] || colors.employee}`}>
      {text}
    </span>
  );
};

// ─── CSR Detail Modal ─────────────────────────────────────────────────────────
const CSRDetailModal = ({ employee, onClose }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('sales');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch(`/superadmin/employees/${employee._id}/full-history`);
        setHistory(data.data);
      } catch (e) {
        setError('Failed to load history.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [employee._id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/20 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <UserIcon size={24} className="text-purple-300" />
            </div>
            <div>
              <h2 className="text-white text-xl font-bold">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-white/50 text-sm">
                {employee.employeeId} · {employee.department} · Hired {fmtDate(employee.hireDate)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
          {['sales', 'salary'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 capitalize ${
                tab === t
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              {t === 'sales' ? 'Sales History' : 'Salary History'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-40">
              <RefreshCw size={30} className="text-purple-400 animate-spin" />
            </div>
          )}
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 text-red-300 text-center">
              {error}
            </div>
          )}

          {/* Sales History Tab */}
          {!loading && !error && tab === 'sales' && (
            <div>
              {history?.salesByMonth?.length === 0 ? (
                <p className="text-white/50 text-center py-8">No sales records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/50 border-b border-white/10">
                        <th className="text-left py-3 px-3">Month</th>
                        <th className="text-center py-3 px-3">Approved</th>
                        <th className="text-center py-3 px-3">Pending</th>
                        <th className="text-center py-3 px-3">Rejected</th>
                        <th className="text-right py-3 px-3">Base Earnings</th>
                        <th className="text-right py-3 px-3">Tier Bonus</th>
                        <th className="text-right py-3 px-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history?.salesByMonth?.map((row) => (
                        <tr key={row.month} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-3 text-white font-medium">{row.month}</td>
                          <td className="py-3 px-3 text-center">
                            <Badge text={row.approved} color="approved" />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge text={row.pending} color="pending" />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge text={row.disapproved} color="rejected" />
                          </td>
                          <td className="py-3 px-3 text-right text-white/80">{fmtCurrency(row.earnings)}</td>
                          <td className="py-3 px-3 text-right text-yellow-300">{fmtCurrency(row.tierBonus)}</td>
                          <td className="py-3 px-3 text-right text-green-300 font-semibold">{fmtCurrency(row.totalEarnings)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-white/5">
                      <tr>
                        <td colSpan={4} className="py-3 px-3 text-white/60 text-sm">All-time totals</td>
                        <td className="py-3 px-3 text-right text-white font-semibold">
                          {fmtCurrency(history?.salesByMonth?.reduce((s, r) => s + (r.earnings || 0), 0))}
                        </td>
                        <td className="py-3 px-3 text-right text-yellow-300 font-semibold">
                          {fmtCurrency(history?.salesByMonth?.reduce((s, r) => s + (r.tierBonus || 0), 0))}
                        </td>
                        <td className="py-3 px-3 text-right text-green-300 font-bold">
                          {fmtCurrency(history?.salesByMonth?.reduce((s, r) => s + (r.totalEarnings || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Salary History Tab */}
          {!loading && !error && tab === 'salary' && (
            <div>
              {history?.salaryHistory?.length === 0 ? (
                <p className="text-white/50 text-center py-8">No salary records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/50 border-b border-white/10">
                        <th className="text-left py-3 px-3">Month</th>
                        <th className="text-right py-3 px-3">Base Salary</th>
                        <th className="text-right py-3 px-3">Bonuses</th>
                        <th className="text-right py-3 px-3">Deductions</th>
                        <th className="text-right py-3 px-3">Net Pay</th>
                        <th className="text-left py-3 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history?.salaryHistory?.map((s) => (
                        <tr key={s._id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-3 text-white font-medium">{fmtDate(s.month)}</td>
                          <td className="py-3 px-3 text-right text-white/80">{fmtCurrency(s.baseSalary)}</td>
                          <td className="py-3 px-3 text-right text-green-300">{fmtCurrency(s.bonuses)}</td>
                          <td className="py-3 px-3 text-right text-red-300">{fmtCurrency(s.deductions)}</td>
                          <td className="py-3 px-3 text-right text-white font-bold">{fmtCurrency((s.baseSalary || 0) + (s.bonuses || 0) - (s.deductions || 0))}</td>
                          <td className="py-3 px-3 text-white/50 text-xs max-w-xs truncate">{s.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [sales, setSales] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [salesFilter, setSalesFilter] = useState('all');
  const [togglingUser, setTogglingUser] = useState(null);

  // load data for active tab
  const load = useCallback(async (tab) => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'overview') {
        const d = await apiFetch('/superadmin/stats');
        setStats(d.data);
      } else if (tab === 'users') {
        const d = await apiFetch('/superadmin/users');
        setUsers(d.data || []);
      } else if (tab === 'employees') {
        const d = await apiFetch('/superadmin/employees');
        setEmployees(d.data || []);
      } else if (tab === 'sales') {
        const d = await apiFetch(`/superadmin/sales?status=${salesFilter}&limit=100`);
        setSales(d.data || []);
      } else if (tab === 'salaries') {
        const d = await apiFetch('/superadmin/salaries?limit=100');
        setSalaries(d.data || []);
      }
    } catch (e) {
      setError('Failed to load data. ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [salesFilter]);

  useEffect(() => {
    load(activeTab);
  }, [activeTab, load]);

  const handleToggleUser = async (userId) => {
    setTogglingUser(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/users/${userId}/toggle-active`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to toggle user.');
        return;
      }
      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isActive: data.data?.isActive ?? !u.isActive } : u))
      );
    } catch {
      alert('Network error.');
    } finally {
      setTogglingUser(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const TABS = [
    { key: 'overview', label: 'Overview', icon: BarChart2 },
    { key: 'users', label: 'Users', icon: Shield },
    { key: 'employees', label: 'Employees', icon: Users },
    { key: 'sales', label: 'Sales', icon: TrendingUp },
    { key: 'salaries', label: 'Salaries', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Shield size={20} className="text-yellow-300" />
            </div>
            <div>
              <span className="text-white font-bold text-lg">Super Admin</span>
              <span className="text-white/40 text-xs ml-2">Nextel Employees</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm hidden sm:block">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm transition-colors"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto py-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/40 rounded-xl p-4 flex items-center gap-3 text-red-300">
            <AlertTriangle size={18} />
            {error}
            <button onClick={() => load(activeTab)} className="ml-auto text-sm underline">Retry</button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-48">
            <RefreshCw size={32} className="text-purple-400 animate-spin" />
          </div>
        )}

        {/* ── Overview ── */}
        {!loading && activeTab === 'overview' && stats && (
          <div>
            <h2 className="text-white text-2xl font-bold mb-6">System Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard icon={Users} label="Total Users" value={stats.totalUsers ?? 0} color="bg-blue-500/40" />
              <StatsCard icon={Shield} label="Admins" value={stats.totalAdmins ?? 0} color="bg-purple-500/40" />
              <StatsCard icon={UserIcon} label="Employees" value={stats.totalEmployees ?? 0} color="bg-indigo-500/40" />
              <StatsCard icon={Clock} label="Pending Sales" value={stats.pendingSales ?? 0} color="bg-yellow-500/40" />
              <StatsCard icon={CheckCircle} label="Approved Sales" value={stats.approvedSales ?? 0} color="bg-green-500/40" />
              <StatsCard icon={FileText} label="Total Sales" value={stats.totalSales ?? 0} color="bg-cyan-500/40" />
              <StatsCard icon={Award} label="Salary Records" value={stats.totalSalaryRecords ?? 0} color="bg-pink-500/40" />
              <StatsCard icon={DollarSign} label="Total Paid Out" value={fmtCurrency(stats.totalEarningsPaid)} color="bg-emerald-500/40" />
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {!loading && activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-2xl font-bold">All Users</h2>
              <button onClick={() => load('users')} className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/10 rounded-lg transition-colors">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="text-left py-3 px-4">Username</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-center py-3 px-4">Role</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-center py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white font-medium">{u.username}</td>
                        <td className="py-3 px-4 text-white/70">{u.email}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge text={u.role} color={u.role} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            text={u.isActive !== false ? 'Active' : 'Inactive'}
                            color={u.isActive !== false ? 'active' : 'inactive'}
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.role !== 'superadmin' ? (
                            <button
                              disabled={togglingUser === u._id}
                              onClick={() => handleToggleUser(u._id)}
                              className={`flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                u.isActive !== false
                                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                                  : 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
                              }`}
                            >
                              {togglingUser === u._id ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : u.isActive !== false ? (
                                <ToggleRight size={12} />
                              ) : (
                                <ToggleLeft size={12} />
                              )}
                              {u.isActive !== false ? 'Deactivate' : 'Activate'}
                            </button>
                          ) : (
                            <span className="text-white/30 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-white/40">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Employees ── */}
        {!loading && activeTab === 'employees' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-2xl font-bold">All Employees</h2>
              <button onClick={() => load('employees')} className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/10 rounded-lg transition-colors">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Employee ID</th>
                      <th className="text-left py-3 px-4">Department</th>
                      <th className="text-left py-3 px-4">Hire Date</th>
                      <th className="text-center py-3 px-4">History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp._id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white font-medium">{emp.firstName} {emp.lastName}</td>
                        <td className="py-3 px-4 text-white/70">{emp.employeeId}</td>
                        <td className="py-3 px-4 text-white/70">{emp.department}</td>
                        <td className="py-3 px-4 text-white/70">{fmtDate(emp.hireDate)}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            className="flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-colors"
                          >
                            <Eye size={12} />
                            View History
                          </button>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-white/40">No employees found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Sales ── */}
        {!loading && activeTab === 'sales' && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-white text-2xl font-bold">All Sales Submissions</h2>
              <div className="flex items-center gap-2">
                <select
                  value={salesFilter}
                  onChange={(e) => setSalesFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all" className="bg-slate-800">All</option>
                  <option value="pending" className="bg-slate-800">Pending</option>
                  <option value="approved" className="bg-slate-800">Approved</option>
                  <option value="rejected" className="bg-slate-800">Rejected</option>
                </select>
                <button onClick={() => load('sales')} className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/10 rounded-lg transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="text-left py-3 px-4">Employee</th>
                      <th className="text-left py-3 px-4">Customer</th>
                      <th className="text-left py-3 px-4">DIDs</th>
                      <th className="text-left py-3 px-4">Closer</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => (
                      <tr key={s._id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white">
                          {s.agentName || (s.agent?.firstName ? `${s.agent.firstName} ${s.agent.lastName}` : '—')}
                        </td>
                        <td className="py-3 px-4 text-white/70">
                          {s.customer?.firstName ? `${s.customer.firstName} ${s.customer.lastName}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-white/70">{s.dids || '—'}</td>
                        <td className="py-3 px-4 text-white/70">{s.closer || '—'}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge text={s.status} color={s.status} />
                        </td>
                        <td className="py-3 px-4 text-white/50">{fmtDate(s.submittedAt || s.createdAt)}</td>
                      </tr>
                    ))}
                    {sales.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-white/40">No sales found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Salaries ── */}
        {!loading && activeTab === 'salaries' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-2xl font-bold">All Salary Records</h2>
              <button onClick={() => load('salaries')} className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/10 rounded-lg transition-colors">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="text-left py-3 px-4">Employee</th>
                      <th className="text-left py-3 px-4">Month</th>
                      <th className="text-right py-3 px-4">Base Salary</th>
                      <th className="text-right py-3 px-4">Sales Bonus</th>
                      <th className="text-right py-3 px-4">Deductions</th>
                      <th className="text-right py-3 px-4">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaries.map((s) => (
                      <tr key={s._id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white">
                          {s.employee?.firstName
                            ? `${s.employee.firstName} ${s.employee.lastName}`
                            : s.employeeId || '—'}
                        </td>
                        <td className="py-3 px-4 text-white/70">{s.month}</td>
                        <td className="py-3 px-4 text-right text-white/80">{fmtCurrency(s.baseSalary)}</td>
                        <td className="py-3 px-4 text-right text-green-300">{fmtCurrency(s.bonuses)}</td>
                        <td className="py-3 px-4 text-right text-red-300">{fmtCurrency(s.deductions)}</td>
                        <td className="py-3 px-4 text-right text-white font-bold">
                          {fmtCurrency(s.netPay ?? ((s.baseSalary || 0) + (s.bonuses || 0) - (s.deductions || 0)))}
                        </td>
                      </tr>
                    ))}
                    {salaries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-white/40">No salary records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CSR Detail Modal */}
      {selectedEmployee && (
        <CSRDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
};

export default SuperAdminDashboard;
