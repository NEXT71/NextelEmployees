import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../utils/constants';
import {
  CheckCircle, XCircle, Clock, RefreshCw, LogOut, AlertCircle,
  ChevronDown, ChevronUp, ClipboardList, Search, Download
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: authHeaders(),
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// ─── status badge ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-300 border-green-500/30',
  disapproved: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const StatusBadge = memo(({ status }) => {
  const label = status === 'disapproved' ? 'rejected' : status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>
      {status === 'pending' && <Clock size={10} className="mr-1" />}
      {status === 'approved' && <CheckCircle size={10} className="mr-1" />}
      {status === 'disapproved' && <XCircle size={10} className="mr-1" />}
      {label}
    </span>
  );
});

// ─── Rejection Modal ─────────────────────────────────────────────────────────
const RejectModal = memo(({ onConfirm, onCancel, isBulk, count }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/20 w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <XCircle size={20} className="text-red-400" />
          </div>
          <h3 className="text-white text-lg font-semibold">
            {isBulk ? `Reject ${count} Submission${count !== 1 ? 's' : ''}` : 'Reject Submission'}
          </h3>
        </div>
        <p className="text-white/60 text-sm mb-4">
          Optionally provide a reason for rejection. The agent will see this.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection (optional)..."
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
          rows={3}
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            <XCircle size={14} />
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── Submission Row ───────────────────────────────────────────────────────────
const SubmissionRow = memo(({ sub, selected, onToggle, onApprove, onReject, expandedId, onToggleExpand, reviewNote, onReviewNoteChange, shouldFocusReview }) => {
  const isExpanded = expandedId === sub._id;
  const canAct = sub.status === 'pending';
  const reviewRef = useRef(null);

  useEffect(() => {
    if (shouldFocusReview && isExpanded && reviewRef.current) {
      reviewRef.current.focus();
    }
  }, [shouldFocusReview, isExpanded]);

  const agentName = sub.agentName?.trim() || 'Unknown';
  const customerName = sub.customer
    ? `${sub.customer.firstName || ''} ${sub.customer.lastName || ''}`.trim() || '—'
    : '—';
  const amount = sub.pricePerSale ?? sub.baseSalary ?? sub.totalEarning;

  return (
    <>
      <tr className={`border-b border-white/10 hover:bg-white/5 transition-colors ${selected ? 'bg-white/10' : ''}`}>
        <td className="px-4 py-3">
          {canAct && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(sub._id)}
              className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 cursor-pointer"
            />
          )}
        </td>
        <td className="px-4 py-3 text-white/80 text-sm">{fmtDate(sub.saleDate)}</td>
        <td className="px-4 py-3 text-white text-sm font-medium">{agentName}</td>
        <td className="px-4 py-3 text-white/80 text-sm">{customerName}</td>
        <td className="px-4 py-3 text-white/80 text-sm">{sub.dids || '—'}</td>
        <td className="px-4 py-3 text-white/80 text-sm">{amount != null ? `RS ${amount.toLocaleString()}` : '—'}</td>
        <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {canAct && (
              <>
                <button
                  onClick={() => onApprove(sub._id)}
                  title="Approve"
                  className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/40 text-green-400 hover:text-green-300 transition-all"
                >
                  <CheckCircle size={15} />
                </button>
                <button
                  onClick={() => onReject(sub._id)}
                  title="Reject"
                  className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 transition-all"
                >
                  <XCircle size={15} />
                </button>
              </>
            )}
            <button
              onClick={() => onToggleExpand(sub._id)}
              title="Details"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-white/5">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                ['Form ID', sub.googleFormResponseId || sub._id],
                ['Phone', sub.customer?.phone || '—'],
                ['State', sub.customer?.state || '—'],
                ['Zip Code', sub.customer?.zipCode || '—'],
                ['Closer', typeof sub.closer === 'string' ? sub.closer : '—'],
                ['DIDs', sub.dids || '—'],
                ['Price/Sale', sub.pricePerSale != null ? `RS ${sub.pricePerSale.toLocaleString()}` : '—'],
                ['Submitted', fmtDate(sub.createdAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-white/80 break-words">{value}</p>
                </div>
              ))}
              {sub.rejectionReason && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-0.5">Rejection Reason</p>
                  <p className="text-red-300">{sub.rejectionReason}</p>
                </div>
              )}
              {sub.notes && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-0.5">Notes</p>
                  <p className="text-white/80 italic">{sub.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Internal Review Notes</p>
              <textarea
                ref={reviewRef}
                value={reviewNote || ''}
                onChange={(e) => onReviewNoteChange(sub._id, e.target.value)}
                placeholder="Write review notes for this submission..."
                className="w-full min-h-[110px] bg-slate-950/80 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

// ─── Main QA Dashboard ───────────────────────────────────────────────────────
const QADashboard = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [agentFilter, setAgentFilter] = useState([]);
  const [packageFilter, setPackageFilter] = useState('');
  const [amountTier, setAmountTier] = useState('any');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSynced, setLastSynced] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [focusReviewId, setFocusReviewId] = useState(null);

  // Rejection modal state
  const [rejectTarget, setRejectTarget] = useState(null); // { id: string } | { bulk: true }

  const formatSyncLabel = (date) => {
    if (!date) return 'Not synced yet';
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Synced just now';
    if (diff < 3600000) return `Synced ${Math.floor(diff / 60000)} min ago`;
    return `Synced ${Math.floor(diff / 3600000)} hr ago`;
  };

  const getPackageValue = (sub) => {
    const candidate = (sub.package || sub.packageType || sub.product || '').toString().trim();
    if (candidate) return candidate;
    if (sub.dids) {
      const found = ['D4', 'D36', 'D38'].find((code) => sub.dids.includes(code));
      return found || sub.dids;
    }
    return '';
  };

  const matchesDateRange = useCallback((sub) => {
    if (dateRange === 'all') return true;
    const value = sub.createdAt || sub.saleDate || sub.saleDate;
    if (!value) return false;
    const submitted = new Date(value);
    const today = new Date();
    const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const submittedDay = startOfDay(submitted);
    if (dateRange === 'today') {
      return submittedDay.getTime() === startOfDay(today).getTime();
    }
    if (dateRange === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return submittedDay.getTime() === startOfDay(yesterday).getTime();
    }
    if (dateRange === 'last7') {
      const pastWeek = new Date(today);
      pastWeek.setDate(pastWeek.getDate() - 6);
      return submittedDay.getTime() >= startOfDay(pastWeek).getTime() && submittedDay.getTime() <= startOfDay(today).getTime();
    }
    if (dateRange === 'custom') {
      if (!customStart || !customEnd) return true;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return submitted >= start && submitted <= end;
    }
    return true;
  }, [dateRange, customStart, customEnd]);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = statusFilter !== 'all' ? `?status=${statusFilter}&limit=200` : '?limit=200';
      const data = await apiFetch(`/sales-submissions${qs}`);
      setSubmissions(data.data || []);
      setLastSynced(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const data = await apiFetch('/sales-submissions/pending/count');
      setPendingCount(data.data?.count ?? 0);
    } catch (_) {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
    fetchPendingCount();
  }, [fetchSubmissions, fetchPendingCount]);

  const handleRefresh = useCallback(() => {
    setSelectedIds(new Set());
    fetchSubmissions();
    fetchPendingCount();
  }, [fetchSubmissions, fetchPendingCount]);

  // ── approve single ───────────────────────────────────────────────────────
  const handleApprove = useCallback(async (id) => {
    try {
      await apiFetch(`/sales-submissions/${id}/approve`, { method: 'POST' });
      setSubmissions((prev) => prev.filter((s) => s._id !== id));
      setPendingCount((n) => Math.max(0, n - 1));
    } catch (e) {
      alert(`Approve failed: ${e.message}`);
    }
  }, []);

  // ── open reject modal for single ─────────────────────────────────────────
  const openRejectSingle = useCallback((id) => {
    setExpandedId(id);
    setFocusReviewId(id);
    setRejectTarget({ id });
  }, []);

  // ── open reject modal for bulk ───────────────────────────────────────────
  const openRejectBulk = useCallback(() => {
    if (selectedIds.size === 0) return alert('Select at least one submission.');
    setRejectTarget({ bulk: true, count: selectedIds.size });
  }, [selectedIds]);

  // ── confirm reject (single or bulk) ──────────────────────────────────────
  const handleRejectConfirm = useCallback(async (reason) => {
    if (!rejectTarget) return;
    try {
      if (rejectTarget.bulk) {
        await apiFetch('/sales-submissions/bulk/disapprove', {
          method: 'POST',
          body: JSON.stringify({
            submissionIds: Array.from(selectedIds),
            rejectionReason: reason,
          }),
        });
        setSubmissions((prev) => prev.filter((s) => !selectedIds.has(s._id)));
        setPendingCount((n) => Math.max(0, n - selectedIds.size));
        setSelectedIds(new Set());
      } else {
        await apiFetch(`/sales-submissions/${rejectTarget.id}/disapprove`, {
          method: 'POST',
          body: JSON.stringify({ rejectionReason: reason }),
        });
        setSubmissions((prev) => prev.filter((s) => s._id !== rejectTarget.id));
        setPendingCount((n) => Math.max(0, n - 1));
      }
    } catch (e) {
      alert(`Reject failed: ${e.message}`);
    } finally {
      setRejectTarget(null);
    }
  }, [rejectTarget, selectedIds]);

  // ── bulk approve ─────────────────────────────────────────────────────────
  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.size === 0) return alert('Select at least one submission.');
    try {
      setLoading(true);
      await apiFetch('/sales-submissions/bulk/approve', {
        method: 'POST',
        body: JSON.stringify({ submissionIds: Array.from(selectedIds) }),
      });
      setSubmissions((prev) => prev.filter((s) => !selectedIds.has(s._id)));
      setPendingCount((n) => Math.max(0, n - selectedIds.size));
      setSelectedIds(new Set());
    } catch (e) {
      alert(`Bulk approve failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedIds]);

  useEffect(() => {
    if (focusReviewId && expandedId === focusReviewId) {
      setFocusReviewId(null);
    }
  }, [focusReviewId, expandedId]);

  // ── selection helpers ─────────────────────────────────────────────────────
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const agentOptions = useMemo(() => {
    return Array.from(new Set(submissions.map((s) => (s.agentName || '').trim())))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [submissions]);

  const packageOptions = useMemo(() => {
    const set = new Set();
    submissions.forEach((s) => {
      const pkg = getPackageValue(s);
      if (pkg) set.add(pkg);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [submissions]);

  const getRowAmount = (s) => s.pricePerSale ?? s.baseSalary ?? s.totalEarning ?? 0;

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (!matchesDateRange(s)) return false;

      if (agentFilter.length > 0 && !agentFilter.includes((s.agentName || '').trim())) {
        return false;
      }

      if (packageFilter) {
        const pkg = getPackageValue(s);
        if (!pkg.toLowerCase().includes(packageFilter.toLowerCase())) return false;
      }

      const amount = getRowAmount(s);
      if (amountTier === 'gt1000' && amount <= 1000) return false;
      if (amountTier === 'gt5000' && amount <= 5000) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const customerName = s.customer ? `${s.customer.firstName || ''} ${s.customer.lastName || ''}` : '';
      const pkg = getPackageValue(s);
      return (
        (s.agentName || '').toLowerCase().includes(q) ||
        customerName.toLowerCase().includes(q) ||
        (s.dids || '').toLowerCase().includes(q) ||
        (s.closer || '').toLowerCase().includes(q) ||
        (pkg || '').toLowerCase().includes(q) ||
        (s.googleFormResponseId || '').toLowerCase().includes(q)
      );
    });
  }, [submissions, search, agentFilter, packageFilter, amountTier, matchesDateRange]);

  const exportToCsv = useCallback(() => {
    const headers = ['Date', 'Agent', 'Customer', 'DIDs', 'Package', 'Amount', 'Status', 'Closer', 'Phone', 'State', 'Zip', 'Form ID', 'Submitted'];
    const rows = filtered.map((s) => {
      const customer = s.customer ? `${s.customer.firstName || ''} ${s.customer.lastName || ''}`.trim() : '';
      const pkg = getPackageValue(s);
      return [
        fmtDate(s.saleDate),
        s.agentName || '',
        customer,
        s.dids || '',
        pkg,
        getRowAmount(s),
        s.status === 'disapproved' ? 'Rejected' : s.status,
        s.closer || '',
        s.customer?.phone || '',
        s.customer?.state || '',
        s.customer?.zipCode || '',
        s.googleFormResponseId || s._id,
        fmtDate(s.createdAt),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qa-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const pendingInView = filtered.filter((s) => s.status === 'pending');
  const allPendingSelected = pendingInView.length > 0 && pendingInView.every((s) => selectedIds.has(s._id));

  const toggleSelectAllPending = useCallback(() => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingInView.map((s) => s._id)));
    }
  }, [allPendingSelected, pendingInView]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <ClipboardList size={20} className="text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-white font-bold text-lg leading-tight">QA Dashboard</h1>
                <span className="text-white/50 text-xs bg-white/5 px-2 py-1 rounded-full border border-white/10">
                  {formatSyncLabel(lastSynced)}
                </span>
              </div>
              <p className="text-white/40 text-xs">
                {user?.firstName} {user?.lastName} · Quality Assurance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="px-2.5 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-300 text-xs font-semibold">
                {pendingCount} pending
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all text-sm font-medium"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Loaded', value: filtered.length, color: 'bg-blue-500/30', icon: ClipboardList },
            { label: 'Pending', value: filtered.filter((s) => s.status === 'pending').length, color: 'bg-yellow-500/30', icon: Clock },
            { label: 'Approved', value: filtered.filter((s) => s.status === 'approved').length, color: 'bg-green-500/30', icon: CheckCircle },
            { label: 'Rejected', value: filtered.filter((s) => s.status === 'disapproved').length, color: 'bg-red-500/30', icon: XCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${color}`}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white/50 text-xs">{label}</p>
                <p className="text-white text-xl font-bold">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter / Search / Actions bar ── */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 flex-wrap">
              {['pending', 'approved', 'rejected', 'all'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setSelectedIds(new Set()); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                    statusFilter === s
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={exportToCsv}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm font-medium hover:bg-slate-700 transition-all"
              >
                <Download size={16} /> Export CSV
              </button>
              <span className="text-white/50 text-sm">{formatSyncLabel(lastSynced)}</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <div>
              <label className="block text-white/60 text-xs uppercase tracking-wide mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="all">Any</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="custom">Custom Range</option>
              </select>
              {dateRange === 'custom' && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-white/60 text-xs uppercase tracking-wide mb-1">Agent</label>
              <select
                multiple
                value={agentFilter}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                  if (values.includes('__all')) {
                    setAgentFilter([]);
                  } else {
                    setAgentFilter(values);
                  }
                }}
                className="w-full min-h-[110px] bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="__all" className="bg-slate-900 text-white">
                  All agents
                </option>
                {agentOptions.map((agent) => (
                  <option key={agent} value={agent} className="bg-slate-900 text-white">
                    {agent}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/60 text-xs uppercase tracking-wide mb-1">Package Type</label>
              <select
                value={packageFilter}
                onChange={(e) => setPackageFilter(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="">Any</option>
                {packageOptions.map((pkg) => (
                  <option key={pkg} value={pkg}>{pkg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/60 text-xs uppercase tracking-wide mb-1">Amount Tier</label>
              <select
                value={amountTier}
                onChange={(e) => setAmountTier(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="any">Any</option>
                <option value="gt1000">{'>'} RS 1,000</option>
                <option value="gt5000">{'>'} RS 5,000</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agent, customer, package..."
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        {/* ── Bulk action bar ── */}
        {selectedIds.size > 0 && (
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between transition-all">
            <span className="text-white/70 text-sm">{selectedIds.size} submission{selectedIds.size === 1 ? '' : 's'} selected</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleBulkApprove}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/40 text-green-300 transition-all text-sm font-medium"
              >
                <CheckCircle size={16} /> Bulk Approve
              </button>
              <button
                onClick={openRejectBulk}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-all text-sm font-medium"
              >
                <XCircle size={16} /> Bulk Reject
              </button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
          {error && (
            <div className="m-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-300">
              <AlertCircle size={18} className="shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={32} className="text-purple-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <ClipboardList size={40} className="text-white/20" />
              <p className="text-white/40 text-sm text-center max-w-md">
                {search
                  ? 'No results match your search.'
                  : statusFilter === 'approved'
                    ? 'No approved submissions found for this period.'
                    : statusFilter === 'rejected'
                      ? 'No rejected submissions found for this period.'
                      : 'No submissions found for this period.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-4 py-3 w-10">
                      {statusFilter === 'pending' && (
                        <input
                          type="checkbox"
                          checked={allPendingSelected}
                          onChange={toggleSelectAllPending}
                          className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 cursor-pointer"
                        />
                      )}
                    </th>
                    <th className="px-4 py-3 text-white/50 text-xs uppercase tracking-wider font-medium">Date</th>
                    <th className="px-4 py-3 text-white/50 text-xs uppercase tracking-wider font-medium">Agent</th>
                    <th className="px-4 py-3 text-white/50 text-xs uppercase tracking-wider font-medium">Customer</th>
                    <th className="px-4 py-3 text-white/50 text-xs uppercase tracking-wider font-medium">Package</th>
                    <th className="px-4 py-3 text-white/50 text-xs uppercase tracking-wider font-medium">Amount</th>
                    <th className="px-4 py-3 text-white/50 text-xs uppercase tracking-wider font-medium">Status</th>
                    <th className="px-4 py-3 text-white/50 text-xs uppercase tracking-wider font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sub) => (
                    <SubmissionRow
                      key={sub._id}
                      sub={sub}
                      selected={selectedIds.has(sub._id)}
                      onToggle={toggleSelect}
                      onApprove={handleApprove}
                      onReject={openRejectSingle}
                      expandedId={expandedId}
                      onToggleExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                      reviewNote={reviewNotes[sub._id]}
                      onReviewNoteChange={(id, value) => setReviewNotes((prev) => ({ ...prev, [id]: value }))}
                      shouldFocusReview={focusReviewId === sub._id}
                    />
                  ))}
                </tbody>
              </table>

              <div className="px-4 py-3 border-t border-white/10 text-white/40 text-sm">
                Showing {filtered.length} of {submissions.length} submissions
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Rejection modal ── */}
      {rejectTarget && (
        <RejectModal
          isBulk={!!rejectTarget.bulk}
          count={rejectTarget.count}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
};

export default QADashboard;
