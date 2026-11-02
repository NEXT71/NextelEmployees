import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import EmployeeShell from '../../components/employees/EmployeeShell';
import ShiftPanel, { formatPKT } from '../../components/employees/ShiftPanel';
import AttendanceCalendar, { pktParts } from '../../components/employees/AttendanceCalendar';
import MonthLedger, { formatPKR } from '../../components/employees/MonthLedger';
import { Section } from '../../components/ui/Panel';
import DataTable from '../../components/ui/DataTable';
import Badge, { statusTone } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { employeeAPI, attendanceAPI, fineAPI, bonusAPI, clearAuth } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { isWithinAttendanceWindow, isWithinClockInWindow } from '../../utils/attendanceTimeAccess';
import { subscribeSocket } from '../../utils/socket';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric' });

const greeting = (now) => {
  const hour = Number(new Date(now).toLocaleString('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', hourCycle: 'h23' }));
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [fines, setFines] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clockInAt, setClockInAt] = useState(null);
  const [clockOutAt, setClockOutAt] = useState(null);
  const [clockBusy, setClockBusy] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingFines, setLoadingFines] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [finesError, setFinesError] = useState(null);

  const fetchAttendanceData = async (employeeId, bypassCache = false) => {
    setLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const response = await attendanceAPI.getAttendanceByEmployee(employeeId, { bypassCache });
      const attendanceData = response?.data || response || [];
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
    } catch (err) {
      console.error('Attendance fetch error:', err);
      setAttendanceError(err.message || 'Could not load attendance records.');
      setAttendance([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const fetchFinesData = async (bypassCache = false) => {
    setLoadingFines(true);
    setFinesError(null);
    try {
      const response = await fineAPI.getEmployeeFines({ bypassCache });
      const finesData = response?.data || response;
      if (Array.isArray(finesData)) {
        setFines(finesData);
      } else {
        setFines([]);
        setFinesError('Fines came back in an unexpected format.');
      }
    } catch (err) {
      console.error('Fines fetch error:', err);
      setFinesError(err.message || 'Could not load fines.');
      setFines([]);
    } finally {
      setLoadingFines(false);
    }
  };

  const fetchBonuses = async () => {
    try {
      const res = await bonusAPI.getMyBonuses();
      setBonuses(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error('Bonuses fetch error:', err);
      setBonuses([]);
    }
  };

  const checkClockInStatus = async (employeeId) => {
    try {
      const response = await attendanceAPI.getAttendanceStatus(employeeId);
      const record = response?.data?.hasClockedIn ? response.data.record : null;
      setClockInAt(record?.clockIn || null);
      setClockOutAt(record?.clockOut || null);
    } catch (err) {
      console.error('Error checking clock-in status:', err);
      setClockInAt(null);
      setClockOutAt(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!user?._id) return;

        const employeeResponse = await employeeAPI.getEmployeeByUserId(user._id);
        if (employeeResponse?.data) {
          const employeeData = employeeResponse.data;
          setEmployee(employeeData);

          await Promise.all([
            fetchAttendanceData(employeeData._id),
            fetchFinesData(),
            fetchBonuses(),
            checkClockInStatus(employeeData._id),
          ]);
        }
      } catch (err) {
        console.error('Data fetch error:', err);
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          clearAuth();
          navigate('/login');
        } else {
          setError(err.message || 'Could not load your dashboard. Refresh the page to try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, [user, navigate]);

  useEffect(() => {
    if (!employee?._id) return undefined;

    const cleanup = subscribeSocket('attendance:update', (payload) => {
      if (payload?.employeeId === employee._id && (payload.type === 'clockIn' || payload.type === 'clockOut')) {
        fetchAttendanceData(employee._id, true);
        checkClockInStatus(employee._id);
      }
    });

    return cleanup;
  }, [employee?._id]);

  const handleClockIn = async () => {
    setError('');
    if (!isWithinClockInWindow()) {
      setError('Clock-in is open from 5:30 PM to 6:00 AM PKT.');
      return;
    }
    setClockBusy(true);
    try {
      const response = await attendanceAPI.clockIn();
      if (response?.success) {
        setClockInAt(response.data.clockIn);
        setClockOutAt(null);
        await fetchAttendanceData(employee._id, true);
      }
    } catch (err) {
      console.error('ClockIn Error:', err);
      setError(err.message || 'Clock-in did not go through. Try again.');
      if (err.message?.includes('already clocked in')) {
        await checkClockInStatus(employee._id);
      }
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
      const response = await attendanceAPI.clockOut();
      if (response?.success) {
        setClockOutAt(response.data.clockOut);
        await fetchAttendanceData(employee._id, true);
      }
    } catch (err) {
      console.error('ClockOut Error:', err);
      setError(err.message || 'Clock-out did not go through. Try again.');
    } finally {
      setClockBusy(false);
    }
  };

  // This month's figures, by Pakistan date
  const thisMonth = pktParts(currentTime);
  const inThisMonth = (date) => {
    if (!date) return false;
    const { y, m } = pktParts(date);
    return y === thisMonth.y && m === thisMonth.m;
  };
  const absentDays = attendance.filter((r) => inThisMonth(r.date) && r.status === 'Absent').length;
  const monthFines = fines.filter((f) => inThisMonth(f.date));
  const approvedFines = monthFines.filter((f) => f.approved);
  const monthBonuses = bonuses.filter((b) => inThisMonth(b.date));

  const firstName = employee?.firstName || user?.username || '';
  const fullName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : user?.username;

  return (
    <EmployeeShell userName={fullName} userDetail={employee?.employeeId}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-ink">
          {loading ? 'Dashboard' : `${greeting(currentTime)}, ${firstName}`}
        </h1>
        <p className="text-sm text-muted">
          {currentTime.toLocaleDateString('en-US', { timeZone: 'Asia/Karachi', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {error && (
        <Alert className="mb-6" onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading your dashboard…</p>
      ) : !employee ? (
        <p className="text-sm text-muted">
          Your login isn't linked to an employee record yet. Ask HR to link it, then sign in again.
        </p>
      ) : (
        <div className="space-y-8">
          <ShiftPanel
            now={currentTime}
            clockInAt={clockInAt}
            clockOutAt={clockOutAt}
            canClockIn={isWithinClockInWindow()}
            canClockOut={isWithinAttendanceWindow()}
            busy={clockBusy}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
            <Section title="Attendance this month" className="lg:col-span-2">
              <AttendanceCalendar records={attendance} now={currentTime} />
            </Section>
            <Section title="This month">
              <MonthLedger
                baseSalary={employee.salary?.baseSalary || 0}
                absentDays={absentDays}
                fines={approvedFines}
                pendingFines={monthFines.length - approvedFines.length}
                bonuses={monthBonuses}
                onViewSlips={() => navigate('/employee/salary-slips')}
              />
            </Section>
          </div>

          <Section
            title="Recent attendance"
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCw}
                onClick={() => fetchAttendanceData(employee._id, true)}
                disabled={loadingAttendance}
              >
                Refresh
              </Button>
            }
          >
            <DataTable
              loading={loadingAttendance}
              error={attendanceError}
              onRetry={() => fetchAttendanceData(employee._id, true)}
              empty="No attendance yet. Clock in when your shift starts."
              rows={attendance.slice(0, 10)}
              columns={[
                { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
                { key: 'in', header: 'Clock in', render: (r) => (r.clockIn ? formatPKT(r.clockIn) : '—') },
                { key: 'out', header: 'Clock out', render: (r) => (r.clockOut ? formatPKT(r.clockOut) : '—') },
                { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
              ]}
            />
          </Section>

          <div className="space-y-8">
            <Section
              title="Fines"
              actions={
                <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => fetchFinesData(true)} disabled={loadingFines}>
                  Refresh
                </Button>
              }
            >
              <DataTable
                loading={loadingFines}
                error={finesError}
                onRetry={() => fetchFinesData(true)}
                empty="No fines. Keep it that way."
                rows={fines.slice(0, 10)}
                columns={[
                  { key: 'date', header: 'Date', render: (f) => formatDate(f.date) },
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

            <Section title="Bonuses">
              <DataTable
                empty="No bonuses yet."
                rows={bonuses.slice(0, 10)}
                columns={[
                  { key: 'date', header: 'Date', render: (b) => formatDate(b.date) },
                  {
                    key: 'type',
                    header: 'Reason',
                    render: (b) => (
                      <span className="block max-w-[360px] truncate" title={b.description || b.type}>
                        {b.type}
                        {b.description && <span className="text-muted"> — {b.description}</span>}
                      </span>
                    ),
                  },
                  { key: 'amount', header: 'Amount', align: 'right', render: (b) => <span className="text-present">{formatPKR(b.amount)}</span> },
                ]}
              />
            </Section>
          </div>
        </div>
      )}
    </EmployeeShell>
  );
};

export default EmployeeDashboard;
