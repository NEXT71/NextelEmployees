import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Search, Gift, Trash2, Download, Plus } from 'lucide-react';
import { bonusAPI, employeeAPI } from '../../../utils/api';
import { BONUS_TYPES } from '../../../utils/constants';
import { formatPKR } from '../../../components/employees/MonthLedger';
import Panel from '../../../components/ui/Panel';
import Button from '../../../components/ui/Button';
import Alert from '../../../components/ui/Alert';
import Dialog from '../../../components/ui/Dialog';
import { Field, Input, Select, Textarea } from '../../../components/ui/Field';

const todayInput = () => new Date().toISOString().slice(0, 10);

const formatMoney = (n) => formatPKR(n);

// ─── Give Bonus modal ────────────────────────────────────────────────────────
const GiveBonusModal = ({ employees, onClose, onCreated }) => {
  const [form, setForm] = useState({
    employeeId: '',
    type: BONUS_TYPES[0],
    amount: '',
    date: todayInput(),
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.employeeId) return setError('Choose an employee.');
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount above 0.');

    setSaving(true);
    try {
      const res = await bonusAPI.createBonus({
        employeeId: form.employeeId,
        type: form.type,
        amount,
        date: form.date,
        description: form.description.trim()
      });
      if (res?.error) throw new Error(res.message || 'Failed to give bonus');
      onCreated(res.data);
    } catch (err) {
      setError(err.message || 'Could not save the bonus. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="max-w-lg"
      title="Give bonus"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="give-bonus-form" icon={Gift} disabled={saving}>
            {saving ? 'Saving…' : 'Give bonus'}
          </Button>
        </>
      }
    >
      <form id="give-bonus-form" onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <Field label="Employee" htmlFor="gb-employee">
          <Select id="gb-employee" value={form.employeeId} onChange={update('employeeId')} required>
            <option value="">Choose an employee</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.firstName} {emp.lastName} ({emp.employeeId})
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Bonus type" htmlFor="gb-type">
            <Select id="gb-type" value={form.type} onChange={update('type')}>
              {BONUS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Amount (PKR)" htmlFor="gb-amount">
            <Input id="gb-amount" type="number" min="1" step="1" value={form.amount} onChange={update('amount')} placeholder="e.g. 2000" required />
          </Field>
        </div>

        <Field label="Date" htmlFor="gb-date" hint="Paid with the salary for this date's month.">
          <Input id="gb-date" type="date" value={form.date} onChange={update('date')} required />
        </Field>

        <Field label="Reason (optional)" htmlFor="gb-reason" hint="The employee sees this on their dashboard.">
          <Textarea
            id="gb-reason"
            value={form.description}
            onChange={update('description')}
            rows={2}
            maxLength={500}
            placeholder="e.g. Top performer of the month"
            className="resize-none"
          />
        </Field>
      </form>
    </Dialog>
  );
};

// ─── Bonuses tab ─────────────────────────────────────────────────────────────
const BonusesTab = memo(({ onRefresh }) => {
  const [bonuses, setBonuses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  // Admin pages show active employees only (On Leave counts as active)
  const statusFilter = 'active';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [bonusRes, empRes] = await Promise.all([
          bonusAPI.getAllBonuses(),
          employeeAPI.getAllEmployees({ bypassCache: true })
        ]);
        if (bonusRes?.error) throw new Error(bonusRes.message);
        setBonuses(bonusRes.data || []);
        setEmployees(empRes.data || []);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load bonuses');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status !== 'Inactive'),
    [employees]
  );

  // Records for an employee missing from the list are treated as active
  const matchesStatus = useCallback((employeeId) => {
    if (statusFilter === 'all') return true;
    const emp = employees.find((e) => e._id === employeeId);
    const isInactive = String(emp?.status || '').toLowerCase() === 'inactive';
    return statusFilter === 'inactive' ? isInactive : !isInactive;
  }, [employees, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bonuses.filter((b) => {
      if (!b.employee) return false;
      if (!matchesStatus(b.employee._id)) return false;
      if (employeeFilter && b.employee._id !== employeeFilter) return false;
      if (typeFilter && b.type !== typeFilter) return false;
      if (monthFilter && new Date(b.date).toISOString().slice(0, 7) !== monthFilter) return false;
      if (!q) return true;
      return (
        `${b.employee.firstName} ${b.employee.lastName}`.toLowerCase().includes(q) ||
        (b.employee.employeeId || '').toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q)
      );
    });
  }, [bonuses, search, monthFilter, employeeFilter, typeFilter, matchesStatus]);

  const grouped = useMemo(() => {
    return filtered.reduce((groups, bonus) => {
      const id = bonus.employee._id;
      (groups[id] = groups[id] || []).push(bonus);
      return groups;
    }, {});
  }, [filtered]);

  const totalAmount = useMemo(() => filtered.reduce((sum, b) => sum + (b.amount || 0), 0), [filtered]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setMonthFilter('');
    setEmployeeFilter('');
    setTypeFilter('');
  }, []);

  const handleCreated = useCallback((bonus) => {
    setBonuses((prev) => [bonus, ...prev]);
    setShowModal(false);
    onRefresh?.();
  }, [onRefresh]);

  const handleDelete = useCallback(async (bonusId) => {
    if (!window.confirm('Delete this bonus? It will no longer be included in salary generation.')) return;
    try {
      const res = await bonusAPI.deleteBonus(bonusId);
      if (res?.error) throw new Error(res.message);
      setBonuses((prev) => prev.filter((b) => b._id !== bonusId));
      onRefresh?.();
    } catch (err) {
      setError(err.message || 'Failed to delete bonus');
    }
  }, [onRefresh]);

  const handleDownload = useCallback(() => {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Date', 'Employee ID', 'Employee', 'Type', 'Amount', 'Reason', 'Given by'];
    const rows = filtered.map((b) => [
      new Date(b.date).toISOString().slice(0, 10),
      b.employee.employeeId,
      `${b.employee.firstName} ${b.employee.lastName}`,
      b.type,
      b.amount,
      b.description,
      b.createdBy?.username
    ].map(cell).join(','));

    const blob = new Blob([[headers.map(cell).join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bonus-report-${todayInput()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {filtered.length} {filtered.length === 1 ? 'bonus' : 'bonuses'},{' '}
          <span className="text-present font-semibold tabular-nums">{formatMoney(totalAmount)}</span> in total
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Download} onClick={handleDownload} disabled={filtered.length === 0}>Report</Button>
          <Button icon={Plus} onClick={() => setShowModal(true)}>Give bonus</Button>
        </div>
      </div>

      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
          <Input
            type="text"
            aria-label="Search bonuses"
            placeholder="Search employee, type or reason"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input type="month" aria-label="Month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="sm:w-44" />
        <Select aria-label="Employee" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="sm:w-48">
          <option value="">All employees</option>
          {employees.filter((emp) => matchesStatus(emp._id)).map((emp) => (
            <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
          ))}
        </Select>
        <Select aria-label="Bonus type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="sm:w-44">
          <option value="">All bonus types</option>
          {BONUS_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Button variant="ghost" onClick={clearFilters}>Clear</Button>
      </div>

      {loading ? (
        <Panel><p className="px-5 py-8 text-sm text-muted">Loading bonuses…</p></Panel>
      ) : Object.keys(grouped).length === 0 ? (
        <Panel>
          <p className="px-5 py-8 text-sm text-muted">No bonuses match these filters. Use Give bonus to add one.</p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([employeeId, list]) => {
            const employee = list[0].employee;
            const subtotal = list.reduce((sum, b) => sum + (b.amount || 0), 0);
            return (
              <Panel key={employeeId} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-line bg-paper">
                  <div>
                    <p className="text-sm font-semibold text-ink">{employee.firstName} {employee.lastName}</p>
                    <p className="text-xs text-muted">{employee.employeeId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-present tabular-nums">{formatMoney(subtotal)}</p>
                    <p className="text-xs text-muted">{list.length} {list.length === 1 ? 'bonus' : 'bonuses'}</p>
                  </div>
                </div>
                <ul className="divide-y divide-line">
                  {list.map((bonus) => (
                    <li key={bonus._id} className="flex items-start justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{bonus.type}</p>
                        <p className="text-xs text-muted">
                          {new Date(bonus.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {bonus.createdBy?.username ? `, given by ${bonus.createdBy.username}` : ''}
                        </p>
                        {bonus.description && <p className="text-sm text-ink-soft mt-1">{bonus.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-sm font-semibold text-ink tabular-nums">{formatMoney(bonus.amount)}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          icon={Trash2}
                          onClick={() => handleDelete(bonus._id)}
                          aria-label="Delete bonus"
                          title="Delete bonus"
                          className="hover:text-absent"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
        </div>
      )}

      {showModal && (
        <GiveBonusModal
          employees={activeEmployees}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
});

BonusesTab.displayName = 'BonusesTab';

export default BonusesTab;
