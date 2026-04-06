import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../utils/constants';
import {
  Users, Shield, TrendingUp, DollarSign, Clock, CheckCircle,
  LogOut, RefreshCw,
  User as UserIcon, BarChart2, FileText, Award, X,
  AlertTriangle, ToggleLeft, ToggleRight, Eye, Trash2
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
const StatsCard = memo(({ icon: Icon, label, value, color }) => (
  <div className={`bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 flex items-center gap-4`}>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-white/60 text-sm">{label}</p>
      <p className="text-white text-xl font-bold">{value}</p>
    </div>
  </div>
));

// ─── Badge ───────────────────────────────────────────────────────────────────
const BADGE_COLORS = {
  superadmin: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  employee: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  inactive: 'bg-red-500/20 text-red-300 border-red-500/30',
  approved: 'bg-green-500/20 text-green-300 border-green-500/30',
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const Badge = memo(({ text, color }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${BADGE_COLORS[color] || BADGE_COLORS.employee}`}>
    {text}
  </span>
));

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

// ─── Tab config (module-scope constant – never recreated) ────────────────────
const TABS = [
  { key: 'overview',   label: 'Overview',   icon: BarChart2 },
  { key: 'users',      label: 'Users',      icon: Shield },
  { key: 'employees',  label: 'Employees',  icon: Users },
  { key: 'sales',      label: 'Sales',      icon: TrendingUp },
  { key: 'salaries',   label: 'Salaries',   icon: DollarSign },
  { key: 'fines',      label: 'Fines',      icon: AlertTriangle },
  { key: 'attendance', label: 'Attendance', icon: Clock },
  { key: 'messages',   label: 'Messages',   icon: FileText },
];

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [sales, setSales] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [topPerformer, setTopPerformer] = useState(null);
  const [closerLeaderboard, setCloserLeaderboard] = useState([]);
  const [topCloser, setTopCloser] = useState(null);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [salesFilter, setSalesFilter] = useState('all');
  const [salesView, setSalesView] = useState('leaderboard'); // 'leaderboard' | 'all'
  const [togglingUser, setTogglingUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedSaleIds, setSelectedSaleIds] = useState(new Set());
  const [selectedSalaryIds, setSelectedSalaryIds] = useState(new Set());
  const [selectedEmpIds, setSelectedEmpIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── Fines / Attendance / Messages state ───────────────────────────────────
  const [fines, setFines] = useState([]);
  const [finesFilter, setFinesFilter] = useState('all'); // 'all' | 'pending' | 'approved'
  const [attendance, setAttendance] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [messages, setMessages] = useState([]);
  const [messageReplyId, setMessageReplyId] = useState(null);
  const [messageReplyText, setMessageReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Refs for filter values so `load` stays stable ──────────────────────────
  const salesFilterRef = useRef(salesFilter);
  salesFilterRef.current = salesFilter;
  const finesFilterRef = useRef(finesFilter);
  finesFilterRef.current = finesFilter;
  const attendanceDateRef = useRef(attendanceDate);
  attendanceDateRef.current = attendanceDate;

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
        const [lb, clb, all] = await Promise.all([
          apiFetch('/superadmin/sales/leaderboard'),
          apiFetch('/superadmin/sales/closer-leaderboard'),
          apiFetch(`/superadmin/sales?status=${salesFilterRef.current}&limit=100`)
        ]);
        setLeaderboard(lb.data || []);
        setTopPerformer(lb.topPerformer || null);
        setCloserLeaderboard(clb.data || []);
        setTopCloser(clb.topCloser || null);
        setSales(all.data || []);
      } else if (tab === 'salaries') {
        const d = await apiFetch('/superadmin/salaries?limit=100');
        setSalaries(d.data || []);
      } else if (tab === 'fines') {
        const q = finesFilterRef.current !== 'all' ? `?status=${finesFilterRef.current}` : '';
        const d = await apiFetch(`/superadmin/fines${q}`);
        setFines(d.data || []);
      } else if (tab === 'attendance') {
        const d = await apiFetch(`/superadmin/attendance?date=${attendanceDateRef.current}`);
        setAttendance(d.data || []);
      } else if (tab === 'messages') {
        const d = await apiFetch('/superadmin/messages');
        setMessages(d.data || []);
      }
    } catch (e) {
      setError('Failed to load data. ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []); // stable – reads filter values via refs

  // Re-fetch sales when filter dropdown changes (only if on sales tab)
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  useEffect(() => {
    if (activeTabRef.current === 'sales') load('sales');
  }, [salesFilter, load]);

  useEffect(() => {
    if (activeTabRef.current === 'fines') load('fines');
  }, [finesFilter, load]);

  useEffect(() => {
    if (activeTabRef.current === 'attendance') load('attendance');
  }, [attendanceDate, load]);

  useEffect(() => {
    load(activeTab);
  }, [activeTab, load]);

  const toggleSelect = useCallback((setter, id) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((items, setter) => {
    setter(prev =>
      prev.size === items.length ? new Set() : new Set(items.map(i => i._id))
    );
  }, []);

  const handleBulkDelete = useCallback(async (type, ids, all) => {
    const label = all ? 'ALL' : `${ids.size} selected`;
    const entityLabel = { sales: 'sale', salaries: 'salary record', employees: 'employee' }[type];
    if (!window.confirm(`Permanently delete ${label} ${entityLabel}(s)? This cannot be undone.`)) return;
    if (all && !window.confirm(`⚠️ FINAL WARNING: This will delete every ${entityLabel} record in the database. Are you absolutely sure?`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/${type}/bulk`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify(all ? { all: true } : { ids: [...ids] }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Bulk delete failed.');
        return;
      }
      await load(activeTabRef.current);
      if (type === 'sales') setSelectedSaleIds(new Set());
      if (type === 'salaries') setSelectedSalaryIds(new Set());
      if (type === 'employees') setSelectedEmpIds(new Set());
    } catch {
      alert('Network error.');
    } finally {
      setBulkDeleting(false);
    }
  }, [load]);

  const handleDeleteEmployee = useCallback(async (id) => {
    if (!window.confirm('Permanently delete this employee and all their associated records? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/employees/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to delete employee.');
        return;
      }
      setEmployees(prev => prev.filter(e => e._id !== id));
      setSelectedEmpIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch {
      alert('Network error.');
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleToggleUser = useCallback(async (userId) => {
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
  }, []);

  const handleDeleteSale = useCallback(async (id) => {
    if (!window.confirm('Permanently delete this sale record? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/sales/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to delete sale.');
        return;
      }
      setSales((prev) => prev.filter((s) => s._id !== id));
    } catch {
      alert('Network error.');
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleDeleteSalary = useCallback(async (id) => {
    if (!window.confirm('Permanently delete this salary record? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/salaries/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to delete salary record.');
        return;
      }
      setSalaries((prev) => prev.filter((s) => s._id !== id));
    } catch {
      alert('Network error.');
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

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
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-white text-2xl font-bold">All Employees</h2>
                {selectedEmpIds.size > 0 && (
                  <p className="text-white/50 text-sm mt-1">{selectedEmpIds.size} selected</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedEmpIds.size > 0 && (
                  <button
                    disabled={bulkDeleting}
                    onClick={() => handleBulkDelete('employees', selectedEmpIds, false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {bulkDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete Selected ({selectedEmpIds.size})
                  </button>
                )}
                <button
                  disabled={bulkDeleting || employees.length === 0}
                  onClick={() => handleBulkDelete('employees', null, true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600/30 hover:bg-red-600/40 text-red-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} /> Delete All
                </button>
                <button onClick={() => load('employees')} className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/10 rounded-lg transition-colors">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="w-10 py-3 px-4">
                        <input
                          type="checkbox"
                          checked={employees.length > 0 && selectedEmpIds.size === employees.length}
                          onChange={() => toggleSelectAll(employees, setSelectedEmpIds)}
                          className="rounded border-white/30 bg-white/10 accent-purple-500 cursor-pointer"
                        />
                      </th>
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Employee ID</th>
                      <th className="text-left py-3 px-4">Department</th>
                      <th className="text-left py-3 px-4">Hire Date</th>
                      <th className="text-center py-3 px-4">History</th>
                      <th className="text-center py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp._id} className={`border-b border-white/5 hover:bg-white/5 ${selectedEmpIds.has(emp._id) ? 'bg-purple-500/5' : ''}`}>
                        <td className="w-10 py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedEmpIds.has(emp._id)}
                            onChange={() => toggleSelect(setSelectedEmpIds, emp._id)}
                            className="rounded border-white/30 bg-white/10 accent-purple-500 cursor-pointer"
                          />
                        </td>
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
                        <td className="py-3 px-4 text-center">
                          <button
                            disabled={deletingId === emp._id || bulkDeleting}
                            onClick={() => handleDeleteEmployee(emp._id)}
                            className="flex items-center gap-1 mx-auto px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors disabled:opacity-50"
                          >
                            {deletingId === emp._id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-white/40">No employees found.</td>
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
          <div className="space-y-6">
            {/* Top Performer card */}
            {topPerformer && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="p-3 bg-yellow-500/30 rounded-xl">
                  <Award size={28} className="text-yellow-300" />
                </div>
                <div className="flex-1">
                  <p className="text-yellow-300 text-xs font-semibold uppercase tracking-widest mb-1">Top Performer</p>
                  <p className="text-white text-2xl font-bold">{topPerformer.agentName}</p>
                  <p className="text-white/50 text-sm">{topPerformer.employeeId} · {topPerformer.department}</p>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-300">{topPerformer.approvedSales}</p>
                    <p className="text-white/50 text-xs mt-1">Approved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-white">{fmtCurrency(topPerformer.totalEarnings)}</p>
                    <p className="text-white/50 text-xs mt-1">Earned</p>
                  </div>
                </div>
              </div>
            )}

            {/* View toggle + filter */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setSalesView('leaderboard')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${salesView === 'leaderboard' ? 'bg-purple-500/40 text-purple-200' : 'text-white/50 hover:text-white/80'}`}
                >
                  CSR Leaderboard
                </button>
                <button
                  onClick={() => setSalesView('verifier')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${salesView === 'verifier' ? 'bg-teal-500/40 text-teal-200' : 'text-white/50 hover:text-white/80'}`}
                >
                  Verifier Board
                </button>
                <button
                  onClick={() => setSalesView('all')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${salesView === 'all' ? 'bg-purple-500/40 text-purple-200' : 'text-white/50 hover:text-white/80'}`}
                >
                  All Submissions
                </button>
              </div>
              <div className="flex items-center gap-2">
                {salesView === 'all' && (
                  <>
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
                    {selectedSaleIds.size > 0 && (
                      <button
                        disabled={bulkDeleting}
                        onClick={() => handleBulkDelete('sales', selectedSaleIds, false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {bulkDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        Delete ({selectedSaleIds.size})
                      </button>
                    )}
                    <button
                      disabled={bulkDeleting || sales.length === 0}
                      onClick={() => handleBulkDelete('sales', null, true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600/30 hover:bg-red-600/40 text-red-300 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={13} /> Delete All
                    </button>
                  </>
                )}
                <button onClick={() => load('sales')} className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/10 rounded-lg transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Leaderboard view */}
            {salesView === 'leaderboard' && (
              <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/50 border-b border-white/10">
                        <th className="text-center py-3 px-4 w-12">Rank</th>
                        <th className="text-left py-3 px-4">CSR Name</th>
                        <th className="text-left py-3 px-4">Employee ID</th>
                        <th className="text-left py-3 px-4">Department</th>
                        <th className="text-center py-3 px-4">Approved</th>
                        <th className="text-center py-3 px-4">Pending</th>
                        <th className="text-right py-3 px-4">Total Earned</th>
                        <th className="text-left py-3 px-4">Last Sale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((row) => (
                        <tr key={String(row.agentId)} className={`border-b border-white/5 hover:bg-white/5 ${row.rank === 1 ? 'bg-yellow-500/5' : ''}`}>
                          <td className="py-3 px-4 text-center">
                            {row.rank === 1 ? (
                              <span className="text-yellow-300 font-bold text-base">🥇</span>
                            ) : row.rank === 2 ? (
                              <span className="text-gray-300 font-bold">🥈</span>
                            ) : row.rank === 3 ? (
                              <span className="text-orange-400 font-bold">🥉</span>
                            ) : (
                              <span className="text-white/40">{row.rank}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-white font-medium">{row.agentName}</td>
                          <td className="py-3 px-4 text-white/60">{row.employeeId}</td>
                          <td className="py-3 px-4 text-white/60">{row.department}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full text-xs font-bold">{row.approvedSales}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-2 py-0.5 rounded-full text-xs font-bold">{row.pendingSales}</span>
                          </td>
                          <td className="py-3 px-4 text-right text-green-300 font-semibold">{fmtCurrency(row.totalEarnings)}</td>
                          <td className="py-3 px-4 text-white/50">{fmtDate(row.lastSaleDate)}</td>
                        </tr>
                      ))}
                      {leaderboard.length === 0 && (
                        <tr><td colSpan={8} className="py-10 text-center text-white/40">No approved sales yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Verifier Board view */}
            {salesView === 'verifier' && (
              <div>
                {topCloser && (
                  <div className="mb-4 bg-gradient-to-r from-teal-800/60 to-cyan-800/60 border border-teal-500/30 rounded-2xl p-5 flex items-center gap-5">
                    <div className="text-4xl">🏆</div>
                    <div className="flex-1">
                      <p className="text-teal-300 text-xs font-semibold uppercase tracking-widest mb-1">Top Verifier</p>
                      <p className="text-white text-2xl font-bold">{topCloser.closerName}</p>
                      <p className="text-white/50 text-sm">{topCloser.employeeId}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-300">{topCloser.approvedCloses}</p>
                      <p className="text-white/50 text-xs mt-1">Closes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-white">{fmtCurrency(topCloser.totalEarnings)}</p>
                      <p className="text-white/50 text-xs mt-1">Earned</p>
                    </div>
                  </div>
                )}
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-white/50 border-b border-white/10">
                          <th className="text-center py-3 px-4 w-12">Rank</th>
                          <th className="text-left py-3 px-4">Verifier Name</th>
                          <th className="text-left py-3 px-4">Employee ID</th>
                          <th className="text-center py-3 px-4">Closes</th>
                          <th className="text-right py-3 px-4">Earned (RS)</th>
                          <th className="text-left py-3 px-4">Last Close</th>
                        </tr>
                      </thead>
                      <tbody>
                        {closerLeaderboard.map((row) => (
                          <tr key={String(row.closerId)} className={`border-b border-white/5 hover:bg-white/5 ${row.rank === 1 ? 'bg-teal-500/5' : ''}`}>
                            <td className="py-3 px-4 text-center">
                              {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : <span className="text-white/40">{row.rank}</span>}
                            </td>
                            <td className="py-3 px-4 text-white font-medium">{row.closerName}</td>
                            <td className="py-3 px-4 text-white/60">{row.employeeId}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full text-xs font-bold">{row.approvedCloses}</span>
                            </td>
                            <td className="py-3 px-4 text-right text-green-300 font-semibold">{fmtCurrency(row.totalEarnings)}</td>
                            <td className="py-3 px-4 text-white/50">{fmtDate(row.lastCloseDate)}</td>
                          </tr>
                        ))}
                        {closerLeaderboard.length === 0 && (
                          <tr><td colSpan={6} className="py-10 text-center text-white/40">No verifier data yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* All submissions view */}
            {salesView === 'all' && (
              <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/50 border-b border-white/10">
                        <th className="w-10 py-3 px-4">
                          <input
                            type="checkbox"
                            checked={sales.length > 0 && selectedSaleIds.size === sales.length}
                            onChange={() => toggleSelectAll(sales, setSelectedSaleIds)}
                            className="rounded border-white/30 bg-white/10 accent-purple-500 cursor-pointer"
                          />
                        </th>
                        <th className="text-left py-3 px-4">Employee</th>
                        <th className="text-left py-3 px-4">Customer</th>
                        <th className="text-left py-3 px-4">Phone</th>
                        <th className="text-left py-3 px-4">DIDs</th>
                        <th className="text-left py-3 px-4">Closer</th>
                        <th className="text-center py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-center py-3 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((s) => (
                        <tr key={s._id} className={`border-b border-white/5 hover:bg-white/5 ${selectedSaleIds.has(s._id) ? 'bg-purple-500/5' : ''}`}>
                          <td className="w-10 py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedSaleIds.has(s._id)}
                              onChange={() => toggleSelect(setSelectedSaleIds, s._id)}
                              className="rounded border-white/30 bg-white/10 accent-purple-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-white">
                            {s.agentName || (s.agent?.firstName ? `${s.agent.firstName} ${s.agent.lastName}` : '—')}
                          </td>
                          <td className="py-3 px-4 text-white/70">
                            {s.customer?.firstName ? `${s.customer.firstName} ${s.customer.lastName}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-white/70">{s.customer?.phone || '—'}</td>
                          <td className="py-3 px-4 text-white/70">{s.dids || '—'}</td>
                          <td className="py-3 px-4 text-white/70">{s.closer || '—'}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge text={s.status} color={s.status} />
                          </td>
                          <td className="py-3 px-4 text-white/50">{fmtDate(s.submittedAt || s.createdAt)}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              disabled={deletingId === s._id || bulkDeleting}
                              onClick={() => handleDeleteSale(s._id)}
                              className="flex items-center gap-1 mx-auto px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors disabled:opacity-50"
                            >
                              {deletingId === s._id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {sales.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-white/40">No sales found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Salaries ── */}
        {!loading && activeTab === 'salaries' && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-white text-2xl font-bold">All Salary Records</h2>
                {selectedSalaryIds.size > 0 && (
                  <p className="text-white/50 text-sm mt-1">{selectedSalaryIds.size} selected</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedSalaryIds.size > 0 && (
                  <button
                    disabled={bulkDeleting}
                    onClick={() => handleBulkDelete('salaries', selectedSalaryIds, false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {bulkDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete Selected ({selectedSalaryIds.size})
                  </button>
                )}
                <button
                  disabled={bulkDeleting || salaries.length === 0}
                  onClick={() => handleBulkDelete('salaries', null, true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600/30 hover:bg-red-600/40 text-red-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} /> Delete All
                </button>
                <button onClick={() => load('salaries')} className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/10 rounded-lg transition-colors">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="w-10 py-3 px-4">
                        <input
                          type="checkbox"
                          checked={salaries.length > 0 && selectedSalaryIds.size === salaries.length}
                          onChange={() => toggleSelectAll(salaries, setSelectedSalaryIds)}
                          className="rounded border-white/30 bg-white/10 accent-purple-500 cursor-pointer"
                        />
                      </th>
                      <th className="text-left py-3 px-4">Employee</th>
                      <th className="text-left py-3 px-4">Month</th>
                      <th className="text-right py-3 px-4">Base Salary</th>
                      <th className="text-right py-3 px-4">Sales Bonus</th>
                      <th className="text-right py-3 px-4">Deductions</th>
                      <th className="text-right py-3 px-4">Net Pay</th>
                      <th className="text-center py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaries.map((s) => (
                      <tr key={s._id} className={`border-b border-white/5 hover:bg-white/5 ${selectedSalaryIds.has(s._id) ? 'bg-purple-500/5' : ''}`}>
                        <td className="w-10 py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedSalaryIds.has(s._id)}
                            onChange={() => toggleSelect(setSelectedSalaryIds, s._id)}
                            className="rounded border-white/30 bg-white/10 accent-purple-500 cursor-pointer"
                          />
                        </td>
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
                        <td className="py-3 px-4 text-center">
                          <button
                            disabled={deletingId === s._id || bulkDeleting}
                            onClick={() => handleDeleteSalary(s._id)}
                            className="flex items-center gap-1 mx-auto px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors disabled:opacity-50"
                          >
                            {deletingId === s._id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {salaries.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-white/40">No salary records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Fines ── */}
        {!loading && activeTab === 'fines' && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-white text-2xl font-bold">All Fines</h2>
              <div className="flex items-center gap-2">
                <select
                  value={finesFilter}
                  onChange={e => setFinesFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all" className="bg-slate-800">All</option>
                  <option value="pending" className="bg-slate-800">Pending</option>
                  <option value="approved" className="bg-slate-800">Approved</option>
                </select>
                <button onClick={() => load('fines')} className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/10 rounded-lg transition-colors">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="text-left py-3 px-4">Employee</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-center py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fines.map(f => (
                      <tr key={f._id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white font-medium">
                          {f.employee ? `${f.employee.firstName} ${f.employee.lastName}` : '—'}
                          <span className="block text-white/40 text-xs">{f.employee?.employeeId}</span>
                        </td>
                        <td className="py-3 px-4 text-white/70">{f.type}</td>
                        <td className="py-3 px-4 text-right text-red-300 font-semibold">RS {f.amount?.toLocaleString()}</td>
                        <td className="py-3 px-4 text-white/60">{fmtDate(f.date)}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge text={f.approved ? 'Approved' : 'Pending'} color={f.approved ? 'approved' : 'pending'} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {!f.approved && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`${API_BASE_URL}/superadmin/fines/${f._id}/approve`, { method: 'PATCH', headers: authHeaders() });
                                    if (!res.ok) throw new Error();
                                    setFines(prev => prev.map(x => x._id === f._id ? { ...x, approved: true } : x));
                                  } catch { alert('Failed to approve fine.'); }
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (!window.confirm('Delete this fine?')) return;
                                try {
                                  const res = await fetch(`${API_BASE_URL}/superadmin/fines/${f._id}`, { method: 'DELETE', headers: authHeaders() });
                                  if (!res.ok) throw new Error();
                                  setFines(prev => prev.filter(x => x._id !== f._id));
                                } catch { alert('Failed to delete fine.'); }
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {fines.length === 0 && (
                      <tr><td colSpan={6} className="py-10 text-center text-white/40">No fines found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Attendance ── */}
        {!loading && activeTab === 'attendance' && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-white text-2xl font-bold">Attendance</h2>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button onClick={() => load('attendance')} className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/10 rounded-lg transition-colors">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="text-left py-3 px-4">Employee</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Clock In</th>
                      <th className="text-left py-3 px-4">Clock Out</th>
                      <th className="text-left py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map(a => (
                      <tr key={a._id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white font-medium">
                          {a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : '—'}
                          <span className="block text-white/40 text-xs">{a.employee?.employeeId}</span>
                        </td>
                        <td className="py-3 px-4 text-white/60">{fmtDate(a.date)}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            text={a.status}
                            color={a.status === 'Present' ? 'active' : a.status === 'Absent' ? 'inactive' : 'pending'}
                          />
                        </td>
                        <td className="py-3 px-4 text-white/60">
                          {a.clockIn ? new Date(a.clockIn).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-3 px-4 text-white/60">
                          {a.clockOut ? new Date(a.clockOut).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-3 px-4 text-white/50 text-xs">{a.notes || '—'}</td>
                      </tr>
                    ))}
                    {attendance.length === 0 && (
                      <tr><td colSpan={6} className="py-10 text-center text-white/40">No attendance records for this date.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        {!loading && activeTab === 'messages' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-2xl font-bold">Messages / Support</h2>
              <button onClick={() => load('messages')} className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/10 rounded-lg transition-colors">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <div className="space-y-3">
              {messages.map(m => (
                <div key={m._id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-white font-semibold">{m.subject}</p>
                      <p className="text-white/50 text-xs mt-0.5">{m.from?.username} · {m.category} · {fmtDate(m.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        text={m.priority}
                        color={m.priority === 'urgent' ? 'rejected' : m.priority === 'high' ? 'pending' : 'employee'}
                      />
                      <Badge
                        text={m.status}
                        color={m.status === 'resolved' ? 'approved' : m.status === 'responded' ? 'active' : 'pending'}
                      />
                    </div>
                  </div>
                  <p className="text-white/70 text-sm mt-3">{m.message}</p>
                  {m.adminResponse?.message && (
                    <div className="mt-3 pl-3 border-l-2 border-purple-500/40">
                      <p className="text-purple-300 text-xs font-semibold mb-1">Admin Response</p>
                      <p className="text-white/60 text-sm">{m.adminResponse.message}</p>
                    </div>
                  )}
                  {m.status !== 'resolved' && (
                    <div className="mt-4 flex flex-col gap-2">
                      {messageReplyId === m._id ? (
                        <div className="flex gap-2">
                          <input
                            value={messageReplyText}
                            onChange={e => setMessageReplyText(e.target.value)}
                            placeholder="Type your reply…"
                            className="flex-1 bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            disabled={submitting || !messageReplyText.trim()}
                            onClick={async () => {
                              setSubmitting(true);
                              try {
                                const res = await fetch(`${API_BASE_URL}/superadmin/messages/${m._id}/respond`, {
                                  method: 'PATCH',
                                  headers: authHeaders(),
                                  body: JSON.stringify({ message: messageReplyText }),
                                });
                                if (!res.ok) throw new Error();
                                setMessages(prev => prev.map(x => x._id === m._id ? { ...x, status: 'responded', adminResponse: { message: messageReplyText } } : x));
                                setMessageReplyId(null);
                                setMessageReplyText('');
                              } catch { alert('Failed to send reply.'); }
                              finally { setSubmitting(false); }
                            }}
                            className="px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 text-purple-200 rounded-lg text-sm transition-colors disabled:opacity-50"
                          >
                            {submitting ? <RefreshCw size={14} className="animate-spin" /> : 'Send'}
                          </button>
                          <button onClick={() => { setMessageReplyId(null); setMessageReplyText(''); }} className="px-3 py-2 bg-white/10 text-white/60 rounded-lg text-sm">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setMessageReplyId(m._id)}
                            className="px-3 py-1.5 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors"
                          >
                            Reply
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`${API_BASE_URL}/superadmin/messages/${m._id}/resolve`, { method: 'PATCH', headers: authHeaders() });
                                if (!res.ok) throw new Error();
                                setMessages(prev => prev.map(x => x._id === m._id ? { ...x, status: 'resolved' } : x));
                              } catch { alert('Failed to resolve message.'); }
                            }}
                            className="px-3 py-1.5 text-sm bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center py-16 text-white/40">No messages found.</div>
              )}
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
