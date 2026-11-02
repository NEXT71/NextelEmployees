import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../utils/constants';
import { AccountsPanel, AuditPanel, SettingsPanel } from './SecurityPanels';
import {
  Users, Shield, TrendingUp, Wallet, Clock, ReceiptText, MessageSquare,
  RefreshCw, BarChart2, Pencil, Trash2, Eye, KeyRound, Settings, History
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { formatPKR } from '../../components/employees/MonthLedger';
import Panel from '../../components/ui/Panel';
import StatGroup from '../../components/ui/StatGroup';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Dialog from '../../components/ui/Dialog';
import { Tabs, Segmented } from '../../components/ui/Tabs';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';

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

const fmtCurrency = (n) => formatPKR(typeof n === 'number' ? n : 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const SALE_STATUS = {
  pending: { tone: 'late', label: 'Pending' },
  approved: { tone: 'present', label: 'Approved' },
  disapproved: { tone: 'absent', label: 'Rejected' },
  rejected: { tone: 'absent', label: 'Rejected' },
  under_review: { tone: 'late', label: 'Under review' },
};

const SaleBadge = ({ status }) => {
  const s = SALE_STATUS[status] || { tone: 'neutral', label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
};

const ATTENDANCE_TONE = { Present: 'present', Absent: 'absent', Late: 'late', 'Half-day': 'late' };

const Rank = ({ rank }) => (
  <span className={`inline-flex w-7 justify-center tabular-nums ${rank <= 3 ? 'font-semibold text-ink' : 'text-muted'}`}>{rank}</span>
);

const PageHeader = ({ title, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <h1 className="text-[28px] leading-tight font-semibold text-ink">{title}</h1>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);

// Row checkbox used by the bulk-delete tables
const RowCheck = ({ checked, onChange, label }) => (
  <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} className="w-4 h-4 rounded border-line accent-ink cursor-pointer" />
);

const SaleEditModal = ({ sale, saving, error, onClose, onSave }) => {
  const [form, setForm] = useState({
    agentName: '',
    customer: { firstName: '', lastName: '', phone: '', state: '', zipCode: '' },
    dids: '',
    closer: '',
    saleDate: '',
    status: 'pending'
  });

  useEffect(() => {
    if (!sale) return;
    setForm({
      agentName: sale.agentName || '',
      customer: {
        firstName: sale.customer?.firstName || '',
        lastName: sale.customer?.lastName || '',
        phone: sale.customer?.phone || '',
        state: sale.customer?.state || '',
        zipCode: sale.customer?.zipCode || ''
      },
      dids: sale.dids || '',
      closer: sale.closer || '',
      saleDate: toDateInputValue(sale.saleDate),
      status: sale.status || 'pending'
    });
  }, [sale]);

  const updateCustomer = (field, value) => {
    setForm((prev) => ({
      ...prev,
      customer: { ...prev.customer, [field]: value }
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    await onSave({
      agentName: form.agentName.trim(),
      customer: {
        firstName: form.customer.firstName.trim(),
        lastName: form.customer.lastName.trim(),
        phone: form.customer.phone.trim(),
        state: form.customer.state.trim(),
        zipCode: form.customer.zipCode.trim()
      },
      dids: form.dids.trim(),
      closer: form.closer.trim(),
      saleDate: form.saleDate ? new Date(form.saleDate).toISOString() : undefined,
      status: form.status
    });
  };

  const field = (label, id, value, onChange, props = {}) => (
    <Field label={label} htmlFor={id} className={props.wide ? 'sm:col-span-2' : ''}>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} type={props.type || 'text'} />
    </Field>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      size="max-w-2xl"
      title="Edit sale"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="sale-edit-form" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </>
      }
    >
      <form id="sale-edit-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {error && <Alert className="sm:col-span-2">{error}</Alert>}
        {field('CSR name', 'se-agent', form.agentName, (v) => setForm((p) => ({ ...p, agentName: v })), { wide: true })}
        {field('Customer first name', 'se-first', form.customer.firstName, (v) => updateCustomer('firstName', v))}
        {field('Customer last name', 'se-last', form.customer.lastName, (v) => updateCustomer('lastName', v))}
        {field('Phone', 'se-phone', form.customer.phone, (v) => updateCustomer('phone', v))}
        {field('State', 'se-state', form.customer.state, (v) => updateCustomer('state', v))}
        {field('Zip code', 'se-zip', form.customer.zipCode, (v) => updateCustomer('zipCode', v))}
        {field('DIDs', 'se-dids', form.dids, (v) => setForm((p) => ({ ...p, dids: v })))}
        {field('Closer', 'se-closer', form.closer, (v) => setForm((p) => ({ ...p, closer: v })))}
        {field('Sale date', 'se-date', form.saleDate, (v) => setForm((p) => ({ ...p, saleDate: v })), { type: 'date' })}
        <Field label="Status" htmlFor="se-status" className="sm:col-span-2">
          <Select id="se-status" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="disapproved">Rejected</option>
          </Select>
        </Field>
      </form>
    </Dialog>
  );
};

const SalaryEditModal = ({ salary, saving, error, onClose, onSave }) => {
  const [form, setForm] = useState({
    month: '',
    baseSalary: '',
    bonuses: '',
    deductions: '',
    notes: ''
  });

  useEffect(() => {
    if (!salary) return;
    setForm({
      month: toDateInputValue(salary.month),
      baseSalary: salary.baseSalary ?? '',
      bonuses: salary.bonuses ?? '',
      deductions: salary.deductions ?? '',
      notes: salary.notes || ''
    });
  }, [salary]);

  const submit = async (event) => {
    event.preventDefault();
    await onSave({
      month: form.month ? new Date(form.month).toISOString() : undefined,
      baseSalary: Number(form.baseSalary),
      bonuses: Number(form.bonuses),
      deductions: Number(form.deductions),
      notes: form.notes
    });
  };

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Dialog
      open
      onClose={onClose}
      size="max-w-lg"
      title="Edit salary record"
      description={salary?.employee?.firstName ? `${salary.employee.firstName} ${salary.employee.lastName}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="salary-edit-form" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </>
      }
    >
      <form id="salary-edit-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        {error && <Alert className="sm:col-span-3">{error}</Alert>}
        <Field label="Month" htmlFor="sal-month" className="sm:col-span-3">
          <Input id="sal-month" type="date" value={form.month} onChange={set('month')} />
        </Field>
        <Field label="Base (PKR)" htmlFor="sal-base">
          <Input id="sal-base" type="number" value={form.baseSalary} onChange={set('baseSalary')} />
        </Field>
        <Field label="Bonuses (PKR)" htmlFor="sal-bonus">
          <Input id="sal-bonus" type="number" value={form.bonuses} onChange={set('bonuses')} />
        </Field>
        <Field label="Deductions (PKR)" htmlFor="sal-deduct">
          <Input id="sal-deduct" type="number" value={form.deductions} onChange={set('deductions')} />
        </Field>
        <Field label="Notes" htmlFor="sal-notes" className="sm:col-span-3">
          <Textarea id="sal-notes" rows={3} value={form.notes} onChange={set('notes')} />
        </Field>
      </form>
    </Dialog>
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
        setError('Could not load this employee\'s history. Close and try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [employee._id]);

  const salesRows = history?.salesByMonth || [];
  const sum = (key) => salesRows.reduce((s, r) => s + (r[key] || 0), 0);

  return (
    <Dialog
      open
      onClose={onClose}
      size="max-w-4xl"
      title={`${employee.firstName} ${employee.lastName}`}
      description={`${employee.employeeId}, ${employee.department || 'no department'}, hired ${fmtDate(employee.hireDate)}`}
    >
      <Tabs
        className="-mt-2 mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { key: 'sales', label: 'Sales by month' },
          { key: 'salary', label: 'Salary history' },
        ]}
      />

      {error && <Alert>{error}</Alert>}

      {!error && tab === 'sales' && (
        loading ? (
          <p className="py-8 text-sm text-muted">Loading history…</p>
        ) : salesRows.length === 0 ? (
          <p className="py-8 text-sm text-muted">No sales on record.</p>
        ) : (
          <Panel className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums whitespace-nowrap">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Month', 'Approved', 'Pending', 'Rejected', 'Base', 'Tier bonus', 'Total'].map((h, i) => (
                    <th key={h} scope="col" className={`px-4 py-3 text-xs font-medium text-muted ${i >= 1 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {salesRows.map((row) => (
                  <tr key={row.month}>
                    <td className="px-4 py-3 text-ink font-medium">{row.month}</td>
                    <td className="px-4 py-3 text-right text-present">{row.approved}</td>
                    <td className="px-4 py-3 text-right text-late">{row.pending}</td>
                    <td className="px-4 py-3 text-right text-absent">{row.disapproved}</td>
                    <td className="px-4 py-3 text-right text-ink">{fmtCurrency(row.earnings)}</td>
                    <td className="px-4 py-3 text-right text-ink">{fmtCurrency(row.tierBonus)}</td>
                    <td className="px-4 py-3 text-right text-ink font-semibold">{fmtCurrency(row.totalEarnings)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink">
                  <td colSpan={4} className="px-4 py-3 text-sm text-muted">All time</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{fmtCurrency(sum('earnings'))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{fmtCurrency(sum('tierBonus'))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{fmtCurrency(sum('totalEarnings'))}</td>
                </tr>
              </tfoot>
            </table>
          </Panel>
        )
      )}

      {!error && tab === 'salary' && (
        <DataTable
          loading={loading}
          empty="No salary records yet."
          rows={history?.salaryHistory || []}
          columns={[
            { key: 'month', header: 'Month', render: (s) => fmtDate(s.month) },
            { key: 'base', header: 'Base', align: 'right', render: (s) => fmtCurrency(s.baseSalary) },
            { key: 'bonus', header: 'Bonuses', align: 'right', render: (s) => fmtCurrency(s.bonuses) },
            { key: 'deduct', header: 'Deductions', align: 'right', render: (s) => fmtCurrency(s.deductions) },
            { key: 'net', header: 'Net', align: 'right', render: (s) => <span className="font-semibold">{fmtCurrency((s.baseSalary || 0) + (s.bonuses || 0) - (s.deductions || 0))}</span> },
            { key: 'notes', header: 'Notes', render: (s) => <span className="block max-w-xs truncate text-muted" title={s.notes || ''}>{s.notes || '—'}</span> },
          ]}
        />
      )}
    </Dialog>
  );
};

// ─── Sections (module-scope constant – never recreated) ──────────────────────
const TABS = [
  { key: 'overview',   label: 'Overview',      icon: BarChart2 },
  { key: 'users',      label: 'Users',         icon: Shield },
  { key: 'employees',  label: 'Employees',     icon: Users },
  { key: 'sales',      label: 'Sales',         icon: TrendingUp },
  { key: 'salaries',   label: 'Salaries',      icon: Wallet },
  { key: 'fines',      label: 'Fines',         icon: ReceiptText },
  { key: 'attendance', label: 'Attendance',    icon: Clock },
  { key: 'messages',   label: 'Messages',      icon: MessageSquare },
  { key: 'accounts',   label: 'Accounts',      icon: KeyRound },
  { key: 'audit',      label: 'Audit log',     icon: History },
  { key: 'settings',   label: 'Settings',      icon: Settings },
];
const TAB_KEYS = TABS.map((t) => t.key);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Sections are addressed with ?tab= so they're linkable from the sidebar
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = TAB_KEYS.includes(tabParam) ? tabParam : 'overview';
  const setActiveTab = useCallback((key) => setSearchParams({ tab: key }), [setSearchParams]);
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
  const [saleToEdit, setSaleToEdit] = useState(null);
  const [salaryToEdit, setSalaryToEdit] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

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

  const openSaleEdit = useCallback((sale) => {
    setEditError('');
    setSaleToEdit(sale);
  }, []);

  const openSalaryEdit = useCallback((salary) => {
    setEditError('');
    setSalaryToEdit(salary);
  }, []);

  const closeEditModal = useCallback(() => {
    if (editSaving) return;
    setSaleToEdit(null);
    setSalaryToEdit(null);
    setEditError('');
  }, [editSaving]);

  const handleSaveSale = useCallback(async (payload) => {
    if (!saleToEdit?._id) return;
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/sales/${saleToEdit._id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update sale record.');
      }
      setSales((prev) => prev.map((sale) => (sale._id === saleToEdit._id ? data.data : sale)));
      setSaleToEdit(null);
    } catch (error) {
      setEditError(error.message || 'Failed to update sale record.');
    } finally {
      setEditSaving(false);
    }
  }, [saleToEdit]);

  const handleSaveSalary = useCallback(async (payload) => {
    if (!salaryToEdit?._id) return;
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/salaries/${salaryToEdit._id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update salary record.');
      }
      setSalaries((prev) => prev.map((salary) => (salary._id === salaryToEdit._id ? data.data : salary)));
      setSalaryToEdit(null);
    } catch (error) {
      setEditError(error.message || 'Failed to update salary record.');
    } finally {
      setEditSaving(false);
    }
  }, [salaryToEdit]);

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

  const refreshButton = (tab) => (
    <Button variant="ghost" size="icon" icon={RefreshCw} onClick={() => load(tab)} disabled={loading} aria-label="Refresh" title="Refresh" />
  );

  const loadingPanel = <Panel><p className="px-5 py-8 text-sm text-muted">Loading…</p></Panel>;

  const approveFine = async (f) => {
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/fines/${f._id}/approve`, { method: 'PATCH', headers: authHeaders() });
      if (!res.ok) throw new Error();
      setFines(prev => prev.map(x => x._id === f._id ? { ...x, approved: true } : x));
    } catch { alert('Could not approve the fine. Try again.'); }
  };

  const deleteFine = async (f) => {
    if (!window.confirm('Delete this fine?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/fines/${f._id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error();
      setFines(prev => prev.filter(x => x._id !== f._id));
    } catch { alert('Could not delete the fine. Try again.'); }
  };

  const sendReply = async (m) => {
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
    } catch { alert('Could not send the reply. Try again.'); }
    finally { setSubmitting(false); }
  };

  const resolveMessage = async (m) => {
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/messages/${m._id}/resolve`, { method: 'PATCH', headers: authHeaders() });
      if (!res.ok) throw new Error();
      setMessages(prev => prev.map(x => x._id === m._id ? { ...x, status: 'resolved' } : x));
    } catch { alert('Could not resolve the message. Try again.'); }
  };

  // Bulk-delete toolbar for employees, sales and salaries
  const bulkActions = (type, selected, rows) => (
    <>
      {selected.size > 0 && (
        <Button variant="danger" size="sm" icon={Trash2} disabled={bulkDeleting} onClick={() => handleBulkDelete(type, selected, false)}>
          Delete {selected.size} selected
        </Button>
      )}
      <Button
        variant="secondary"
        size="sm"
        disabled={bulkDeleting || rows.length === 0}
        onClick={() => handleBulkDelete(type, null, true)}
        className="text-absent hover:border-absent"
      >
        Delete all
      </Button>
    </>
  );

  const rowActions = (onEdit, onDelete, id, label) => (
    <div className="flex items-center justify-end gap-0.5">
      {onEdit && <Button variant="ghost" size="icon" icon={Pencil} onClick={onEdit} aria-label={`Edit ${label}`} title={`Edit ${label}`} />}
      <Button
        variant="ghost"
        size="icon"
        icon={deletingId === id ? RefreshCw : Trash2}
        disabled={deletingId === id || bulkDeleting}
        onClick={onDelete}
        aria-label={`Delete ${label}`}
        title={`Delete ${label}`}
        className={`hover:text-absent ${deletingId === id ? '[&>svg]:animate-spin' : ''}`}
      />
    </div>
  );

  const nav = TABS.map(({ key, label, icon }) => ({
    key,
    label,
    icon,
    active: activeTab === key,
    onClick: () => setActiveTab(key),
  }));

  return (
    <AppShell nav={nav} user={{ name: user?.username, detail: 'Super admin' }} onSignOut={handleLogout}>
      {error && (
        <Alert className="mb-6">
          {error}{' '}
          <button type="button" onClick={() => load(activeTab)} className="underline underline-offset-2 font-medium">Try again</button>
        </Alert>
      )}

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <>
          <PageHeader title="Overview">{refreshButton('overview')}</PageHeader>
          {loading || !stats ? loadingPanel : (
            <div className="space-y-4">
              <StatGroup
                items={[
                  { label: 'Users', value: stats.totalUsers ?? 0 },
                  { label: 'Admins', value: stats.totalAdmins ?? 0 },
                  { label: 'Employees', value: stats.totalEmployees ?? 0 },
                  { label: 'Salary records', value: stats.totalSalaryRecords ?? 0 },
                ]}
              />
              <StatGroup
                items={[
                  { label: 'Sales submitted', value: stats.totalSales ?? 0 },
                  { label: 'Approved', value: stats.approvedSales ?? 0, tone: 'present' },
                  { label: 'Waiting for QA', value: stats.pendingSales ?? 0, tone: 'late' },
                  { label: 'Paid out', value: fmtCurrency(stats.totalEarningsPaid) },
                ]}
              />
            </div>
          )}
        </>
      )}

      {activeTab === 'accounts' && <><PageHeader title="Accounts" /><AccountsPanel /></>}
      {activeTab === 'audit' && <><PageHeader title="Audit log" /><AuditPanel /></>}
      {activeTab === 'settings' && <><PageHeader title="Settings" /><SettingsPanel /></>}

      {/* ── Users ── */}
      {activeTab === 'users' && (
        <>
          <PageHeader title="Users">{refreshButton('users')}</PageHeader>
          <DataTable
            loading={loading}
            empty="No users found."
            rows={users}
            columns={[
              { key: 'username', header: 'Username', render: (u) => <span className="font-medium">{u.username}</span> },
              { key: 'email', header: 'Email', render: (u) => u.email || '—' },
              { key: 'role', header: 'Role', render: (u) => <Badge tone={u.role === 'superadmin' || u.role === 'admin' ? 'shift' : 'neutral'}>{u.role}</Badge> },
              {
                key: 'status',
                header: 'Status',
                render: (u) => <Badge tone={u.isActive !== false ? 'present' : 'absent'}>{u.isActive !== false ? 'Active' : 'Inactive'}</Badge>,
              },
              {
                key: 'action',
                header: <span className="sr-only">Action</span>,
                align: 'right',
                render: (u) =>
                  u.role !== 'superadmin' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={togglingUser === u._id}
                      onClick={() => handleToggleUser(u._id)}
                      className={u.isActive !== false ? 'hover:text-absent' : 'hover:text-present'}
                    >
                      {togglingUser === u._id ? 'Saving…' : u.isActive !== false ? 'Deactivate' : 'Activate'}
                    </Button>
                  ) : (
                    <span className="text-muted">—</span>
                  ),
              },
            ]}
          />
        </>
      )}

      {/* ── Employees ── */}
      {activeTab === 'employees' && (
        <>
          <PageHeader title="Employees">
            {bulkActions('employees', selectedEmpIds, employees)}
            {refreshButton('employees')}
          </PageHeader>
          <DataTable
            loading={loading}
            empty="No employees found."
            rows={employees}
            columns={[
              {
                key: 'select',
                header: (
                  <RowCheck
                    checked={employees.length > 0 && selectedEmpIds.size === employees.length}
                    onChange={() => toggleSelectAll(employees, setSelectedEmpIds)}
                    label="Select all employees"
                  />
                ),
                render: (emp) => (
                  <RowCheck
                    checked={selectedEmpIds.has(emp._id)}
                    onChange={() => toggleSelect(setSelectedEmpIds, emp._id)}
                    label={`Select ${emp.firstName} ${emp.lastName}`}
                  />
                ),
              },
              { key: 'name', header: 'Name', render: (emp) => <span className="font-medium">{emp.firstName} {emp.lastName}</span> },
              { key: 'id', header: 'Employee ID', render: (emp) => emp.employeeId || '—' },
              { key: 'dept', header: 'Department', render: (emp) => emp.department || '—' },
              { key: 'hired', header: 'Hired', render: (emp) => fmtDate(emp.hireDate) },
              {
                key: 'actions',
                header: <span className="sr-only">Actions</span>,
                align: 'right',
                render: (emp) => (
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="secondary" size="sm" icon={Eye} onClick={() => setSelectedEmployee(emp)}>History</Button>
                    {rowActions(null, () => handleDeleteEmployee(emp._id), emp._id, 'employee')}
                  </div>
                ),
              },
            ]}
          />
        </>
      )}

      {/* ── Sales ── */}
      {activeTab === 'sales' && (
        <>
          <PageHeader title="Sales">
            {salesView === 'all' && bulkActions('sales', selectedSaleIds, sales)}
            {refreshButton('sales')}
          </PageHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                label="View"
                value={salesView}
                onChange={setSalesView}
                items={[
                  { key: 'leaderboard', label: 'CSR leaderboard' },
                  { key: 'verifier', label: 'Verifier leaderboard' },
                  { key: 'all', label: 'All submissions' },
                ]}
              />
              {salesView === 'all' && (
                <Select aria-label="Status" value={salesFilter} onChange={(e) => setSalesFilter(e.target.value)} className="w-40">
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </Select>
              )}
            </div>

            {loading ? loadingPanel : (
              <>
                {salesView === 'leaderboard' && (
                  <>
                    {topPerformer && (
                      <Panel className="px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-muted">Top CSR</p>
                          <p className="text-lg font-semibold text-ink">{topPerformer.agentName}</p>
                          <p className="text-xs text-muted">{topPerformer.employeeId}, {topPerformer.department}</p>
                        </div>
                        <dl className="flex gap-8 text-sm">
                          <div><dt className="text-muted">Approved</dt><dd className="text-lg font-semibold text-present tabular-nums">{topPerformer.approvedSales}</dd></div>
                          <div><dt className="text-muted">Earned</dt><dd className="text-lg font-semibold text-ink tabular-nums">{fmtCurrency(topPerformer.totalEarnings)}</dd></div>
                        </dl>
                      </Panel>
                    )}
                    <DataTable
                      empty="No approved sales yet."
                      rows={leaderboard}
                      rowKey={(row) => String(row.agentId)}
                      columns={[
                        { key: 'rank', header: '#', render: (row) => <Rank rank={row.rank} /> },
                        { key: 'name', header: 'CSR', render: (row) => <span className="font-medium">{row.agentName}</span> },
                        { key: 'id', header: 'Employee ID', render: (row) => row.employeeId || '—' },
                        { key: 'dept', header: 'Department', render: (row) => row.department || '—' },
                        { key: 'approved', header: 'Approved', align: 'right', render: (row) => <span className="text-present">{row.approvedSales}</span> },
                        { key: 'pending', header: 'Pending', align: 'right', render: (row) => <span className="text-late">{row.pendingSales}</span> },
                        { key: 'earned', header: 'Earned', align: 'right', render: (row) => <span className="font-medium">{fmtCurrency(row.totalEarnings)}</span> },
                        { key: 'last', header: 'Last sale', render: (row) => fmtDate(row.lastSaleDate) },
                      ]}
                    />
                  </>
                )}

                {salesView === 'verifier' && (
                  <>
                    {topCloser && (
                      <Panel className="px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-muted">Top verifier</p>
                          <p className="text-lg font-semibold text-ink">{topCloser.closerName}</p>
                          <p className="text-xs text-muted">{topCloser.employeeId}</p>
                        </div>
                        <dl className="flex gap-8 text-sm">
                          <div><dt className="text-muted">Closes</dt><dd className="text-lg font-semibold text-present tabular-nums">{topCloser.approvedCloses}</dd></div>
                          <div><dt className="text-muted">Earned</dt><dd className="text-lg font-semibold text-ink tabular-nums">{fmtCurrency(topCloser.totalEarnings)}</dd></div>
                        </dl>
                      </Panel>
                    )}
                    <DataTable
                      empty="No verifier closes yet."
                      rows={closerLeaderboard}
                      rowKey={(row) => String(row.closerId)}
                      columns={[
                        { key: 'rank', header: '#', render: (row) => <Rank rank={row.rank} /> },
                        { key: 'name', header: 'Verifier', render: (row) => <span className="font-medium">{row.closerName}</span> },
                        { key: 'id', header: 'Employee ID', render: (row) => row.employeeId || '—' },
                        { key: 'closes', header: 'Closes', align: 'right', render: (row) => <span className="text-present">{row.approvedCloses}</span> },
                        { key: 'earned', header: 'Earned', align: 'right', render: (row) => <span className="font-medium">{fmtCurrency(row.totalEarnings)}</span> },
                        { key: 'last', header: 'Last close', render: (row) => fmtDate(row.lastCloseDate) },
                      ]}
                    />
                  </>
                )}

                {salesView === 'all' && (
                  <DataTable
                    empty="No sales match this status."
                    rows={sales}
                    columns={[
                      {
                        key: 'select',
                        header: (
                          <RowCheck
                            checked={sales.length > 0 && selectedSaleIds.size === sales.length}
                            onChange={() => toggleSelectAll(sales, setSelectedSaleIds)}
                            label="Select all sales"
                          />
                        ),
                        render: (s) => <RowCheck checked={selectedSaleIds.has(s._id)} onChange={() => toggleSelect(setSelectedSaleIds, s._id)} label="Select sale" />,
                      },
                      { key: 'agent', header: 'CSR', render: (s) => <span className="font-medium">{s.agentName || (s.agent?.firstName ? `${s.agent.firstName} ${s.agent.lastName}` : '—')}</span> },
                      {
                        key: 'customer',
                        header: 'Customer',
                        render: (s) => (
                          <>
                            {s.customer?.firstName ? `${s.customer.firstName} ${s.customer.lastName}` : '—'}
                            <span className="block text-xs text-muted">{s.customer?.phone || ''}</span>
                          </>
                        ),
                      },
                      { key: 'dids', header: 'DIDs', render: (s) => s.dids || '—' },
                      { key: 'closer', header: 'Closer', render: (s) => s.closer || '—' },
                      { key: 'status', header: 'Status', render: (s) => <SaleBadge status={s.status} /> },
                      { key: 'date', header: 'Date', render: (s) => fmtDate(s.submittedAt || s.createdAt) },
                      {
                        key: 'actions',
                        header: <span className="sr-only">Actions</span>,
                        align: 'right',
                        render: (s) => rowActions(() => openSaleEdit(s), () => handleDeleteSale(s._id), s._id, 'sale'),
                      },
                    ]}
                  />
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Salaries ── */}
      {activeTab === 'salaries' && (
        <>
          <PageHeader title="Salaries">
            {bulkActions('salaries', selectedSalaryIds, salaries)}
            {refreshButton('salaries')}
          </PageHeader>
          <DataTable
            loading={loading}
            empty="No salary records yet."
            rows={salaries}
            columns={[
              {
                key: 'select',
                header: (
                  <RowCheck
                    checked={salaries.length > 0 && selectedSalaryIds.size === salaries.length}
                    onChange={() => toggleSelectAll(salaries, setSelectedSalaryIds)}
                    label="Select all salary records"
                  />
                ),
                render: (s) => <RowCheck checked={selectedSalaryIds.has(s._id)} onChange={() => toggleSelect(setSelectedSalaryIds, s._id)} label="Select salary record" />,
              },
              {
                key: 'employee',
                header: 'Employee',
                render: (s) => <span className="font-medium">{s.employee?.firstName ? `${s.employee.firstName} ${s.employee.lastName}` : s.employeeId || '—'}</span>,
              },
              { key: 'month', header: 'Month', render: (s) => s.month },
              { key: 'base', header: 'Base', align: 'right', render: (s) => fmtCurrency(s.baseSalary) },
              { key: 'bonus', header: 'Sales bonus', align: 'right', render: (s) => fmtCurrency(s.bonuses) },
              { key: 'deduct', header: 'Deductions', align: 'right', render: (s) => fmtCurrency(s.deductions) },
              {
                key: 'net',
                header: 'Net',
                align: 'right',
                render: (s) => <span className="font-semibold">{fmtCurrency(s.netPay ?? ((s.baseSalary || 0) + (s.bonuses || 0) - (s.deductions || 0)))}</span>,
              },
              {
                key: 'actions',
                header: <span className="sr-only">Actions</span>,
                align: 'right',
                render: (s) => rowActions(() => openSalaryEdit(s), () => handleDeleteSalary(s._id), s._id, 'salary record'),
              },
            ]}
          />
        </>
      )}

      {/* ── Fines ── */}
      {activeTab === 'fines' && (
        <>
          <PageHeader title="Fines">
            <Segmented
              label="Fine status"
              value={finesFilter}
              onChange={setFinesFilter}
              items={[
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'Pending' },
                { key: 'approved', label: 'Approved' },
              ]}
            />
            {refreshButton('fines')}
          </PageHeader>
          <DataTable
            loading={loading}
            empty="No fines match this status."
            rows={fines}
            columns={[
              {
                key: 'employee',
                header: 'Employee',
                render: (f) => (
                  <>
                    <span className="font-medium">{f.employee ? `${f.employee.firstName} ${f.employee.lastName}` : '—'}</span>
                    <span className="block text-xs text-muted">{f.employee?.employeeId}</span>
                  </>
                ),
              },
              { key: 'type', header: 'Type', render: (f) => f.type },
              { key: 'amount', header: 'Amount', align: 'right', render: (f) => fmtCurrency(f.amount) },
              { key: 'date', header: 'Date', render: (f) => fmtDate(f.date) },
              { key: 'status', header: 'Status', render: (f) => <Badge tone={f.approved ? 'absent' : 'late'}>{f.approved ? 'Approved' : 'Pending'}</Badge> },
              {
                key: 'actions',
                header: <span className="sr-only">Actions</span>,
                align: 'right',
                render: (f) => (
                  <div className="flex items-center justify-end gap-1">
                    {!f.approved && <Button variant="secondary" size="sm" onClick={() => approveFine(f)}>Approve</Button>}
                    <Button variant="ghost" size="icon" icon={Trash2} onClick={() => deleteFine(f)} aria-label="Delete fine" title="Delete fine" className="hover:text-absent" />
                  </div>
                ),
              },
            ]}
          />
        </>
      )}

      {/* ── Attendance ── */}
      {activeTab === 'attendance' && (
        <>
          <PageHeader title="Attendance">
            <Input type="date" aria-label="Date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-44" />
            {refreshButton('attendance')}
          </PageHeader>
          <DataTable
            loading={loading}
            empty="No attendance records for this date."
            rows={attendance}
            columns={[
              {
                key: 'employee',
                header: 'Employee',
                render: (a) => (
                  <>
                    <span className="font-medium">{a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : '—'}</span>
                    <span className="block text-xs text-muted">{a.employee?.employeeId}</span>
                  </>
                ),
              },
              { key: 'date', header: 'Date', render: (a) => fmtDate(a.date) },
              { key: 'status', header: 'Status', render: (a) => <Badge tone={ATTENDANCE_TONE[a.status] || 'neutral'}>{a.status}</Badge> },
              { key: 'in', header: 'Clock in', render: (a) => fmtTime(a.clockIn) },
              { key: 'out', header: 'Clock out', render: (a) => fmtTime(a.clockOut) },
              { key: 'notes', header: 'Notes', render: (a) => <span className="text-muted">{a.notes || '—'}</span> },
            ]}
          />
        </>
      )}

      {/* ── Messages ── */}
      {activeTab === 'messages' && (
        <>
          <PageHeader title="Messages">{refreshButton('messages')}</PageHeader>
          {loading ? loadingPanel : messages.length === 0 ? (
            <Panel><p className="px-5 py-8 text-sm text-muted">No messages yet.</p></Panel>
          ) : (
            <Panel className="overflow-hidden">
              <ul className="divide-y divide-line">
                {messages.map(m => (
                  <li key={m._id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{m.subject}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {m.from?.username || 'Unknown'}, <span className="capitalize">{m.category}</span>, {fmtDate(m.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(m.priority === 'urgent' || m.priority === 'high') && (
                          <Badge tone={m.priority === 'urgent' ? 'absent' : 'late'}>{m.priority === 'urgent' ? 'Urgent' : 'High'}</Badge>
                        )}
                        <Badge tone={m.status === 'resolved' ? 'neutral' : m.status === 'responded' ? 'present' : 'shift'}>
                          {m.status === 'unread' ? 'New' : m.status === 'responded' ? 'Replied' : m.status === 'resolved' ? 'Resolved' : m.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-ink-soft mt-2 whitespace-pre-line">{m.message}</p>
                    {m.adminResponse?.message && (
                      <div className="mt-3 rounded-lg bg-paper border-l-2 border-present px-3 py-2">
                        <p className="text-xs text-muted">Reply</p>
                        <p className="text-sm text-ink">{m.adminResponse.message}</p>
                      </div>
                    )}
                    {m.status !== 'resolved' && (
                      <div className="mt-3">
                        {messageReplyId === m._id ? (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              aria-label="Reply"
                              value={messageReplyText}
                              onChange={e => setMessageReplyText(e.target.value)}
                              placeholder="Write a reply"
                              autoFocus
                              className="flex-1"
                            />
                            <div className="flex gap-2">
                              <Button variant="secondary" onClick={() => { setMessageReplyId(null); setMessageReplyText(''); }}>Cancel</Button>
                              <Button disabled={submitting || !messageReplyText.trim()} onClick={() => sendReply(m)}>
                                {submitting ? 'Sending…' : 'Send reply'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setMessageReplyId(m._id)}>Reply</Button>
                            <Button variant="ghost" size="sm" onClick={() => resolveMessage(m)}>Mark resolved</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}

      {saleToEdit && (
        <SaleEditModal
          sale={saleToEdit}
          saving={editSaving}
          error={editError}
          onClose={closeEditModal}
          onSave={handleSaveSale}
        />
      )}

      {salaryToEdit && (
        <SalaryEditModal
          salary={salaryToEdit}
          saving={editSaving}
          error={editError}
          onClose={closeEditModal}
          onSave={handleSaveSalary}
        />
      )}

      {selectedEmployee && (
        <CSRDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </AppShell>
  );
};

export default SuperAdminDashboard;
