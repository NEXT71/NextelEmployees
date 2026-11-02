import { useState } from 'react';
import { Check } from 'lucide-react';
import { salaryAPI } from '../../utils/api';
import { formatPKR } from '../employees/MonthLedger';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { Field, Input, Textarea } from '../ui/Field';

const Line = ({ label, value, tone = 'text-ink' }) => (
  <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
    <span className="text-muted">{label}</span>
    <span className={`tabular-nums ${tone}`}>{value}</span>
  </div>
);

const BonusModal = ({ isOpen, onClose, onSuccess, salary = null }) => {
  const [bonusAmount, setBonusAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddBonus = async () => {
    if (!bonusAmount || !salary) {
      setError('Enter a bonus amount.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const updateData = {
        bonuses: parseFloat(bonusAmount),
        notes: notes || `Bonus: ${bonusAmount}`
      };

      const response = await salaryAPI.updateSalary(salary._id, updateData);

      if (response.success) {
        onSuccess?.();
        resetModal();
      }
    } catch (err) {
      setError(err.message || 'Could not save the bonus. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setBonusAmount('');
    setNotes('');
    setError('');
    onClose();
  };

  if (!isOpen || !salary) return null;

  const netSalary = (salary.baseSalary || 0) + (parseFloat(bonusAmount) || 0) - (salary.deductions || 0);
  const month = new Date(salary.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Dialog
      open
      onClose={resetModal}
      size="max-w-md"
      title="Set bonus"
      description={`${salary.employee?.firstName || ''} ${salary.employee?.lastName || ''}, ${month}`}
      footer={
        <>
          <Button variant="secondary" onClick={resetModal} disabled={loading}>Cancel</Button>
          <Button icon={Check} onClick={handleAddBonus} disabled={loading || !bonusAmount}>
            {loading ? 'Saving…' : 'Save bonus'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <div className="divide-y divide-line border-y border-line">
          <Line label="Base salary" value={formatPKR(salary.baseSalary)} />
          <Line label="Deductions" value={`− ${formatPKR(salary.deductions)}`} tone={salary.deductions ? 'text-absent' : 'text-ink'} />
          {salary.bonuses > 0 && <Line label="Current bonus" value={formatPKR(salary.bonuses)} tone="text-present" />}
        </div>

        <Field
          label="Bonus amount (PKR)"
          htmlFor="bonus-amount"
          hint={salary.bonuses > 0 ? `Replaces the current bonus of ${formatPKR(salary.bonuses)}.` : undefined}
        >
          <Input
            id="bonus-amount"
            type="number"
            value={bonusAmount}
            onChange={(e) => setBonusAmount(e.target.value)}
            min="0"
            step="100"
            autoFocus
          />
        </Field>

        <Field label="Note (optional)" htmlFor="bonus-notes">
          <Textarea
            id="bonus-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Performance bonus"
            rows={2}
            className="resize-none"
          />
        </Field>

        {bonusAmount && (
          <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink pt-3">
            <span className="text-sm font-semibold text-ink">New net salary</span>
            <span className="text-base font-semibold text-ink tabular-nums">{formatPKR(netSalary)}</span>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default BonusModal;
