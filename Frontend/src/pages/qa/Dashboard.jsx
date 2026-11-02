import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../utils/constants';
import { subscribeSocket } from '../../utils/socket';
import { formatSalesShiftDate, getSalesShiftDate } from '../../utils/salesShift';
import { getDidCategories } from '../../utils/didCategories';
import {
  Check, X, RefreshCw, ChevronDown, Search, Download, Link2, ClipboardCheck
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { formatPKR } from '../../components/employees/MonthLedger';
import Panel from '../../components/ui/Panel';
import StatGroup from '../../components/ui/StatGroup';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Dialog from '../../components/ui/Dialog';
import Pagination from '../../components/ui/Pagination';
import { Segmented } from '../../components/ui/Tabs';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';

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

const fmtDateTimePK = (d) =>
  d
    ? new Date(d).toLocaleString('en-GB', {
        timeZone: 'Asia/Karachi',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

const fmtAmount = (n) => (n != null ? formatPKR(n) : '—');

// ─── status badge ────────────────────────────────────────────────────────────
const STATUS = {
  pending: { tone: 'late', label: 'Pending' },
  approved: { tone: 'present', label: 'Approved' },
  disapproved: { tone: 'absent', label: 'Rejected' },
  under_review: { tone: 'late', label: 'Under review' },
};

const StatusBadge = memo(({ status }) => {
  const s = STATUS[status] || STATUS.pending;
  return <Badge tone={s.tone}>{s.label}</Badge>;
});

const STATUS_FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'under_review', label: 'Under review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

// ─── Rejection Modal ─────────────────────────────────────────────────────────
const RejectModal = memo(({ onConfirm, onCancel, isBulk, count }) => {
  const [reason, setReason] = useState('');
  return (
    <Dialog
      open
      onClose={onCancel}
      size="max-w-md"
      title={isBulk ? `Reject ${count} sale${count !== 1 ? 's' : ''}` : 'Reject sale'}
      description="The CSR sees the reason next to the rejected sale."
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" icon={X} onClick={() => onConfirm(reason)}>
            {isBulk ? `Reject ${count}` : 'Reject sale'}
          </Button>
        </>
      }
    >
      <Field label="Reason (optional)" htmlFor="reject-reason">
        <Textarea
          id="reject-reason"
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Customer details don't match the recording"
          rows={3}
        />
      </Field>
    </Dialog>
  );
});

// ─── Link Agent Modal ────────────────────────────────────────────────────────
const LinkAgentModal = memo(({ sub, agents, loading, onConfirm, onCancel }) => {
  const [query, setQuery] = useState(sub.agentName || '');
  const [agentId, setAgentId] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter((a) => {
      if (!q) return true;
      const name = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
      return name.includes(q) || (a.employeeId || '').toLowerCase().includes(q);
    });
  }, [agents, query]);

  return (
    <Dialog
      open
      onClose={onCancel}
      size="max-w-md"
      title="Link to an employee"
      description={`Submitted as "${sub.agentName || 'Unknown'}", which isn't a registered employee. Pick the right person and the sale moves to Pending.`}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button icon={Link2} onClick={() => onConfirm(agentId)} disabled={!agentId}>Link employee</Button>
        </>
      }
    >
      <Input
        type="text"
        aria-label="Search employees"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setAgentId(''); }}
        placeholder="Search by name or employee ID"
        className="mb-3"
      />
      <div className="max-h-56 overflow-y-auto rounded-lg border border-line divide-y divide-line">
        {loading ? (
          <p className="text-sm text-muted p-4">Loading employees…</p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-muted p-4">
            No matching employees. Register them first; the sale links automatically once they're registered.
          </p>
        ) : (
          matches.map((a) => (
            <button
              key={a._id}
              type="button"
              onClick={() => setAgentId(a._id)}
              aria-pressed={agentId === a._id}
              className={`w-full text-left px-3 py-2.5 text-sm ${agentId === a._id ? 'bg-shift-soft text-ink' : 'text-ink hover:bg-paper'}`}
            >
              {a.firstName} {a.lastName}
              <span className="text-muted ml-2">
                {a.employeeId}{a.department ? `, ${a.department}` : ''}
              </span>
            </button>
          ))
        )}
      </div>
    </Dialog>
  );
});

