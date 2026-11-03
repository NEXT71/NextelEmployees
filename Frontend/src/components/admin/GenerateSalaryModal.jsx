import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { salaryAPI, employeeAPI } from '../../utils/api';
import { formatPKR } from '../employees/MonthLedger';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { Field, Select } from '../ui/Field';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const Line = ({ label, value, tone = 'text-ink' }) => (
  <div className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
    <span className="text-ink">{label}</span>
    <span className={`tabular-nums ${tone}`}>{value}</span>
  </div>
);

const GenerateSalaryModal = ({ isOpen, onClose, onSuccess, employees = [] }) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [step, setStep] = useState('form'); // 'form' or 'preview'

  // Note: generateMonthlySalary creates the salary record; the second step only shows the result.
  const handleGeneratePreview = async () => {
    if (!selectedEmployee || !month || !year) {
      setError('Choose an employee, month and year.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const employeeResponse = await employeeAPI.getEmployeeById(selectedEmployee);
      const employeeData = employeeResponse.data;

      const salaryResponse = await salaryAPI.generateMonthlySalary({
        employeeId: selectedEmployee,
        targetMonth: parseInt(month),
        targetYear: parseInt(year)
      });

      if (salaryResponse.success) {
        setPreview({
          employee: employeeData,
          salary: salaryResponse.data
        });
        setStep('preview');
      }
    } catch (err) {
      setError(err.message || 'Could not generate the salary. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSalary = async () => {
    setLoading(true);
    try {
      // Salary is already created during preview, just refresh the list
      onSuccess?.();
      resetModal();
    } catch (err) {
      setError(err.message || 'Failed to confirm salary');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setSelectedEmployee('');
    setMonth(String(new Date().getMonth() + 1).padStart(2, '0'));
    setYear(new Date().getFullYear());
    setError('');
    setPreview(null);
    setStep('form');
    onClose();
  };

  if (!isOpen) return null;

  const monthLabel = `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
  const breakdown = preview?.salary?.breakdown;

  return (
    <Dialog
      open
      onClose={step === 'preview' ? handleConfirmSalary : resetModal}
      size="max-w-md"
      title={step === 'form' ? 'Generate salary' : 'Salary generated'}
      description={
        step === 'form'
          ? 'Deductions for approved fines and absences in the month are calculated automatically.'
          : `${preview?.employee?.firstName || ''} ${preview?.employee?.lastName || ''}, ${monthLabel}`
      }
      footer={
        step === 'form' ? (
          <>
            <Button variant="secondary" onClick={resetModal} disabled={loading}>Cancel</Button>
            <Button icon={Wallet} onClick={handleGeneratePreview} disabled={loading || !selectedEmployee}>
              {loading ? 'Generating…' : 'Generate salary'}
            </Button>
          </>
        ) : (
          <Button onClick={handleConfirmSalary} disabled={loading}>Done</Button>
        )
      }
    >
      {error && <Alert className="mb-4">{error}</Alert>}

      {step === 'form' ? (
        <div className="space-y-4">
          <Field label="Employee" htmlFor="gen-employee">
            <Select id="gen-employee" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
              <option value="">Choose an employee</option>
              {employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.firstName} {employee.lastName} ({employee.employeeId})
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Month" htmlFor="gen-month">
              <Select id="gen-month" value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS.map((name, i) => {
                  const m = String(i + 1).padStart(2, '0');
                  return <option key={m} value={m}>{name}</option>;
                })}
              </Select>
            </Field>
            <Field label="Year" htmlFor="gen-year">
              <Select id="gen-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </Select>
            </Field>
          </div>
        </div>
      ) : (
        breakdown && (
          <div>
            <p className="text-sm text-muted mb-3">Employee ID {preview.employee.employeeId}</p>
            <div className="divide-y divide-line border-t border-line">
              <Line label="Base salary" value={formatPKR(breakdown.baseSalary)} />
              <Line label="Approved fines" value={`− ${formatPKR(breakdown.fines)}`} tone={breakdown.fines ? 'text-absent' : 'text-ink'} />
              <Line
                label={`Unpaid leave (${breakdown.absentDays} ${breakdown.absentDays === 1 ? 'day' : 'days'})`}
                value={`− ${formatPKR(breakdown.leaveDeduction)}`}
                tone={breakdown.leaveDeduction ? 'text-absent' : 'text-ink'}
              />
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink pt-3 mt-1">
              <span className="text-base font-semibold text-ink">Net pay</span>
              <span className="text-base font-semibold text-ink tabular-nums">{formatPKR(breakdown.netPay)}</span>
            </div>
            {preview.salary.notes && (
              <p className="mt-4 rounded-lg bg-paper px-3 py-2.5 text-sm text-ink-soft">{preview.salary.notes}</p>
            )}
          </div>
        )
      )}
    </Dialog>
  );
};

export default GenerateSalaryModal;
