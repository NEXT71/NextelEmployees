import { useEffect, useState, useCallback } from 'react';
import { API_BASE_URL } from '../../utils/constants';
import { RefreshCw, X, KeyRound, LogOut, Unlink, UserPlus, RotateCcw } from 'lucide-react';

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// Every call returns the server's JSON; failures throw the server's message.
const call = async (path, method = 'GET', body) => {
  const res = await fetch(`${API_BASE_URL}/superadmin${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
};

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : '—');

const inputCls =
  'w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500';
const btnCls = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50';

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="text-white/50 hover:text-white"><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);

// Shows a temporary password once, after create or reset.
const TempPassword = ({ value, onDone }) => (
  <Modal title="Temporary password" onClose={onDone}>
    <p className="text-white/70 text-sm mb-3">Share this with the user now. It will not be shown again.</p>
    <div className="bg-black/40 border border-yellow-500/40 rounded-lg p-3 text-yellow-200 font-mono text-center select-all break-all">
      {value}
    </div>
    <button onClick={onDone} className="mt-4 w-full px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 text-purple-100 rounded-lg text-sm">
      I have copied it
    </button>
  </Modal>
);

// ─── Accounts: create, role, password, sessions, devices ───────────────────
export const AccountsPanel = () => {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); // { type, user }
  const [form, setForm] = useState({});
  const [temp, setTemp] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setRows((await call('/users/sessions')).data || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (type, user = null, initial = {}) => { setDialog({ type, user }); setForm(initial); setError(''); };
  const close = () => { setDialog(null); setForm({}); };

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      const json = await fn();
      setNotice(json.message || 'Done');
      if (json.data?.tempPassword) setTemp(json.data.tempPassword);
      close();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const direct = (path, label, user) => {
    if (!window.confirm(`${label} for ${user.username}?`)) return;
    run(() => call(path, 'POST'));
  };

  const d = dialog;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-2xl font-bold">Accounts & Sessions</h2>
        <div className="flex gap-2">
          <button onClick={() => open('create', null, { role: 'admin' })} className={`${btnCls} bg-purple-500/30 text-purple-100 hover:bg-purple-500/40`}>
            <UserPlus size={14} /> Create account
          </button>
          <button onClick={load} className={`${btnCls} bg-white/10 text-white/70 hover:text-white`}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {notice && <div className="mb-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">{notice}</div>}
      {error && !d && <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/50 border-b border-white/10">
              <th className="text-left py-3 px-4">User</th>
              <th className="text-center py-3 px-4">Role</th>
              <th className="text-center py-3 px-4">Session</th>
              <th className="text-center py-3 px-4">Device</th>
              <th className="text-left py-3 px-4">Last login</th>
              <th className="text-center py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u._id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4">
                  <div className="text-white font-medium">{u.username}</div>
                  <div className="text-white/50 text-xs">{u.email}{u.isActive === false ? ' · inactive' : ''}</div>
                </td>
                <td className="py-3 px-4 text-center text-white/80">{u.role}</td>
                <td className="py-3 px-4 text-center">
                  <span className={u.sessionLive ? 'text-green-300' : 'text-white/40'}>{u.sessionLive ? 'Logged in' : 'Offline'}</span>
                </td>
                <td className="py-3 px-4 text-center text-white/70">{u.deviceBound ? 'Bound' : '—'}</td>
                <td className="py-3 px-4 text-white/60">{fmtDateTime(u.lastLogin)}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {u.role !== 'superadmin' && (
                      <button onClick={() => open('role', u, { role: u.role === 'admin' ? 'qa' : 'admin' })} className={`${btnCls} bg-blue-500/20 text-blue-200 hover:bg-blue-500/30`}>
                        Role
                      </button>
                    )}
                    <button onClick={() => open('reset', u)} className={`${btnCls} bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/30`} disabled={u.role === 'superadmin'}>
                      <KeyRound size={12} /> Password
                    </button>
                    <button onClick={() => direct(`/users/${u._id}/force-logout`, 'Force logout', u)} className={`${btnCls} bg-red-500/20 text-red-200 hover:bg-red-500/30`}>
                      <LogOut size={12} /> Logout
                    </button>
                    <button onClick={() => direct(`/users/${u._id}/unbind-device`, 'Unbind device and end session', u)} className={`${btnCls} bg-orange-500/20 text-orange-200 hover:bg-orange-500/30`} disabled={!u.deviceBound}>
                      <Unlink size={12} /> Unbind
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-white/40">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {d?.type === 'create' && (
        <Modal title="Create account" onClose={close}>
          <div className="space-y-3">
            <input className={inputCls} placeholder="Username" value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input className={inputCls} placeholder="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">admin</option>
              <option value="qa">qa</option>
              <option value="hr">hr</option>
            </select>
            <input type="password" className={inputCls} placeholder="Your password to confirm" value={form.confirmPassword || ''} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
            {error && <p className="text-red-300 text-sm">{error}</p>}
            <button disabled={busy} onClick={() => run(() => call('/users', 'POST', form))} className="w-full px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 text-purple-100 rounded-lg text-sm disabled:opacity-50">
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </Modal>
      )}

      {d?.type === 'role' && (
        <Modal title={`Change role: ${d.user.username}`} onClose={close}>
          <div className="space-y-3">
            <p className="text-white/60 text-sm">Currently {d.user.role}. The user is logged out and signs in again under the new role.</p>
            <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {['employee', 'qa', 'hr', 'admin', 'superadmin'].filter((r) => r !== d.user.role).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {form.role === 'superadmin' && (
              <input className={inputCls} placeholder="Type SUPERADMIN to confirm" value={form.confirmText || ''} onChange={(e) => setForm({ ...form, confirmText: e.target.value })} />
            )}
            <input type="password" className={inputCls} placeholder="Your password to confirm" value={form.confirmPassword || ''} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
            {error && <p className="text-red-300 text-sm">{error}</p>}
            <button disabled={busy} onClick={() => run(() => call(`/users/${d.user._id}/role`, 'PATCH', form))} className="w-full px-4 py-2 bg-blue-500/30 hover:bg-blue-500/40 text-blue-100 rounded-lg text-sm disabled:opacity-50">
              {busy ? 'Saving…' : 'Change role'}
            </button>
          </div>
        </Modal>
      )}

      {d?.type === 'reset' && (
        <Modal title={`Reset password: ${d.user.username}`} onClose={close}>
          <div className="space-y-3">
            <p className="text-white/60 text-sm">A new temporary password is generated and the user is logged out everywhere.</p>
            <input type="password" className={inputCls} placeholder="Your password to confirm" value={form.confirmPassword || ''} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
            {error && <p className="text-red-300 text-sm">{error}</p>}
            <button disabled={busy} onClick={() => run(() => call(`/users/${d.user._id}/reset-password`, 'POST', form))} className="w-full px-4 py-2 bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-100 rounded-lg text-sm disabled:opacity-50">
              {busy ? 'Resetting…' : 'Reset password'}
            </button>
          </div>
        </Modal>
      )}

      {temp && <TempPassword value={temp} onDone={() => setTemp('')} />}
    </div>
  );
};

// ─── Audit log with restore ────────────────────────────────────────────────
export const AuditPanel = () => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [restore, setRestore] = useState(null); // { log, preview }
  const [password, setPassword] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const q = `?page=${page}&limit=50${filter ? `&action=${encodeURIComponent(filter)}` : ''}`;
      const json = await call(`/audit-logs${q}`);
      setLogs(json.data || []);
      setPages(json.pagination?.pages || 1);
    } catch (e) {
      setError(e.message);
    }
  }, [page, filter]);
  useEffect(() => { load(); }, [load]);

  const canRestore = (l) => /\.(delete|bulkDelete)$/.test(l.action) && ['sale', 'salary', 'fine', 'bonus', 'employee'].includes(l.entityType);

  const openRestore = async (log) => {
    setError('');
    try {
      const json = await call(`/audit-logs/${log._id}/restore-preview`);
      setRestore({ log, preview: json.data });
      setPassword('');
    } catch (e) {
      setError(e.message);
    }
  };

  const doRestore = async () => {
    setBusy(true);
    setError('');
    try {
      const json = await call(`/audit-logs/${restore.log._id}/restore`, 'POST', { confirmPassword: password });
      const summary = (json.data || []).map((r) => `${r.type}: ${r.restored} restored, ${r.skipped} already existed${r.errors.length ? `, ${r.errors.length} failed` : ''}`).join(' | ');
      setNotice(summary);
      setRestore(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-white text-2xl font-bold">Audit Log</h2>
        <div className="flex gap-2">
          <input className={`${inputCls} w-56`} placeholder="Filter by action, e.g. sale.delete" value={filter} onChange={(e) => { setPage(1); setFilter(e.target.value.trim()); }} />
          <button onClick={load} className={`${btnCls} bg-white/10 text-white/70 hover:text-white`}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {notice && <div className="mb-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">{notice}</div>}
      {error && !restore && <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/50 border-b border-white/10">
              <th className="text-left py-3 px-4">When (PKT)</th>
              <th className="text-left py-3 px-4">Who</th>
              <th className="text-left py-3 px-4">Action</th>
              <th className="text-left py-3 px-4">Summary</th>
              <th className="text-center py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-2.5 px-4 text-white/60 whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                <td className="py-2.5 px-4 text-white/80">{l.actorName || '—'} <span className="text-white/40 text-xs">{l.actorRole}</span></td>
                <td className="py-2.5 px-4 text-white font-mono text-xs">{l.action}</td>
                <td className="py-2.5 px-4 text-white/70">{l.summary}</td>
                <td className="py-2.5 px-4 text-center">
                  {canRestore(l) && (
                    <button onClick={() => openRestore(l)} className={`${btnCls} bg-green-500/20 text-green-200 hover:bg-green-500/30`}>
                      <RotateCcw size={12} /> Restore
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-white/40">No entries.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-3 mt-4 text-sm text-white/60">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className={`${btnCls} bg-white/10`}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button disabled={page >= pages} onClick={() => setPage(page + 1)} className={`${btnCls} bg-white/10`}>Next</button>
      </div>

      {restore && (
        <Modal title="Restore deleted data" onClose={() => setRestore(null)}>
          <div className="space-y-3">
            <p className="text-white/70 text-sm">{restore.preview.summary}</p>
            <ul className="text-white/80 text-sm list-disc pl-5">
              {restore.preview.willRestore.map((w) => (
                <li key={w.type}>{w.type}: {w.restore} to restore{w.alreadyExist ? `, ${w.alreadyExist} already exist (left as is)` : ''}</li>
              ))}
            </ul>
            {restore.preview.note && <p className="text-yellow-200 text-sm">{restore.preview.note}</p>}
            <input type="password" className={inputCls} placeholder="Your password to confirm" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="text-red-300 text-sm">{error}</p>}
            <button disabled={busy || !password} onClick={doRestore} className="w-full px-4 py-2 bg-green-500/30 hover:bg-green-500/40 text-green-100 rounded-lg text-sm disabled:opacity-50">
              {busy ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── Settings: fine amounts ────────────────────────────────────────────────
export const SettingsPanel = () => {
  const [data, setData] = useState(null);
  const [amounts, setAmounts] = useState({});
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const json = await call('/settings');
      setData(json.data);
      setAmounts(json.data.fineAmounts);
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const json = await call('/settings/fine-amounts', 'PUT', { fineAmounts: amounts, confirmPassword: password });
      setNotice(json.message);
      setPassword('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="text-white/50">{error || 'Loading…'}</p>;

  const changed = Object.keys(amounts).filter((k) => Number(amounts[k]) !== data.fineAmounts[k]);

  return (
    <div className="max-w-xl">
      <h2 className="text-white text-2xl font-bold mb-2">Settings</h2>
      <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-sm">
        Fine amounts apply to new fines only. Fines already created, and salaries already generated, keep their amounts.
        Sales pay rates and tiers are not editable here; they are set in the code.
      </div>
      {notice && <div className="mb-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">{notice}</div>}
      {error && <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-2">
        {Object.keys(data.defaults).map((type) => (
          <div key={type} className="flex items-center justify-between gap-3">
            <label className="text-white/80 text-sm flex-1">{type}</label>
            <span className="text-white/40 text-xs">default {data.defaults[type]}</span>
            <input type="number" min="0" step="1" className={`${inputCls} w-28`} value={amounts[type] ?? ''} onChange={(e) => setAmounts({ ...amounts, [type]: e.target.value })} />
          </div>
        ))}
        <p className="text-white/40 text-xs pt-2">
          Version {data.version || 'default'}{data.updatedByName ? ` · last changed by ${data.updatedByName}` : ''}{data.updatedAt ? ` · ${fmtDateTime(data.updatedAt)}` : ''}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {changed.length > 0 && (
          <p className="text-white/70 text-sm">Changing: {changed.map((k) => `${k} ${data.fineAmounts[k]} → ${amounts[k]}`).join(', ')}</p>
        )}
        <input type="password" className={inputCls} placeholder="Your password to confirm" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={busy || !password || changed.length === 0} onClick={save} className="w-full px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 text-purple-100 rounded-lg text-sm disabled:opacity-50">
          {busy ? 'Saving…' : 'Save fine amounts'}
        </button>
      </div>
    </div>
  );
};
