import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, ClipboardList, RefreshCw } from 'lucide-react';
import { salesTargetAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import EmployeeShell from '../../components/employees/EmployeeShell';
import { formatPKR } from '../../components/employees/MonthLedger';
import Panel, { Section } from '../../components/ui/Panel';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { Tabs, Segmented } from '../../components/ui/Tabs';
import { Select } from '../../components/ui/Field';
import { subscribeSocket } from '../../utils/socket';
import { formatSalesShiftDate, getCurrentSalesShiftDate, getSalesPeriodRange } from '../../utils/salesShift';
import { getDidCategories } from '../../utils/didCategories';

const TIERS = [
  { key: 'tier1', label: 'Tier 1', sales: '3–4 sales', bonus: 500 },
  { key: 'tier2', label: 'Tier 2', sales: '5–7 sales', bonus: 1000 },
  { key: 'tier3', label: 'Tier 3', sales: '8–9 sales', bonus: 2000 },
  { key: 'tier4', label: 'Tier 4', sales: '10–14 sales', bonus: 3000 },
  { key: 'tier5', label: 'Tier 5', sales: '15+ sales', bonus: 5000 },
];

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
];

const STATUSES = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'disapproved', label: 'Rejected' },
];

const submissionBadge = {
  approved: <Badge tone="present">Approved</Badge>,
  pending: <Badge tone="late">Pending</Badge>,
  disapproved: <Badge tone="absent">Rejected</Badge>,
};

const formatDay = (date) =>
  new Date(`${String(date).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });

const Figure = ({ label, value, hint, tone = 'text-ink' }) => (
  <div>
    <dt className="text-sm text-muted">{label}</dt>
    <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${tone}`}>{value}</dd>
    {hint && <dd className="text-xs text-muted mt-0.5">{hint}</dd>}
  </div>
);