// ─── Submission Row ───────────────────────────────────────────────────────────
const COLUMN_COUNT = 9;

const SubmissionRow = memo(({ sub, selected, onToggle, onApprove, onReject, onLink, onSelectDate, selectedShiftDate, expandedId, onToggleExpand, reviewNote, onReviewNoteChange, shouldFocusReview }) => {
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
  const shiftDate = getSalesShiftDate(sub.createdAt || sub.saleDate);

  return (
    <>
      <tr className={selected ? 'bg-shift-soft' : undefined}>
        <td className="pl-5 pr-2 py-3 w-10">
          {canAct && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(sub._id)}
              aria-label={`Select sale by ${agentName}`}
              className="w-4 h-4 rounded border-line accent-ink cursor-pointer"
            />
          )}
        </td>
        <td className="px-3 py-3">
          <button
            type="button"
            onClick={() => onSelectDate(shiftDate)}
            title="Show only this shift day"
            className={`underline underline-offset-2 decoration-line hover:decoration-ink ${shiftDate === selectedShiftDate ? 'text-shift font-medium' : 'text-ink'}`}
          >
            {formatSalesShiftDate(sub.createdAt || sub.saleDate)}
          </button>
        </td>
        <td className="px-3 py-3 font-medium text-ink">{agentName}</td>
        <td className="px-3 py-3 text-ink">{customerName}</td>
        <td className="px-3 py-3 text-ink">{sub.dids || '—'}</td>
        <td className="px-3 py-3 text-ink text-right">{fmtAmount(amount)}</td>
        <td className="px-3 py-3 text-muted">{fmtDateTimePK(sub.createdAt)}</td>
        <td className="px-3 py-3"><StatusBadge status={sub.status} /></td>
        <td className="px-3 py-3 pr-5">
          <div className="flex items-center justify-end gap-1.5">
            {sub.status === 'under_review' && (
              <>
                <Button variant="secondary" size="sm" icon={Link2} onClick={() => onLink(sub)}>Link</Button>
                <Button variant="ghost" size="icon" icon={X} onClick={() => onReject(sub._id)} aria-label="Reject" title="Reject" className="text-absent hover:text-absent" />
              </>
            )}
            {canAct && (
              <>
                <Button variant="secondary" size="sm" icon={Check} onClick={() => onApprove(sub._id)} title="Approve">Approve</Button>
                <Button variant="ghost" size="icon" icon={X} onClick={() => onReject(sub._id)} aria-label="Reject" title="Reject" className="text-absent hover:text-absent" />
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              icon={ChevronDown}
              onClick={() => onToggleExpand(sub._id)}
              aria-label={isExpanded ? 'Hide details' : 'Show details'}
              aria-expanded={isExpanded}
              className={isExpanded ? '[&>svg]:rotate-180' : ''}
            />
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-paper">
          <td colSpan={COLUMN_COUNT} className="px-5 py-4 whitespace-normal">
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              {[
                ['Form ID', sub.googleFormResponseId || sub._id],
                ['Phone', sub.customer?.phone || '—'],
                ['State', sub.customer?.state || '—'],
                ['Zip code', sub.customer?.zipCode || '—'],
                ['Closer', typeof sub.closer === 'string' ? sub.closer : '—'],
                ['DIDs', sub.dids || '—'],
                ['Price per sale', fmtAmount(sub.pricePerSale)],
                ['Submitted', fmtDateTimePK(sub.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="text-ink break-words">{value}</dd>
                </div>
              ))}
              {sub.rejectionReason && (
                <div className="col-span-2 md:col-span-4">
                  <dt className="text-xs text-muted">Rejection reason</dt>
                  <dd className="text-absent">{sub.rejectionReason}</dd>
                </div>
              )}
              {sub.notes && (
                <div className="col-span-2 md:col-span-4">
                  <dt className="text-xs text-muted">Notes</dt>
                  <dd className="text-ink">{sub.notes}</dd>
                </div>
              )}
            </dl>
            <Field label="Internal review notes" htmlFor={`review-${sub._id}`} className="mt-4">
              <Textarea
                id={`review-${sub._id}`}
                ref={reviewRef}
                value={reviewNote || ''}
                onChange={(e) => onReviewNoteChange(sub._id, e.target.value)}
                placeholder="Notes for this sale. Only QA sees these."
                className="min-h-[96px] resize-y"
              />
            </Field>
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
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedShiftDate, setSelectedShiftDate] = useState(null);
  const [agentFilter, setAgentFilter] = useState([]);
  const [packageFilter, setPackageFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 50, page: 1 });
  const [submissionCounts, setSubmissionCounts] = useState({ total: 0, pending: 0, approved: 0, disapproved: 0 });
  const [amountTier, setAmountTier] = useState('any');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSynced, setLastSynced] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [focusReviewId, setFocusReviewId] = useState(null);

  // Rejection modal state
  const [rejectTarget, setRejectTarget] = useState(null); // { id: string } | { bulk: true }

  // Link-agent modal state
  const [linkTarget, setLinkTarget] = useState(null);
  const [assignableAgents, setAssignableAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  const formatSyncLabel = (date) => {
    if (!date) return 'Not synced yet';
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Synced just now';
    if (diff < 3600000) return `Synced ${Math.floor(diff / 60000)} min ago`;
    return `Synced ${Math.floor(diff / 3600000)} hr ago`;
  };

  const getPackageValue = (sub) => {
    const candidate = (sub.package || sub.packageType || sub.product || '').toString().trim();
    const category = getDidCategories(sub.dids);
    if (candidate) return category ? `${candidate} (${category})` : candidate;
    if (sub.dids) {
      return category || sub.dids;
    }
    return '';
  };

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '50', page: String(page) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (selectedShiftDate) params.set('shiftDate', selectedShiftDate);
      else if (selectedMonth) params.set('month', selectedMonth);

      const data = await apiFetch(`/sales-submissions?${params.toString()}`);
      setSubmissions(data.data || []);
      setPagination({
        total: data.pagination?.total ?? 0,
        pages: data.pagination?.pages ?? 1,
        limit: data.pagination?.limit ?? 50,
        page: data.pagination?.page ?? page,
      });
      setSubmissionCounts(data.counts || { total: 0, pending: 0, approved: 0, disapproved: 0 });
      setLastSynced(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, selectedShiftDate, selectedMonth]);

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

  useEffect(() => {
    const cleanup = subscribeSocket('salesSubmission:update', () => {
      fetchSubmissions();
      fetchPendingCount();
    });
    return cleanup;
  }, [fetchSubmissions, fetchPendingCount]);

  const handleRefresh = useCallback(() => {
    setSelectedIds(new Set());
    fetchSubmissions();
    fetchPendingCount();
  }, [fetchSubmissions, fetchPendingCount]);

  const handleSelectShiftDate = useCallback((shiftDate) => {
    if (!shiftDate) return;
    setSelectedMonth('');
    setSelectedShiftDate((current) => current === shiftDate ? null : shiftDate);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

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

  // ── link agent (under-review sales) ──────────────────────────────────────
  const openLinkAgent = useCallback(async (sub) => {
    setLinkTarget(sub);
    if (assignableAgents.length > 0) return;
    setAgentsLoading(true);
    try {
      const data = await apiFetch('/sales-submissions/agents');
      setAssignableAgents(data.data || []);
    } catch (e) {
      alert(`Could not load employees: ${e.message}`);
      setLinkTarget(null);
    } finally {
      setAgentsLoading(false);
    }
  }, [assignableAgents.length]);

  const handleLinkConfirm = useCallback(async (agentId) => {
    if (!linkTarget || !agentId) return;
    try {
      await apiFetch(`/sales-submissions/${linkTarget._id}/assign-agent`, {
        method: 'POST',
        body: JSON.stringify({ agentId }),
      });
      setLinkTarget(null);
      fetchSubmissions();
      fetchPendingCount();
    } catch (e) {
      alert(`Link failed: ${e.message}`);
    }
  }, [linkTarget, fetchSubmissions, fetchPendingCount]);

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
  }, [submissions, search, agentFilter, packageFilter, amountTier]);

  const exportToCsv = useCallback(() => {
    const headers = ['Date', 'Agent', 'Customer', 'DIDs', 'Package', 'Amount', 'Status', 'Closer', 'Phone', 'State', 'Zip', 'Form ID', 'Submitted'];
    const rows = filtered.map((s) => {
      const customer = s.customer ? `${s.customer.firstName || ''} ${s.customer.lastName || ''}`.trim() : '';
      const pkg = getPackageValue(s);
      return [
        formatSalesShiftDate(s.createdAt || s.saleDate),
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

  // /auth/me populates employeeId with the employee's name
  const profile = typeof user?.employeeId === 'object' ? user.employeeId : null;
  const name = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : user?.username;

  const filtersActive = agentFilter.length > 0 || packageFilter || amountTier !== 'any' || search.trim();
  const emptyMessage = search
    ? 'No sales match your search.'
    : statusFilter === 'pending'
      ? 'Nothing waiting for review. New sales appear here as CSRs submit them.'
      : statusFilter === 'under_review'
        ? 'No sales under review. A sale lands here when it was submitted under a name that isn\'t a registered employee.'
        : statusFilter === 'approved'
          ? 'No approved sales in this period.'
          : statusFilter === 'rejected'
            ? 'No rejected sales in this period.'
            : 'No sales in this period.';

  const headers = ['Shift date', 'CSR', 'Customer', 'DIDs', 'Amount', 'Submitted', 'Status', ''];

  return (
    <AppShell
      nav={[{ key: 'review', label: 'Sales review', icon: ClipboardCheck, active: true, badge: pendingCount, onClick: () => {} }]}
      user={{ name, detail: 'Quality assurance' }}
      onSignOut={handleLogout}
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold text-ink">Sales review</h1>
          <p className="mt-1 text-sm text-muted">{formatSyncLabel(lastSynced)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={Download} onClick={exportToCsv} disabled={filtered.length === 0}>Export CSV</Button>
          <Button variant="ghost" size="icon" icon={RefreshCw} onClick={handleRefresh} disabled={loading} aria-label="Refresh" className={loading ? '[&>svg]:animate-spin' : ''} />
        </div>
      </div>

      <div className="space-y-6">
        <StatGroup
          items={[
            { label: 'Pending', value: submissionCounts.pending, tone: 'late' },
            { label: 'Under review', value: submissionCounts.underReview || 0, tone: 'late' },
            { label: 'Approved', value: submissionCounts.approved, tone: 'present' },
            { label: 'Rejected', value: submissionCounts.disapproved, tone: 'absent' },
            { label: 'Total', value: submissionCounts.total },
          ]}
        />

        <div className="space-y-4">
          <Segmented
            label="Status"
            items={STATUS_FILTERS}
            value={statusFilter}
            onChange={(s) => { setStatusFilter(s); setSelectedIds(new Set()); setPage(1); }}
          />

          <Panel className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Month" htmlFor="qa-month">
                <Input
                  id="qa-month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setSelectedShiftDate(null);
                    setPage(1);
                    setSelectedIds(new Set());
                  }}
                />
              </Field>
              <Field label="Single shift day" htmlFor="qa-day">
                <Input
                  id="qa-day"
                  type="date"
                  value={selectedShiftDate || ''}
                  onChange={(e) => {
                    setSelectedMonth('');
                    setSelectedShiftDate(e.target.value || null);
                    setPage(1);
                    setSelectedIds(new Set());
                  }}
                />
              </Field>
              <Field label="Package" htmlFor="qa-package">
                <Select id="qa-package" value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)}>
                  <option value="">Any package</option>
                  {packageOptions.map((pkg) => (
                    <option key={pkg} value={pkg}>{pkg}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount" htmlFor="qa-amount">
                <Select id="qa-amount" value={amountTier} onChange={(e) => setAmountTier(e.target.value)}>
                  <option value="any">Any amount</option>
                  <option value="gt1000">Over PKR 1,000</option>
                  <option value="gt5000">Over PKR 5,000</option>
                </Select>
              </Field>
              <Field label="CSRs" htmlFor="qa-agents" hint="Ctrl-click to pick several" className="sm:col-span-2 xl:col-span-1">
                <select
                  id="qa-agents"
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
                  className="w-full h-24 rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink focus:outline-none focus:border-shift focus:ring-2 focus:ring-shift/20"
                >
                  <option value="__all">All CSRs</option>
                  {agentOptions.map((agent) => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
              </Field>
              <Field label="Search" htmlFor="qa-search" className="sm:col-span-2 xl:col-span-3 self-start">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
                  <Input
                    id="qa-search"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="CSR, customer, DIDs, closer, package or form ID"
                    className="pl-9"
                  />
                </div>
              </Field>
            </div>
            {selectedShiftDate && (
              <p className="mt-3 text-sm text-muted">
                Showing shift day{' '}
                <span className="text-ink font-medium">{formatSalesShiftDate(`${selectedShiftDate}T18:00:00+05:00`)}</span>.{' '}
                <button
                  type="button"
                  onClick={() => handleSelectShiftDate(selectedShiftDate)}
                  className="text-shift font-medium hover:underline"
                >
                  Show all days
                </button>
              </p>
            )}
          </Panel>
        </div>

        {selectedIds.size > 0 && (
          <Panel className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-ink">
            <span className="text-sm text-ink font-medium">
              {selectedIds.size} sale{selectedIds.size === 1 ? '' : 's'} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
              <Button variant="danger" size="sm" icon={X} onClick={openRejectBulk}>Reject selected</Button>
              <Button size="sm" icon={Check} onClick={handleBulkApprove}>Approve selected</Button>
            </div>
          </Panel>
        )}

        {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

        <Panel className="overflow-hidden">
          {loading ? (
            <p className="px-5 py-8 text-sm text-muted">Loading sales…</p>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">{emptyMessage}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums whitespace-nowrap">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="pl-5 pr-2 py-3 w-10 text-left">
                      {statusFilter === 'pending' && (
                        <input
                          type="checkbox"
                          checked={allPendingSelected}
                          onChange={toggleSelectAllPending}
                          aria-label="Select all pending sales on this page"
                          className="w-4 h-4 rounded border-line accent-ink cursor-pointer"
                        />
                      )}
                    </th>
                    {headers.map((h, i) => (
                      <th
                        key={h || 'actions'}
                        scope="col"
                        className={`px-3 py-3 text-xs font-medium text-muted ${i === 4 ? 'text-right' : 'text-left'} ${i === headers.length - 1 ? 'pr-5' : ''}`}
                      >
                        {h || <span className="sr-only">Actions</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((sub) => (
                    <SubmissionRow
                      key={sub._id}
                      sub={sub}
                      selected={selectedIds.has(sub._id)}
                      onToggle={toggleSelect}
                      onApprove={handleApprove}
                      onReject={openRejectSingle}
                      onLink={openLinkAgent}
                      onSelectDate={handleSelectShiftDate}
                      selectedShiftDate={selectedShiftDate}
                      expandedId={expandedId}
                      onToggleExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                      reviewNote={reviewNotes[sub._id]}
                      onReviewNoteChange={(id, value) => setReviewNotes((prev) => ({ ...prev, [id]: value }))}
                      shouldFocusReview={focusReviewId === sub._id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {filtersActive && !loading && (
          <p className="text-sm text-muted -mt-3">
            Filters show {filtered.length} of the {submissions.length} sales on this page.
          </p>
        )}
        <Pagination
          page={page}
          pageSize={pagination.limit}
          total={pagination.total}
          noun="sales"
          onPageChange={(p) => setPage(Math.min(pagination.pages, Math.max(1, p)))}
        />
      </div>

      {linkTarget && (
        <LinkAgentModal
          sub={linkTarget}
          agents={assignableAgents}
          loading={agentsLoading}
          onConfirm={handleLinkConfirm}
          onCancel={() => setLinkTarget(null)}
        />
      )}

      {rejectTarget && (
        <RejectModal
          isBulk={!!rejectTarget.bulk}
          count={rejectTarget.count}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </AppShell>
  );
};

export default QADashboard;
