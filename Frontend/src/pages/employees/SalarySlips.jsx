import { useEffect, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import EmployeeShell from '../../components/employees/EmployeeShell';
import { formatPKR } from '../../components/employees/MonthLedger';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { salaryAPI } from '../../utils/api';

const netPayOf = (slip) => (slip.baseSalary || 0) + (slip.bonuses || 0) - (slip.deductions || 0);
const monthOf = (slip) => new Date(slip.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const Line = ({ label, value, tone = 'text-ink' }) => (
  <div className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
    <span className="text-ink">{label}</span>
    <span className={`tabular-nums ${tone}`}>{value}</span>
  </div>
);

const EmployeeSalarySlips = () => {
  const [salarySlips, setSalarySlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchSalarySlips = async () => {
      try {
        setLoading(true);
        const response = await salaryAPI.getMySalarySlips();
        if (response.success) {
          const slips = response.data || [];
          setSalarySlips(slips);
          setExpandedId(slips[0]?._id || null);
        } else {
          setError('Could not load your salary slips. Refresh the page to try again.');
        }
      } catch (err) {
        setError(err.message || 'Could not load your salary slips. Refresh the page to try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSalarySlips();
  }, []);

  const handleDownloadSlip = (slip) => {
    const csvContent = `
SALARY SLIP
Employee Name,${slip.employee?.firstName} ${slip.employee?.lastName}
Employee ID,${slip.employee?.employeeId}
Month,${monthOf(slip)}

EARNINGS
Base Salary,${slip.baseSalary}
Bonuses,${slip.bonuses || 0}

DEDUCTIONS
Deductions,${slip.deductions || 0}

NET SALARY,${netPayOf(slip)}
    `.trim();

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-slip-${slip.employee?.employeeId}-${new Date(slip.month).toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalPaid = salarySlips.reduce((sum, s) => sum + netPayOf(s), 0);

  return (
    <EmployeeShell>
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-ink">Salary slips</h1>
        {salarySlips.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            {salarySlips.length} {salarySlips.length === 1 ? 'slip' : 'slips'}, {formatPKR(totalPaid)} net in total
          </p>
        )}
      </div>

      {error && <Alert className="mb-6">{error}</Alert>}

      {loading ? (
        <p className="text-sm text-muted">Loading your salary slips…</p>
      ) : salarySlips.length === 0 ? (
        !error && (
          <Panel className="p-6 text-sm">
            <p className="font-medium text-ink">No salary slips yet</p>
            <p className="mt-1 text-muted">Your slip appears here once payroll generates it for the month.</p>
          </Panel>
        )
      ) : (
        <Panel className="overflow-hidden max-w-3xl">
          <ul className="divide-y divide-line">
            {salarySlips.map((slip) => {
              const isExpanded = expandedId === slip._id;
              const panelId = `slip-${slip._id}`;
              return (
                <li key={slip._id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : slip._id)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shift"
                  >
                    <span className="flex-1 text-sm font-medium text-ink">{monthOf(slip)}</span>
                    <span className="text-sm font-semibold text-ink tabular-nums">{formatPKR(netPayOf(slip))}</span>
                    <ChevronDown className={`w-4 h-4 text-muted shrink-0 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>

                  {isExpanded && (
                    <div id={panelId} className="px-5 pb-5">
                      <div className="divide-y divide-line border-t border-line">
                        <Line label="Base salary" value={formatPKR(slip.baseSalary)} />
                        <Line
                          label="Bonuses"
                          value={slip.bonuses > 0 ? `+ ${formatPKR(slip.bonuses)}` : formatPKR(0)}
                          tone={slip.bonuses > 0 ? 'text-present' : 'text-ink'}
                        />
                        <Line
                          label="Deductions"
                          value={slip.deductions > 0 ? `− ${formatPKR(slip.deductions)}` : formatPKR(0)}
                          tone={slip.deductions > 0 ? 'text-absent' : 'text-ink'}
                        />
                      </div>
                      <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink pt-3 mt-1">
                        <span className="text-base font-semibold text-ink">Net pay</span>
                        <span className="text-base font-semibold text-ink tabular-nums">{formatPKR(netPayOf(slip))}</span>
                      </div>

                      {slip.notes && (
                        <p className="mt-4 rounded-lg bg-paper px-3 py-2.5 text-sm text-ink-soft whitespace-pre-line">{slip.notes}</p>
                      )}

                      <Button variant="secondary" size="sm" icon={Download} onClick={() => handleDownloadSlip(slip)} className="mt-4">
                        Download CSV
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </EmployeeShell>
  );
};

export default EmployeeSalarySlips;
