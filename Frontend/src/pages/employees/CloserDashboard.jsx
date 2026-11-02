import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { salesTargetAPI } from '../../utils/api';
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
};

const CloserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [closes, setCloses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getCurrentSalesShiftDate);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 });

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

  // /auth/me populates employeeId with the employee's name and ID
  const profile = typeof user?.employeeId === 'object' ? user.employeeId : null;
  const name = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : user?.username;

  const dayLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' })
    : 'Selected day';

  return (
    <AppShell
      nav={[{ key: 'closes', label: 'My closes', icon: ClipboardCheck, active: true, onClick: () => {} }]}
      user={{ name, detail: profile?.employeeId || 'Verifier' }}
      onSignOut={handleLogout}
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold text-ink">My closes</h1>
          <p className="mt-1 text-sm text-muted">You earn {formatPKR(COMMISSION)} for every close QA approves.</p>
        </div>
      </div>

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
                ? `No ${statusFilter === 'disapproved' ? 'rejected' : statusFilter} closes on ${dayLabel}.`
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
    </AppShell>
  );
};

export default CloserDashboard;
