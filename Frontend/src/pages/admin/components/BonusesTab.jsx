import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Search, Gift, Trash2, X, Download, Plus, Loader } from 'lucide-react';
import { bonusAPI, employeeAPI } from '../../../utils/api';
import { BONUS_TYPES } from '../../../utils/constants';

const todayInput = () => new Date().toISOString().slice(0, 10);

const formatMoney = (n) => `RS ${(n || 0).toLocaleString()}`;

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

    if (!form.employeeId) return setError('Please choose an employee');
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than 0');

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
      setError(err.message || 'Failed to give bonus');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full bg-blue-800/80 border border-blue-500/50 rounded-lg py-2 px-3 text-white placeholder-blue-300/70 focus:outline-none focus:ring-2 focus:ring-yellow-500/50';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form
        onSubmit={submit}
        className="bg-gradient-to-br from-blue-900/95 to-purple-900/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">Give Bonus</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-200">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">Employee</label>
            <select value={form.employeeId} onChange={update('employeeId')} className={inputClass} required>
              <option value="">Select employee...</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Bonus type</label>
              <select value={form.type} onChange={update('type')} className={inputClass}>
                {BONUS_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Amount (RS)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={update('amount')}
                placeholder="e.g. 2000"
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">Date</label>
            <input type="date" value={form.date} onChange={update('date')} className={inputClass} required />
            <p className="text-xs text-blue-200/60 mt-1">The bonus is paid in the salary of the month of this date.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">Reason (optional)</label>
            <textarea
              value={form.description}
              onChange={update('description')}
              rows="3"
              maxLength={500}
              placeholder="e.g. Top performer of the month"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end p-6 border-t border-white/20">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:opacity-60 text-white rounded-lg font-medium flex items-center gap-2"
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Give Bonus'}
          </button>
        </div>
      </form>
    </div>
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
  // 'active' (default, includes On Leave) | 'inactive' | 'all'
  const [statusFilter, setStatusFilter] = useState('active');

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
    setStatusFilter('active');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const controlClass =
    'bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50';

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-blue-200/70" />
          <input
            type="text"
            placeholder="Search bonuses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className={controlClass} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={controlClass}>
          <option value="active">Active employees</option>
          <option value="inactive">Inactive employees</option>
          <option value="all">All employees</option>
        </select>
        <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className={controlClass}>
          <option value="">All Employees</option>
          {employees.filter((emp) => matchesStatus(emp._id)).map((emp) => (
            <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={controlClass}>
          <option value="">All Bonus Types</option>
          {BONUS_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={clearFilters}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      </div>

      {/* Actions + total */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Give Bonus
        </button>
        <button
          onClick={handleDownload}
          disabled={filtered.length === 0}
          className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg"
        >
          <Download className="w-5 h-5" />
          Download Bonus Report
        </button>
        <p className="text-sm text-blue-200/80 ml-auto">
          {filtered.length} bonus{filtered.length === 1 ? '' : 'es'} · <span className="text-yellow-300 font-semibold">{formatMoney(totalAmount)}</span> total
        </p>
      </div>

      {/* List */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-blue-200/70">
          <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No bonuses found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([employeeId, list]) => {
            const employee = list[0].employee;
            const subtotal = list.reduce((sum, b) => sum + (b.amount || 0), 0);
            return (
              <div key={employeeId} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <div className="px-6 py-4 bg-white/10 border-b border-white/10 flex justify-between items-center">
                  <div>
                    <h4 className="text-white font-semibold">{employee.firstName} {employee.lastName}</h4>
                    <p className="text-xs text-blue-200/70">{employee.employeeId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-300 font-semibold">{formatMoney(subtotal)}</p>
                    <p className="text-xs text-gray-400">{list.length} bonus{list.length === 1 ? '' : 'es'}</p>
                  </div>
                </div>
                <div className="divide-y divide-white/10">
                  {list.map((bonus) => (
                    <div key={bonus._id} className="px-6 py-3 hover:bg-white/5 transition-colors flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{bonus.type}</p>
                        <p className="text-xs text-blue-200/70">
                          {new Date(bonus.date).toLocaleDateString()}
                          {bonus.createdBy?.username ? ` · by ${bonus.createdBy.username}` : ''}
                        </p>
                        {bonus.description && <p className="text-xs text-gray-400 mt-1">{bonus.description}</p>}
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <p className="text-sm font-semibold text-yellow-300">{formatMoney(bonus.amount)}</p>
                        <button
                          onClick={() => handleDelete(bonus._id)}
                          className="text-red-400 hover:text-red-300"
                          title="Delete bonus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
