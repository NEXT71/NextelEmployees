import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ClipboardCheck, Award } from 'lucide-react';
import BonusLinesTab from './BonusLinesTab';
import { useAuth } from '../../contexts/AuthContext';
import { salesTargetAPI, attendanceAPI } from '../../utils/api';
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
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 });

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
        salesTargetAPI.getMyCloses({ status: statusFilter, date: selectedDate, page, limit: 10 })
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
  }, [statusFilter, selectedDate, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter, selectedDate]);

  const name = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : user?.username;

  const dayLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' })
    : 'Selected day';

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

        <StatGroup
          items={[
            { label: 'Earned this month', value: fmtCurrency(stats?.earningsThisMonth), tone: 'present' },
            { label: 'Approved this month', value: stats?.approvedThisMonth ?? '—' },
            {
              label: 'Rank',
              value: stats?.rank ? `#${stats.rank}` : '—',
              hint: stats?.totalVerifiers ? `of ${stats.totalVerifiers} verifiers` : undefined,
            },
            {
              label: `Approved on ${dayLabel}`,
              value: stats?.approvedThisDay ?? '—',
              hint: `${fmtCurrency(stats?.earningsThisDay)} earned`,
            },
          ]}
        />

        <Section
          title="Closes"
          actions={
            <>
              <Input
                type="date"
                aria-label="Sale date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
              <Select aria-label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
                <option value="all">All statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under review</option>
                <option value="disapproved">Rejected</option>
              </Select>
              <Button variant="ghost" size="icon" icon={RefreshCw} onClick={loadData} disabled={loading} aria-label="Refresh" />
            </>
          }
        >
          <DataTable
            loading={loading}
            empty={
              statusFilter !== 'all'
                ? `No ${statusFilter === 'disapproved' ? 'rejected' : statusFilter.replace('_', '-')} closes on ${dayLabel}.`
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
      </div>
      )}
    </AppShell>
  );
};

export default CloserDashboard;
