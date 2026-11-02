import { useEffect, useState, useCallback } from 'react';
import { API_BASE_URL } from '../../utils/constants';
import { RefreshCw, KeyRound, LogOut, UserPlus, RotateCcw, ShieldCheck } from 'lucide-react';
import Panel from '../../components/ui/Panel';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Dialog from '../../components/ui/Dialog';
import { Field, Input, Select } from '../../components/ui/Field';

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

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—';

// Password field every sensitive action asks for
const ConfirmPassword = ({ id, value, onChange }) => (
  <Field label="Your password" htmlFor={id} hint="Required to confirm this change.">
    <Input id={id} type="password" autoComplete="current-password" value={value} onChange={onChange} />
  </Field>
);

// Shows a temporary password once, after create or reset.
const TempPassword = ({ value, onDone }) => (
  <Dialog
    open
    onClose={onDone}
    size="max-w-md"
    title="Temporary password"
    description="Share this with the user now. It won't be shown again."
    footer={<Button onClick={onDone}>I've copied it</Button>}
  >
    <p className="rounded-lg border border-line bg-paper px-4 py-3 text-center font-mono text-lg text-ink select-all break-all">{value}</p>
  </Dialog>
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
  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Logins, roles, passwords and live sessions.</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" icon={RefreshCw} onClick={load} aria-label="Refresh" />
          <Button icon={UserPlus} onClick={() => open('create', null, { role: 'admin' })}>Create account</Button>
        </div>
      </div>

      {notice && <Alert tone="success" onDismiss={() => setNotice('')}>{notice}</Alert>}
      {error && !d && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <DataTable
        empty="No users found."
        rows={rows}
        columns={[
          {
            key: 'user',
            header: 'User',
            render: (u) => (
              <>
                <span className="font-medium">{u.username}</span>
                <span className="block text-xs text-muted">{u.email}{u.isActive === false ? ', inactive' : ''}</span>
              </>
            ),
          },
          { key: 'role', header: 'Role', render: (u) => <Badge tone={u.role === 'superadmin' || u.role === 'admin' ? 'shift' : 'neutral'}>{u.role}</Badge> },
          {
            key: 'session',
            header: 'Session',
            render: (u) => <Badge tone={u.sessionLive ? 'present' : 'neutral'} dot={u.sessionLive}>{u.sessionLive ? 'Signed in' : 'Offline'}</Badge>,
          },
          { key: 'last', header: 'Last sign-in', render: (u) => <span className="text-muted">{fmtDateTime(u.lastLogin)}</span> },
          {
            key: 'actions',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            render: (u) => (
              <div className="flex flex-wrap items-center justify-end gap-1">
                {u.role !== 'superadmin' && (
                  <Button variant="secondary" size="sm" icon={ShieldCheck} onClick={() => open('role', u, { role: u.role === 'admin' ? 'qa' : 'admin' })}>Role</Button>
                )}
                <Button variant="secondary" size="sm" icon={KeyRound} onClick={() => open('reset', u)} disabled={u.role === 'superadmin'}>Password</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={LogOut}
                  onClick={() => direct(`/users/${u._id}/force-logout`, 'Force sign-out', u)}
                  className="hover:text-absent"
                >
                  Sign out
                </Button>
              </div>
            ),
          },
        ]}
      />

      {d?.type === 'create' && (
        <Dialog
          open
          onClose={close}
          size="max-w-md"
          title="Create account"
          description="A temporary password is shown once the account is created."
          footer={
            <>
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button disabled={busy} onClick={() => run(() => call('/users', 'POST', form))}>{busy ? 'Creating…' : 'Create account'}</Button>
            </>
          }
        >
          <div className="space-y-4">
            {error && <Alert>{error}</Alert>}
            <Field label="Username" htmlFor="acc-username">
              <Input id="acc-username" value={form.username || ''} onChange={setField('username')} />
            </Field>
            <Field label="Email" htmlFor="acc-email">
              <Input id="acc-email" type="email" value={form.email || ''} onChange={setField('email')} />
            </Field>
            <Field label="Role" htmlFor="acc-role">
              <Select id="acc-role" value={form.role} onChange={setField('role')}>
                <option value="admin">Admin</option>
                <option value="qa">QA</option>
                <option value="hr">HR</option>
              </Select>
            </Field>
            <ConfirmPassword id="acc-confirm" value={form.confirmPassword || ''} onChange={setField('confirmPassword')} />
          </div>
        </Dialog>
      )}

      {d?.type === 'role' && (
        <Dialog
          open
          onClose={close}
          size="max-w-md"
          title={`Change role for ${d.user.username}`}
          description={`Currently ${d.user.role}. They're signed out and sign in again under the new role.`}
          footer={
            <>
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button disabled={busy} onClick={() => run(() => call(`/users/${d.user._id}/role`, 'PATCH', form))}>{busy ? 'Saving…' : 'Change role'}</Button>
            </>
          }
        >
          <div className="space-y-4">
            {error && <Alert>{error}</Alert>}
            <Field label="New role" htmlFor="role-new">
              <Select id="role-new" value={form.role} onChange={setField('role')}>
                {['employee', 'qa', 'hr', 'admin', 'superadmin'].filter((r) => r !== d.user.role).map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>
            {form.role === 'superadmin' && (
              <Field label="Type SUPERADMIN to confirm" htmlFor="role-confirm-text" hint="Super admins can delete and restore everything.">
                <Input id="role-confirm-text" value={form.confirmText || ''} onChange={setField('confirmText')} />
              </Field>
            )}
            <ConfirmPassword id="role-confirm" value={form.confirmPassword || ''} onChange={setField('confirmPassword')} />
          </div>
        </Dialog>
      )}

      {d?.type === 'reset' && (
        <Dialog
          open
          onClose={close}
          size="max-w-md"
          title={`Reset password for ${d.user.username}`}
          description="A new temporary password is generated and they're signed out everywhere."
          footer={
            <>
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button variant="danger" disabled={busy} onClick={() => run(() => call(`/users/${d.user._id}/reset-password`, 'POST', form))}>
                {busy ? 'Resetting…' : 'Reset password'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {error && <Alert>{error}</Alert>}
            <ConfirmPassword id="reset-confirm" value={form.confirmPassword || ''} onChange={setField('confirmPassword')} />
          </div>
        </Dialog>
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
      const summary = (json.data || []).map((r) => `${r.type}: ${r.restored} restored, ${r.skipped} already existed${r.errors.length ? `, ${r.errors.length} failed` : ''}`).join('; ');
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Every change made in the portal. Deletions can be restored.</p>
        <div className="flex gap-2">
          <Input
            aria-label="Filter by action"
            className="w-60"
            placeholder="Filter by action, e.g. sale.delete"
            value={filter}
            onChange={(e) => { setPage(1); setFilter(e.target.value.trim()); }}
          />
          <Button variant="ghost" size="icon" icon={RefreshCw} onClick={load} aria-label="Refresh" />
        </div>
      </div>

      {notice && <Alert tone="success" onDismiss={() => setNotice('')}>{notice}</Alert>}
      {error && !restore && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <DataTable
        empty="No audit entries match."
        rows={logs}
        columns={[
          { key: 'when', header: 'When (PKT)', render: (l) => <span className="text-muted">{fmtDateTime(l.createdAt)}</span> },
          {
            key: 'who',
            header: 'Who',
            render: (l) => (
              <>
                {l.actorName || '—'}
                {l.actorRole && <span className="block text-xs text-muted">{l.actorRole}</span>}
              </>
            ),
          },
          { key: 'action', header: 'Action', render: (l) => <code className="rounded bg-paper px-1.5 py-0.5 text-xs text-ink">{l.action}</code> },
          { key: 'summary', header: 'Summary', render: (l) => <span className="block max-w-md whitespace-normal">{l.summary}</span> },
          {
            key: 'restore',
            header: <span className="sr-only">Restore</span>,
            align: 'right',
            render: (l) => canRestore(l) && <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => openRestore(l)}>Restore</Button>,
          },
        ]}
      />

      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span className="tabular-nums">Page {page} of {pages}</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>

      {restore && (
        <Dialog
          open
          onClose={() => setRestore(null)}
          size="max-w-md"
          title="Restore deleted data"
          description={restore.preview.summary}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRestore(null)}>Cancel</Button>
              <Button icon={RotateCcw} disabled={busy || !password} onClick={doRestore}>{busy ? 'Restoring…' : 'Restore'}</Button>
            </>
          }
        >
          <div className="space-y-4">
            <ul className="text-sm text-ink list-disc pl-5 space-y-1">
              {restore.preview.willRestore.map((w) => (
                <li key={w.type}>
                  {w.type}: {w.restore} to restore{w.alreadyExist ? `, ${w.alreadyExist} already exist and stay as they are` : ''}
                </li>
              ))}
            </ul>
            {restore.preview.note && <Alert tone="warning">{restore.preview.note}</Alert>}
            {error && <Alert>{error}</Alert>}
            <ConfirmPassword id="restore-confirm" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </Dialog>
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

  if (!data) return error ? <Alert>{error}</Alert> : <p className="text-sm text-muted">Loading…</p>;

  const changed = Object.keys(amounts).filter((k) => Number(amounts[k]) !== data.fineAmounts[k]);

  return (
    <div className="max-w-xl space-y-4">
      <Alert tone="warning">
        Fine amounts apply to new fines only. Existing fines and generated salaries keep their amounts.
        Sales pay rates and tiers are set in code, not here.
      </Alert>
      {notice && <Alert tone="success" onDismiss={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <div>
        <h2 className="text-xl font-semibold text-ink mb-3">Fine amounts</h2>
        <Panel className="overflow-hidden">
          <ul className="divide-y divide-line">
            {Object.keys(data.defaults).map((type) => (
              <li key={type} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <label htmlFor={`fine-amt-${type}`} className="flex-1 text-sm text-ink">{type}</label>
                <span className="text-xs text-muted tabular-nums">default {data.defaults[type]}</span>
                <Input
                  id={`fine-amt-${type}`}
                  type="number"
                  min="0"
                  step="1"
                  className="w-28 text-right tabular-nums"
                  value={amounts[type] ?? ''}
                  onChange={(e) => setAmounts({ ...amounts, [type]: e.target.value })}
                />
              </li>
            ))}
          </ul>
          <p className="px-4 py-2.5 border-t border-line bg-paper text-xs text-muted">
            Version {data.version || 'default'}
            {data.updatedByName ? `, last changed by ${data.updatedByName}` : ''}
            {data.updatedAt ? ` on ${fmtDateTime(data.updatedAt)}` : ''}
          </p>
        </Panel>
      </div>

      {changed.length > 0 && (
        <p className="text-sm text-ink">
          Changing {changed.map((k) => `${k} from ${data.fineAmounts[k]} to ${amounts[k]}`).join(', ')}.
        </p>
      )}
      <ConfirmPassword id="settings-confirm" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button disabled={busy || !password || changed.length === 0} onClick={save}>
        {busy ? 'Saving…' : 'Save fine amounts'}
      </Button>
    </div>
  );
};
