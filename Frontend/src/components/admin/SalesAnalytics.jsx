import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';
import { formatSalesShiftDate, getSalesShiftDate } from '../../utils/salesShift';
import { formatPKR } from '../employees/MonthLedger';
import Panel, { Section } from '../ui/Panel';
import StatGroup from '../ui/StatGroup';
import DataTable from '../ui/DataTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { Select } from '../ui/Field';

// Helper to get auth token
const getAuthToken = () => {
  try {
    return localStorage.getItem('token');
  } catch (err) {
    return null;
  }
};

// Helper to build headers with token
const getHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const agentName = (record) =>
  record?.agent?.firstName ? `${record.agent.firstName} ${record.agent.lastName}` : record?.agentName || 'Unknown';

const shiftDaysOf = (records) => new Set((records || []).map((r) => getSalesShiftDate(r.createdAt || r.saleDate))).size || 1;

// Month/year default to the current month (previously fixed at March 2026)
const SalesAnalytics = ({ month: initialMonth, year: initialYear }) => {
  const now = new Date();
  const [month, setMonth] = useState(initialMonth || now.getMonth() + 1);
  const [year, setYear] = useState(initialYear || now.getFullYear());
  const [salesData, setSalesData] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCSRs: 0,
    averageSalesPerCSR: 0,
    totalEarnings: 0,
    topPerformer: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSalesDay, setSelectedSalesDay] = useState(null);

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`;

  const loadSalesData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const url = `${API_BASE_URL}/sales-submissions/analytics/detailed?startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`Could not load analytics (${response.status}). Try refreshing.`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setSalesData(result.data);
        setStats(result.stats || {
          totalSales: 0,
          totalCSRs: 0,
          averageSalesPerCSR: 0,
          totalEarnings: 0,
          topPerformer: null,
        });
      }
    } catch (err) {
      setError(err.message || 'Could not load sales data.');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    setSelectedSalesDay(null);
    loadSalesData();
  }, [loadSalesData]);

  const visibleSalesData = selectedSalesDay
    ? salesData.filter((record) => getSalesShiftDate(record.createdAt || record.saleDate) === selectedSalesDay)
    : salesData;

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const top = stats.topPerformer;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-44">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2026, i).toLocaleDateString('en-US', { month: 'long' })}</option>
          ))}
        </Select>
        <Select aria-label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28">
          {Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <Button variant="ghost" size="icon" icon={RefreshCw} onClick={loadSalesData} disabled={loading} aria-label="Refresh" />
      </div>

      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <StatGroup
        items={[
          { label: 'Sales', value: loading ? '—' : stats.totalSales.toLocaleString('en-US') },
          { label: 'CSRs with sales', value: loading ? '—' : stats.totalCSRs },
          { label: 'Average per CSR', value: loading ? '—' : stats.averageSalesPerCSR.toLocaleString('en-US') },
          { label: 'Paid out', value: loading ? '—' : formatPKR(stats.totalEarnings), hint: 'Including bonuses' },
        ]}
      />

      {!loading && top && (
        <Panel className="px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Top CSR in {monthLabel}</p>
            <p className="text-lg font-semibold text-ink">
              {agentName(top)}
              {top.agent?.employeeId && <span className="ml-2 text-sm font-normal text-muted">{top.agent.employeeId}</span>}
            </p>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-muted">Sales</dt>
              <dd className="font-semibold text-ink tabular-nums">{top.totalSales}</dd>
            </div>
            <div>
              <dt className="text-muted">Days worked</dt>
              <dd className="font-semibold text-ink tabular-nums">{shiftDaysOf(top.records)}</dd>
            </div>
            <div>
              <dt className="text-muted">Per day</dt>
              <dd className="font-semibold text-ink tabular-nums">{(top.totalSales / shiftDaysOf(top.records)).toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-muted">Earned</dt>
              <dd className="font-semibold text-present tabular-nums">{formatPKR(top.totalEarnings)}</dd>
            </div>
          </dl>
        </Panel>
      )}

      <Section
        title={`Sales in ${monthLabel}`}
        actions={
          selectedSalesDay && (
            <p className="text-sm text-muted">
              Showing {formatSalesShiftDate(`${selectedSalesDay}T18:00:00+05:00`)}.{' '}
              <button type="button" onClick={() => setSelectedSalesDay(null)} className="text-shift font-medium hover:underline">
                Show all days
              </button>
            </p>
          )
        }
      >
        <DataTable
          loading={loading}
          empty={`No sales recorded in ${monthLabel}.`}
          rows={visibleSalesData}
          rowKey={(record, idx) => record._id || idx}
          columns={[
            {
              key: 'employee',
              header: 'CSR',
              render: (record) => (
                <>
                  <span className="font-medium">{agentName(record)}</span>
                  {record.agent?.employeeId && <span className="block text-xs text-muted">{record.agent.employeeId}</span>}
                </>
              ),
            },
            {
              key: 'date',
              header: 'Shift date',
              render: (record) => {
                const shiftDate = getSalesShiftDate(record.createdAt || record.saleDate);
                return (
                  <button
                    type="button"
                    onClick={() => setSelectedSalesDay((current) => current === shiftDate ? null : shiftDate)}
                    title="Show only this shift day"
                    className={`underline underline-offset-2 decoration-line hover:decoration-ink ${selectedSalesDay === shiftDate ? 'text-shift font-medium' : ''}`}
                  >
                    {formatSalesShiftDate(record.createdAt || record.saleDate)}
                  </button>
                );
              },
            },
            { key: 'sales', header: 'Sales', align: 'right', render: (record) => record.salesCount || 1 },
            { key: 'base', header: 'Base', align: 'right', render: (record) => formatPKR(record.pricePerSale ?? record.baseSalary ?? 1000) },
            {
              key: 'bonus',
              header: 'Bonus',
              align: 'right',
              render: (record) => (record.tierBonus > 0 ? <span className="text-present">+ {formatPKR(record.tierBonus)}</span> : <span className="text-muted">—</span>),
            },
            {
              key: 'total',
              header: 'Total',
              align: 'right',
              render: (record) => <span className="font-medium">{formatPKR(record.totalEarning ?? (record.pricePerSale || 1000) + (record.tierBonus || 0))}</span>,
            },
            {
              key: 'tier',
              header: 'Tier',
              render: (record) => {
                const tier = record.achievedTier ?? 0;
                return <Badge tone={tier ? 'shift' : 'neutral'}>{tier ? `Tier ${tier}` : 'No tier'}</Badge>;
              },
            },
          ]}
        />
      </Section>
    </div>
  );
};

export default SalesAnalytics;
