import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { salesTargetAPI } from '../../utils/api';
import { formatSalesShiftDate, getCurrentSalesShiftDate } from '../../utils/salesShift';
import { formatPKR } from '../../components/employees/MonthLedger';
import { Section } from '../../components/ui/Panel';
import StatGroup from '../../components/ui/StatGroup';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { Input, Select } from '../../components/ui/Field';

const PERIOD_LABEL = { day: 'day', week: 'week', month: 'month' };

const statusBadge = {
  approved: <Badge tone="present">Approved</Badge>,
  pending: <Badge tone="late">Pending</Badge>,
  disapproved: <Badge tone="absent">Rejected</Badge>,
};

// Closes on the bonus lines (D1, D3, D4, D6, D12, D36, D38) for a day, week or month
const BonusLinesTab = () => {
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(getCurrentSalesShiftDate);
  const [status, setStatus] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await salesTargetAPI.getMyBonusLineCloses({ period, date, status });
      setData(res?.data || null);
    } catch (e) {
      setError(`Could not load bonus line closes: ${e.message || 'unknown error'}.`);
    } finally {
      setLoading(false);
    }
  }, [period, date, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <StatGroup
        items={[
          { label: `Closes this ${PERIOD_LABEL[period]}`, value: data?.total ?? '—' },
          { label: 'Approved', value: data?.approved ?? '—', tone: 'present' },
          { label: 'Pending', value: data?.pending ?? '—' },
          { label: 'Daily bonus earned', value: data ? formatPKR(data.totalBonus) : '—', tone: 'present' },
        ]}
      />

      <Section
        title="Bonus lines (D1, D3, D4, D6, D12, D36, D38)"
        actions={
          <>
            <Select aria-label="Period" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-28">
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </Select>
            <Input type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-36">
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="disapproved">Rejected</option>
            </Select>
            <Button variant="ghost" size="icon" icon={RefreshCw} onClick={load} disabled={loading} aria-label="Refresh" />
          </>
        }
      >
        {period !== 'day' && (
          <DataTable
            loading={loading}
            empty="No bonus line closes in this period."
            rows={data?.daily || []}
            columns={[
              { key: 'date', header: 'Shift day', render: (row) => new Date(`${row.date}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }) },
              { key: 'approved', header: 'Approved', align: 'right', render: (row) => row.approved },
              { key: 'pending', header: 'Pending', align: 'right', render: (row) => row.pending },
              {
                key: 'bonus',
                header: 'Daily bonus',
                align: 'right',
                render: (row) => (row.bonus ? <span className="text-present">{formatPKR(row.bonus)}</span> : <span className="text-muted">—</span>),
              },
            ]}
          />
        )}
        <div className={period !== 'day' ? 'mt-6' : undefined}>
          <DataTable
            loading={loading}
            empty="No bonus line closes in this period."
            rows={data?.closes || []}
            columns={[
              {
                key: 'customer',
                header: 'Customer',
                render: (row) => (row.customer?.firstName ? `${row.customer.firstName} ${row.customer.lastName}` : '—'),
              },
              { key: 'agent', header: 'CSR', render: (row) => row.agentName || '—' },
              { key: 'dids', header: 'DIDs', render: (row) => row.dids || '—' },
              { key: 'status', header: 'Status', render: (row) => statusBadge[row.status] || <Badge>{row.status}</Badge> },
              { key: 'date', header: 'Sale date', render: (row) => formatSalesShiftDate(row.createdAt || row.saleDate) },
            ]}
          />
        </div>
      </Section>
    </div>
  );
};

export default BonusLinesTab;