const CSRSalesDashboard = () => {
  const { user } = useAuth();
  const currentShiftDate = getCurrentSalesShiftDate();
  const [activeMonth, setActiveMonth] = useState(Number(currentShiftDate.slice(5, 7)));
  const [activeYear, setActiveYear] = useState(Number(currentShiftDate.slice(0, 4)));
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'submissions'
  const [monthlyData, setMonthlyData] = useState(null);
  const [dailyRecords, setDailyRecords] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState('all');
  const [submissionPeriod, setSubmissionPeriod] = useState('month'); // 'today' | 'week' | 'month' | 'last30' | 'all'
  const [submissionCounts, setSubmissionCounts] = useState(null);
  const [submissionTotal, setSubmissionTotal] = useState(0);
  const [error, setError] = useState('');

  const loadMonthlyData = useCallback(async () => {
    try {
      setError('');
      setLoadingMonth(true);
      const response = await salesTargetAPI.getCsrMonthlyEarnings({ year: activeYear, month: activeMonth });
      if (response.data) {
        setMonthlyData(response.data.monthlyStats);
        setDailyRecords(response.data.dailyBreakdown || []);
      }
    } catch (err) {
      setError(err.message || 'Could not load your sales for this month.');
    } finally {
      setLoadingMonth(false);
    }
  }, [activeYear, activeMonth]);

  const loadSubmissions = useCallback(async () => {
    try {
      setSubmissionsLoading(true);
      const params = { limit: 500 };
      if (submissionStatusFilter !== 'all') params.status = submissionStatusFilter;
      const range = getSalesPeriodRange(submissionPeriod);
      if (range) {
        params.from = range.from;
        params.to = range.to;
      }
      const response = await salesTargetAPI.getMySubmissions(params);
      if (response?.data) {
        setSubmissions(response.data);
        setSubmissionCounts(response.counts || null);
        setSubmissionTotal(response.pagination?.total ?? response.data.length);
      }
    } catch (err) {
      // silently fail - submissions tab will show empty state
    } finally {
      setSubmissionsLoading(false);
    }
  }, [submissionStatusFilter, submissionPeriod]);

  useEffect(() => {
    if (user) {
      loadMonthlyData();
    }
  }, [user, loadMonthlyData]);

  useEffect(() => {
    if (user && activeTab === 'submissions') {
      loadSubmissions();
    }
  }, [user, activeTab, loadSubmissions]);

  useEffect(() => {
    const cleanup = subscribeSocket('salesSubmission:update', () => {
      if (activeTab === 'submissions') {
        loadSubmissions();
      }
    });
    return cleanup;
  }, [activeTab, loadSubmissions]);

  const monthLabel = new Date(activeYear, activeMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const maxTierDays = monthlyData ? Math.max(1, ...TIERS.map((t) => monthlyData.daysPerTier?.[t.key] || 0)) : 1;

  const emptySubmissions =
    submissionStatusFilter !== 'all'
      ? `No ${STATUSES.find((s) => s.key === submissionStatusFilter).label.toLowerCase()} sales in this period.`
      : submissionPeriod !== 'all'
        ? 'No sales submitted in this period.'
        : 'Sales you submit will show up here.';

  return (
    <EmployeeShell>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <h1 className="text-[28px] leading-tight font-semibold text-ink">My sales</h1>
        {activeTab === 'dashboard' && (
          <div className="flex items-center gap-2">
            <Select aria-label="Month" value={activeMonth} onChange={(e) => setActiveMonth(parseInt(e.target.value, 10))} className="w-44">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2026, i).toLocaleDateString('en-US', { month: 'long' })}
                </option>
              ))}
            </Select>
            <Select aria-label="Year" value={activeYear} onChange={(e) => setActiveYear(parseInt(e.target.value, 10))} className="w-24">
              {[2024, 2025, 2026, 2027].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <Tabs
        className="mb-6"
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'dashboard', label: 'Overview', icon: TrendingUp },
          { key: 'submissions', label: 'Submissions', icon: ClipboardList, count: monthlyData?.totalPendingSales },
        ]}
      />

      {activeTab === 'submissions' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented label="Period" items={PERIODS} value={submissionPeriod} onChange={setSubmissionPeriod} />
            <Segmented label="Status" items={STATUSES} value={submissionStatusFilter} onChange={setSubmissionStatusFilter} />
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={loadSubmissions} disabled={submissionsLoading} className="ml-auto">
              Refresh
            </Button>
          </div>

          {submissionCounts && (
            <p className="text-sm text-muted">
              <span className="text-late font-medium tabular-nums">{submissionCounts.pending}</span> pending,{' '}
              <span className="text-present font-medium tabular-nums">{submissionCounts.approved}</span> approved,{' '}
              <span className="text-absent font-medium tabular-nums">{submissionCounts.disapproved}</span> rejected
              {submissionTotal > submissions.length && `. Showing the latest ${submissions.length} of ${submissionTotal}.`}
            </p>
          )}

          <DataTable
            loading={submissionsLoading}
            empty={emptySubmissions}
            rows={submissions}
            columns={[
              { key: 'date', header: 'Date', render: (s) => formatSalesShiftDate(s.createdAt || s.saleDate) },
              {
                key: 'customer',
                header: 'Customer',
                render: (s) => (
                  <>
                    {s.customer?.firstName} {s.customer?.lastName}
                    <span className="block text-xs text-muted">{s.customer?.phone}</span>
                  </>
                ),
              },
              {
                key: 'dids',
                header: 'DIDs',
                render: (s) => (
                  <>
                    {s.dids}
                    {getDidCategories(s.dids) && <span className="block text-xs text-muted">{getDidCategories(s.dids)}</span>}
                  </>
                ),
              },
              { key: 'closer', header: 'Closer', render: (s) => s.closer || '—' },
              { key: 'status', header: 'Status', render: (s) => submissionBadge[s.status] || <Badge>{s.status}</Badge> },
              {
                key: 'note',
                header: 'Note',
                render: (s) =>
                  s.status === 'approved' ? (
                    <span className="text-present">{formatPKR(1000)} earned</span>
                  ) : s.status === 'disapproved' && s.rejectionReason ? (
                    <span className="block max-w-[260px] truncate text-absent" title={s.rejectionReason}>{s.rejectionReason}</span>
                  ) : s.status === 'pending' ? (
                    <span className="text-muted">Awaiting QA review</span>
                  ) : (
                    '—'
                  ),
              },
            ]}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

          {loadingMonth && !monthlyData ? (
            <p className="text-sm text-muted">Loading {monthLabel}…</p>
          ) : monthlyData ? (
            <>
              <Panel className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-10">
                <div>
                  <p className="text-sm text-muted">Earned in {monthLabel}</p>
                  <p className="mt-1 text-[40px] leading-none font-semibold text-ink tabular-nums">
                    {formatPKR(monthlyData.totalEarnings)}
                  </p>
                  <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Figure
                      label="Base salary"
                      value={formatPKR(monthlyData.totalBaseSalary)}
                      hint={`${monthlyData.totalDays} ${monthlyData.totalDays === 1 ? 'day' : 'days'} worked`}
                    />
                    <Figure label="Tier bonus" value={formatPKR(monthlyData.totalTierBonus)} hint="Daily performance bonus" />
                    <Figure
                      label="Weekly bonus"
                      value={formatPKR(monthlyData.totalWeeklyBonus || 0)}
                      hint="PKR 5,000 for 35 approved sales in a week"
                    />
                  </dl>
                </div>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-4 content-start lg:border-l lg:border-line lg:pl-10">
                  <Figure label="Approved" value={monthlyData.totalSales ?? 0} tone="text-present" />
                  <Figure label="Pending" value={monthlyData.totalPendingSales ?? 0} tone="text-late" />
                  <Figure label="Rejected" value={monthlyData.totalDisapprovedSales ?? 0} tone="text-absent" />
                  <Figure label="Submitted" value={monthlyData.totalSubmittedSales ?? 0} />
                </dl>
              </Panel>

              <Section title="Days at each tier">
                <Panel className="overflow-hidden">
                  <ul className="divide-y divide-line">
                    {TIERS.map((tier) => {
                      const days = monthlyData.daysPerTier?.[tier.key] || 0;
                      return (
                        <li key={tier.key} className="grid grid-cols-[1fr_auto] sm:grid-cols-[180px_1fr_72px] items-center gap-x-4 gap-y-2 px-5 py-3">
                          <div>
                            <p className="text-sm font-medium text-ink">{tier.label}</p>
                            <p className="text-xs text-muted">
                              {tier.sales}, {formatPKR(tier.bonus)} a day
                            </p>
                          </div>
                          <div className="order-last col-span-2 sm:order-none sm:col-span-1 h-2 rounded-full bg-paper overflow-hidden">
                            <div className="h-full rounded-full bg-ink" style={{ width: `${(days / maxTierDays) * 100}%` }} />
                          </div>
                          <p className="text-sm text-ink tabular-nums text-right">
                            {days} {days === 1 ? 'day' : 'days'}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  {monthlyData.bestDay && (
                    <p className="px-5 py-3 border-t border-line bg-paper text-sm text-muted">
                      Best day:{' '}
                      <span className="text-ink font-medium">
                        {new Date(monthlyData.bestDay.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>{' '}
                      with {monthlyData.bestDay.sales} sales, earning{' '}
                      <span className="text-ink font-medium tabular-nums">{formatPKR(monthlyData.bestDay.earning)}</span>
                    </p>
                  )}
                </Panel>
              </Section>

              <Section title="Daily breakdown">
                <DataTable
                  empty={`No sales recorded in ${monthLabel}.`}
                  rows={dailyRecords}
                  rowKey={(r, i) => `${r.date}-${i}`}
                  columns={[
                    { key: 'date', header: 'Date', render: (r) => formatDay(r.date) },
                    { key: 'sales', header: 'Sales', align: 'right', render: (r) => r.sales },
                    { key: 'base', header: 'Base', align: 'right', render: (r) => formatPKR(r.baseSalary) },
                    {
                      key: 'bonus',
                      header: 'Tier bonus',
                      align: 'right',
                      render: (r) => (r.tierBonus > 0 ? <span className="text-present">+ {formatPKR(r.tierBonus)}</span> : <span className="text-muted">—</span>),
                    },
                    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-medium">{formatPKR(r.totalEarning)}</span> },
                    {
                      key: 'tier',
                      header: 'Tier',
                      render: (r) => <Badge tone={r.tier?.startsWith('No Tier') ? 'neutral' : 'shift'}>{r.tier?.split(' (')[0] || '—'}</Badge>,
                    },
                  ]}
                />
              </Section>
            </>
          ) : null}
        </div>
      )}
    </EmployeeShell>
  );
};

export default CSRSalesDashboard;
