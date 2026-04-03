import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { salesTargetAPI } from '../../utils/api';
import {
  CheckCircle,
  Clock,
  DollarSign,
  Trophy,
  RefreshCw,
  LogOut,
  TrendingUp,
  User,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtCurrency = (n) =>
  typeof n === 'number' ? `RS ${n.toLocaleString()}` : '—';

const StatusBadge = ({ status }) => {
  const map = {
    approved: 'bg-green-500/20 text-green-300 border-green-500/30',
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    disapproved: 'bg-red-500/20 text-red-300 border-red-500/30'
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${map[status] || 'bg-white/10 text-white/60 border-white/20'}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

const CloserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [closes, setCloses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, closesRes] = await Promise.all([
        salesTargetAPI.getMyClosesStats(),
        salesTargetAPI.getMyCloses({ status: statusFilter, limit: 200 })
      ]);
      if (statsRes?.data) setStats(statsRes.data);
      if (closesRes?.data) setCloses(closesRes.data);
    } catch (e) {
      setError('Failed to load data: ' + (e.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayedCloses = showAll ? closes : closes.slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950">
      {/* Header */}
      <header className="bg-white/5 border-b border-white/10 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">
                {user?.firstName || user?.username || 'Verifier'}
              </h1>
              <p className="text-teal-300 text-xs">Verifier Dashboard</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-600/50 rounded-xl p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* This month closes */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-teal-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle size={18} className="text-teal-400" />
                  </div>
                  <span className="text-white/60 text-xs uppercase tracking-wider">This Month</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats?.approvedThisMonth ?? '—'}</p>
                <p className="text-white/40 text-xs mt-1">Approved Closes</p>
              </div>

              {/* This month earnings */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <DollarSign size={18} className="text-green-400" />
                  </div>
                  <span className="text-white/60 text-xs uppercase tracking-wider">Earned</span>
                </div>
                <p className="text-3xl font-bold text-white">{fmtCurrency(stats?.earningsThisMonth)}</p>
                <p className="text-white/40 text-xs mt-1">This Month</p>
              </div>

              {/* Rank */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <Trophy size={18} className="text-yellow-400" />
                  </div>
                  <span className="text-white/60 text-xs uppercase tracking-wider">Rank</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {stats?.rank ? `#${stats.rank}` : '—'}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  of {stats?.totalVerifiers || '—'} verifiers
                </p>
              </div>

              {/* All time closes */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp size={18} className="text-purple-400" />
                  </div>
                  <span className="text-white/60 text-xs uppercase tracking-wider">All Time</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats?.approvedAllTime ?? '—'}</p>
                <p className="text-white/40 text-xs mt-1">{fmtCurrency(stats?.earningsAllTime)} earned</p>
              </div>
            </div>

            {/* Pay info banner */}
            <div className="bg-gradient-to-r from-teal-800/40 to-cyan-800/40 border border-teal-500/30 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <DollarSign size={24} className="text-teal-300" />
              </div>
              <div>
                <p className="text-teal-200 font-semibold text-sm">Commission Rate</p>
                <p className="text-white text-2xl font-bold">RS 100 <span className="text-white/50 text-sm font-normal">per approved close</span></p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-white/50 text-xs">This month's total</p>
                <p className="text-2xl font-bold text-green-300">{fmtCurrency(stats?.earningsThisMonth)}</p>
              </div>
            </div>

            {/* Closes table */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-wrap gap-3">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  <Calendar size={18} className="text-teal-400" />
                  My Closes
                </h2>
                <div className="flex items-center gap-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all" className="bg-slate-800">All</option>
                    <option value="approved" className="bg-slate-800">Approved</option>
                    <option value="pending" className="bg-slate-800">Pending</option>
                    <option value="disapproved" className="bg-slate-800">Disapproved</option>
                  </select>
                  <button
                    onClick={loadData}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/10 rounded-lg transition-colors"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="text-left py-3 px-4">Customer</th>
                      <th className="text-left py-3 px-4">CSR Agent</th>
                      <th className="text-left py-3 px-4">DIDs</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Your Pay</th>
                      <th className="text-left py-3 px-4">Sale Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedCloses.map((row) => (
                      <tr key={row._id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white font-medium">
                          {row.customer?.firstName
                            ? `${row.customer.firstName} ${row.customer.lastName}`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-white/60">{row.agentName || '—'}</td>
                        <td className="py-3 px-4 text-white/60">{row.dids || '—'}</td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {row.status === 'approved'
                            ? <span className="text-green-300">RS 100</span>
                            : <span className="text-white/30">—</span>}
                        </td>
                        <td className="py-3 px-4 text-white/50">{fmtDate(row.saleDate)}</td>
                      </tr>
                    ))}
                    {closes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-white/40">
                          No closes found{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {closes.length > 10 && (
                <div className="px-5 py-3 border-t border-white/10 flex justify-center">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="flex items-center gap-2 text-teal-400 hover:text-teal-300 text-sm font-medium transition-colors"
                  >
                    {showAll ? (
                      <><ChevronUp size={16} /> Show less</>
                    ) : (
                      <><ChevronDown size={16} /> Show all {closes.length} closes</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default CloserDashboard;
