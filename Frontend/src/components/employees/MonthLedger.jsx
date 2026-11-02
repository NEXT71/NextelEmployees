import { FileText } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';

export const formatPKR = (amount) => `PKR ${Math.round(amount || 0).toLocaleString('en-US')}`;

const Row = ({ label, amount, sign, tone, sub, children }) => (
  <div className={sub ? 'py-1 pl-4' : 'py-3'}>
    <div className={`flex items-baseline justify-between gap-4 ${sub ? 'text-xs text-muted' : 'text-sm text-ink'}`}>
      <span>{label}</span>
      <span className={`tabular-nums whitespace-nowrap ${tone || ''}`}>
        {sign}{formatPKR(amount)}
      </span>
    </div>
    {children}
  </div>
);

// Payslip-style estimate for the current month
const MonthLedger = ({ baseSalary, absentDays, fines, pendingFines, bonuses, onViewSlips }) => {
  const absenceDeduction = absentDays * (baseSalary / 30);
  const finesTotal = fines.reduce((sum, f) => sum + (f.amount || 0), 0);
  const bonusTotal = bonuses.reduce((sum, b) => sum + (b.amount || 0), 0);
  const net = baseSalary - absenceDeduction - finesTotal + bonusTotal;

  return (
    <Panel className="px-5 pt-2 pb-5">
      <div className="divide-y divide-line">
        <Row label="Base salary" amount={baseSalary} />
        {absentDays > 0 && (
          <Row
            label={`Absences (${absentDays} ${absentDays === 1 ? 'day' : 'days'})`}
            amount={absenceDeduction}
            sign="− "
            tone="text-absent"
          />
        )}
        <Row label="Fines" amount={finesTotal} sign={finesTotal ? '− ' : ''} tone={finesTotal ? 'text-absent' : ''}>
          {fines.map((fine) => (
            <Row
              key={fine._id}
              sub
              label={`${fine.type} on ${new Date(fine.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              amount={fine.amount}
              sign="− "
            />
          ))}
          {pendingFines > 0 && (
            <p className="pl-4 pt-1 text-xs text-late">
              {pendingFines} more {pendingFines === 1 ? 'fine is' : 'fines are'} pending review
            </p>
          )}
        </Row>
        <Row label="Bonuses" amount={bonusTotal} sign={bonusTotal ? '+ ' : ''} tone={bonusTotal ? 'text-present' : ''} />
      </div>

      <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink pt-3 mt-1">
        <span className="text-base font-semibold text-ink">Estimated net pay</span>
        <span className="text-base font-semibold text-ink tabular-nums whitespace-nowrap">{formatPKR(net)}</span>
      </div>
      <p className="mt-1 text-xs text-muted">Your salary slip shows the final amount.</p>

      {onViewSlips && (
        <Button variant="secondary" icon={FileText} onClick={onViewSlips} className="mt-4 w-full justify-center">
          View salary slips
        </Button>
      )}
    </Panel>
  );
};

export default MonthLedger;
