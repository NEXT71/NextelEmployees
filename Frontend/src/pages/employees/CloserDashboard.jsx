import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ClipboardCheck, Award } from 'lucide-react';
import BonusLinesTab from './BonusLinesTab';
import { useAuth } from '../../contexts/AuthContext';
import { salesTargetAPI, attendanceAPI, fineAPI } from '../../utils/api';
import { isWithinAttendanceWindow, isWithinClockInWindow } from '../../utils/attendanceTimeAccess';
import { subscribeSocket } from '../../utils/socket';
import ShiftPanel from '../../components/employees/ShiftPanel';
import { formatSalesShiftDate, getCurrentSalesShiftDate } from '../../utils/salesShift';
import AppShell from '../../components/layout/AppShell';
import { formatPKR } from '../../components/employees/MonthLedger';
import { Section } from '../../components/ui/Panel';
import StatGroup from '../../components/ui/StatGroup';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Pagination from '../../components/ui/Pagination';
import { Input, Select } from '../../components/ui/Field';

const COMMISSION = 200; // PKR per approved close

const fmtCurrency = (n) => (typeof n === 'number' ? formatPKR(n) : '—');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = [2026, 2025];

const statusBadge = {
  approved: <Badge tone="present">Approved</Badge>,
  pending: <Badge tone="late">Pending</Badge>,
  disapproved: <Badge tone="absent">Rejected</Badge>,
  under_review: <Badge tone="late">Under review</Badge>,
};

const CloserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('closes');
  const [stats, setStats] = useState(null);
  const [closes, setCloses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getCurrentSalesShiftDate);
  // 'day' lists closes for selectedDate; 'month' lists the whole month of selectedDate
  const [viewMode, setViewMode] = useState('day');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 });
  const [fines, setFines] = useState([]);
  const [loadingFines, setLoadingFines] = useState(true);
  const [finesError, setFinesError] = useState(null);

  const [clockInAt, setClockInAt] = useState(null);
  const [clockOutAt, setClockOutAt] = useState(null);
  const [clockBusy, setClockBusy] = useState(false);
  const [now, setNow] = useState(new Date());

  // /auth/me populates employeeId with the employee record
  const profile = typeof user?.employeeId === 'object' ? user.employeeId : null;
  const employeeDbId = profile?._id;

  const checkClockStatus = useCallback(async () => {
    if (!employeeDbId) return;
    try {
      const res = await attendanceAPI.getAttendanceStatus(employeeDbId);
      const record = res?.data?.hasClockedIn ? res.data.record : null;
      setClockInAt(record?.clockIn || null);
      setClockOutAt(record?.clockOut || null);
    } catch (e) {
      setClockInAt(null);
      setClockOutAt(null);
    }
  }, [employeeDbId]);

  useEffect(() => {
    checkClockStatus();
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [checkClockStatus]);

  useEffect(() => {
    if (!employeeDbId) return undefined;
    return subscribeSocket('attendance:update', (payload) => {
      if (payload?.employeeId === employeeDbId && (payload.type === 'clockIn' || payload.type === 'clockOut')) {
        checkClockStatus();
      }
    });
  }, [employeeDbId, checkClockStatus]);

  const handleClockIn = async () => {
    setError('');
    if (!isWithinClockInWindow()) {
      setError('Clock-in is open from 5:30 PM to 6:00 AM PKT.');
      return;
    }
    setClockBusy(true);
    try {
      const res = await attendanceAPI.clockIn();
      if (res?.success) {
        setClockInAt(res.data.clockIn);
        setClockOutAt(null);
      }
    } catch (e) {
      setError(e.message || 'Clock-in did not go through. Try again.');
      if (e.message?.includes('already clocked in')) await checkClockStatus();
    } finally {
      setClockBusy(false);
    }
  };

  const handleClockOut = async () => {
    setError('');
    if (!isWithinAttendanceWindow()) {
      setError('Clock-out is open from 5:30 PM to 6:30 AM PKT.');
      return;
    }
    setClockBusy(true);
    try {
      const res = await attendanceAPI.clockOut();
      if (res?.success) setClockOutAt(res.data.clockOut);
    } catch (e) {
      setError(e.message || 'Clock-out did not go through. Try again.');
    } finally {
      setClockBusy(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, closesRes] = await Promise.all([
        salesTargetAPI.getMyClosesStats({
          month: selectedDate ? Number(selectedDate.slice(5, 7)) : undefined,
          year: selectedDate ? Number(selectedDate.slice(0, 4)) : undefined,
          day: selectedDate ? Number(selectedDate.slice(8, 10)) : undefined
        }),
        salesTargetAPI.getMyCloses(
          viewMode === 'month'
            ? { status: statusFilter, month: selectedDate.slice(0, 7), page, limit: 10 }
            : { status: statusFilter, date: selectedDate, page, limit: 10 }
        )
      ]);
      if (statsRes?.data) {
        setStats(statsRes.data);
      }
      if (closesRes?.data) {
        setCloses(closesRes.data || []);
        if (closesRes.pagination) {
          setPagination(closesRes.pagination);
        }
      }
    } catch (e) {
      setError(`Could not load your closes: ${e.message || 'unknown error'}. Try refreshing.`);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedDate, viewMode, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadFines = useCallback(async (bypassCache = false) => {
    setLoadingFines(true);
    setFinesError(null);
    try {
      const res = await fineAPI.getEmployeeFines({ bypassCache });
      const data = res?.data || res;
      setFines(Array.isArray(data) ? data : []);
    } catch (e) {
      setFinesError(e.message || 'Could not load fines.');
      setFines([]);
    } finally {
      setLoadingFines(false);
    }
  }, []);

  useEffect(() => {
    loadFines();
  }, [loadFines]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter, selectedDate, viewMode]);

  // Month/year pickers keep the day where possible (clamped to the month's length)
  const changeMonth = (year, month) => {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const day = Math.min(Number(selectedDate.slice(8, 10)) || 1, lastDay);
    setSelectedDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  };
  const selYear = Number(selectedDate.slice(0, 4));
  const selMonthNum = Number(selectedDate.slice(5, 7));
  const monthLabel = `${MONTH_NAMES[selMonthNum - 1] || ''} ${selYear}`;
  const periodLabel = viewMode === 'month' ? monthLabel : null;

  const name = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : user?.username;

  const dayLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' })
    : 'Selected day';

  // Approved fines in the selected month are deducted from salary (payroll uses the calendar month, UTC)
  const selectedMonth = (selectedDate || getCurrentSalesShiftDate()).slice(0, 7);
  const monthFines = fines.filter((f) => f.date && new Date(f.date).toISOString().slice(0, 7) === selectedMonth);
  const approvedFinesTotal = monthFines.filter((f) => f.approved).reduce((sum, f) => sum + (f.amount || 0), 0);
  const pendingFinesCount = monthFines.filter((f) => !f.approved).length;
  const netThisMonth = typeof stats?.earningsThisMonth === 'number' ? stats.earningsThisMonth - approvedFinesTotal : null;
  // If every pending / under-review close this month gets approved
  const projectedThisMonth = typeof stats?.totalAmountThisMonth === 'number' ? stats.totalAmountThisMonth - approvedFinesTotal : null;

  return (
    <AppShell
      nav={[
        { key: 'closes', label: 'My closes', icon: ClipboardCheck, active: tab === 'closes', onClick: () => setTab('closes') },
        { key: 'bonus', label: 'Bonus lines', icon: Award, active: tab === 'bonus', onClick: () => setTab('bonus') },
      ]}
      user={{ name, detail: profile?.employeeId || 'Verifier' }}
      onSignOut={handleLogout}
    >
      <ShiftPanel
        now={now}
        clockInAt={clockInAt}
        clockOutAt={clockOutAt}
        canClockIn={isWithinClockInWindow()}
        canClockOut={isWithinAttendanceWindow()}
        busy={clockBusy}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
      />

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 mt-8">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold text-ink">{tab === 'bonus' ? 'Bonus lines' : 'My closes'}</h1>
          <p className="mt-1 text-sm text-muted">
            {tab === 'bonus'
              ? 'From 1 Nov: 20 approved closes in a day on these lines pays 1,000, 30 pays 2,000, 40 pays 5,000.'
              : `You earn ${formatPKR(COMMISSION)} for every close QA approves.`}
          </p>
        </div>
      </div>

      {tab === 'bonus' ? <BonusLinesTab /> : (
      <div className="space-y-8">
        {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted">{monthLabel}</h2>
            {(stats?.pendingThisMonth ?? 0) > 0 && !(viewMode === 'month' && statusFilter === 'pending') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setViewMode('month'); setStatusFilter('pending'); }}
              >
                View {stats.pendingThisMonth} pending {stats.pendingThisMonth === 1 ? 'close' : 'closes'}
              </Button>
            )}
          </div>
          <StatGroup
            wrap
            items={[
              {
                label: 'Earned',
                value: fmtCurrency(netThisMonth),
                tone: 'present',
                hint: approvedFinesTotal > 0
                  ? `${fmtCurrency(stats?.earningsThisMonth)} from approved closes, minus ${formatPKR(approvedFinesTotal)} fines`
                  : pendingFinesCount > 0
                    ? `From approved closes. ${pendingFinesCount} ${pendingFinesCount === 1 ? 'fine' : 'fines'} pending review`
                    : 'From approved closes',
              },
              {
                label: 'Projected',
                value: fmtCurrency(projectedThisMonth),
                tone: 'late',
                hint: `If all ${stats?.pendingThisMonth ?? 0} pending ${stats?.pendingThisMonth === 1 ? 'close is' : 'closes are'} approved${approvedFinesTotal > 0 ? `, after ${formatPKR(approvedFinesTotal)} fines` : ''}`,
              },
              {
                label: 'Approved closes',
                value: stats?.approvedThisMonth ?? '—',
                tone: 'present',
                hint: `${fmtCurrency(stats?.earningsThisMonth)} at ${formatPKR(COMMISSION)} each`,
              },
              {
                label: 'Total closes',
                value: stats?.totalThisMonth ?? '—',
                hint: `${stats?.approvedThisMonth ?? 0} approved, ${stats?.pendingThisMonth ?? 0} pending. Worth ${fmtCurrency(stats?.totalAmountThisMonth)}`,
              },
              {
                label: 'Rank',
                value: stats?.rank ? `#${stats.rank}` : '—',
                hint: stats?.totalVerifiers ? `of ${stats.totalVerifiers} verifiers` : undefined,
              },
            ]}
          />
        </section>

        {viewMode === 'day' && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted">{dayLabel}</h2>
            <StatGroup
              wrap
              items={[
                {
                  label: 'Approved closes',
                  value: stats?.approvedThisDay ?? '—',
                  tone: 'present',
                  hint: `${fmtCurrency(stats?.earningsThisDay)} earned`,
                },
                {
                  label: 'Total closes',
                  value: stats?.totalThisDay ?? '—',
                  hint: `${stats?.approvedThisDay ?? 0} approved, ${stats?.pendingThisDay ?? 0} pending. Worth ${fmtCurrency(stats?.totalAmountThisDay)}`,
                },
              ]}
            />
          </section>
        )}

        <Section
          title="Closes"
          actions={<Button variant="ghost" size="icon" icon={RefreshCw} onClick={loadData} disabled={loading} aria-label="Refresh" />}
        >
          {/* Fixed-width wrappers: the controls are w-full, so they size to these boxes */}
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <label className="w-36">
              <span className="block text-xs text-muted mb-1">View</span>
              <Select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                <option value="day">By day</option>
                <option value="month">Whole month</option>
              </Select>
            </label>
            <label className="w-36">
              <span className="block text-xs text-muted mb-1">Month</span>
              <Select value={selMonthNum} onChange={(e) => changeMonth(selYear, Number(e.target.value))}>
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
            </label>
            <label className="w-24">
              <span className="block text-xs text-muted mb-1">Year</span>
              <Select value={selYear} onChange={(e) => changeMonth(Number(e.target.value), selMonthNum)}>
                {(YEARS.includes(selYear) ? YEARS : [selYear, ...YEARS]).map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </label>
            {viewMode === 'day' && (
              <label className="w-40">
                <span className="block text-xs text-muted mb-1">Day</span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                />
              </label>
            )}
            <label className="w-52">
              <span className="block text-xs text-muted mb-1">Status</span>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending (all awaiting QA)</option>
                <option value="under_review">Under review</option>
                <option value="disapproved">Rejected</option>
              </Select>
            </label>
          </div>
          <DataTable
            loading={loading}
            empty={
              statusFilter !== 'all'
                ? `No ${statusFilter === 'disapproved' ? 'rejected' : statusFilter.replace('_', '-')} closes ${periodLabel ? `in ${periodLabel}` : `on ${dayLabel}`}.`
                : periodLabel
                  ? `No closes in ${periodLabel}.`
                  : `No closes on ${dayLabel}. Pick another date to see earlier closes.`
            }
            rows={closes}
            columns={[
              {
                key: 'customer',
                header: 'Customer',
                render: (row) => (row.customer?.firstName ? `${row.customer.firstName} ${row.customer.lastName}` : '—'),
              },
              { key: 'agent', header: 'CSR', render: (row) => row.agentName || '—' },
              { key: 'dids', header: 'DIDs', render: (row) => row.dids || '—' },
              { key: 'status', header: 'Status', render: (row) => statusBadge[row.status] || <Badge>{row.status}</Badge> },
              {
                key: 'pay',
                header: 'Your pay',
                align: 'right',
                render: (row) =>
                  row.status === 'approved' ? <span className="text-present">{formatPKR(COMMISSION)}</span> : <span className="text-muted">—</span>,
              },
              { key: 'date', header: 'Sale date', render: (row) => formatSalesShiftDate(row.createdAt || row.saleDate) },
            ]}
          />
          <Pagination
            className="mt-3"
            page={page}
            pageSize={pagination.limit}
            total={pagination.total}
            noun="closes"
            onPageChange={setPage}
          />
        </Section>

        <Section
          title="Fines"
          actions={<Button variant="ghost" size="icon" icon={RefreshCw} onClick={() => loadFines(true)} disabled={loadingFines} aria-label="Refresh fines" />}
        >
          <DataTable
            loading={loadingFines}
            error={finesError}
            onRetry={() => loadFines(true)}
            empty="No fines. Keep it that way."
            rows={fines.slice(0, 10)}
            columns={[
              { key: 'date', header: 'Date', render: (f) => (f.date ? new Date(f.date).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }) : '—') },
              {
                key: 'type',
                header: 'Reason',
                render: (f) => (
                  <span className="block max-w-[360px] truncate" title={f.description || f.type}>
                    {f.type}
                    {f.description && <span className="text-muted"> — {f.description}</span>}
                  </span>
                ),
              },
              { key: 'amount', header: 'Amount', align: 'right', render: (f) => formatPKR(f.amount) },
              {
                key: 'status',
                header: 'Status',
                render: (f) => <Badge tone={f.approved ? 'absent' : 'late'}>{f.approved ? 'Approved' : 'Pending'}</Badge>,
              },
            ]}
          />
        </Section>
      </div>
      )}
    </AppShell>
  );
};

export default CloserDashboard;
