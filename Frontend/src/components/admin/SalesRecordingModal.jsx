import { useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import { salesTargetAPI, employeeAPI } from '../../utils/api';
import { formatPKR } from '../employees/MonthLedger';
import Toast from '../common/Toast';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { Field, Input, Select } from '../ui/Field';

const SalesRecordingModal = ({ isOpen, onClose, onSuccess, department = 'Sales' }) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);

  // Load CSR employees on mount
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await employeeAPI.getEmployees({ department });
      if (response && response.data && Array.isArray(response.data)) {
        setEmployees(response.data);
      } else {
        console.warn('No employee data in response:', response);
        setError('The server returned no employees. Refresh the list to try again.');
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
      setError(`Could not load employees: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen, loadEmployees]);

  const handlePreview = async () => {
    if (!selectedEmployee) {
      setError('Choose a CSR.');
      return;
    }
    if (!date) {
      setError('Choose a date.');
      return;
    }

    // With the new schema, each record = 1 sale
    const baseSalary = 1000;  // Fixed base per sale
    const employee = employees.find(e => e._id === selectedEmployee);

    setPreview({
      employee,
      salesCount: 1,
      baseSalary,
      bonus: 0,  // Calculated daily at aggregation level
      total: baseSalary,
      tier: 0,   // Will be calculated based on daily total
      tierName: 'Tier calculated from daily total',
      date
    });

    setError('');
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');

      if (!selectedEmployee) {
        setError('Choose a CSR.');
        setSubmitting(false);
        return;
      }

      const employee = employees.find(e => e._id === selectedEmployee);
      if (!employee) {
        setError('That employee is no longer in the list. Refresh and choose again.');
        setSubmitting(false);
        return;
      }

      const payload = {
        employeeId: selectedEmployee,
        salesCount: 1,  // Each record = 1 sale
        date: date  // Backend will convert to Date object
      };

      const response = await salesTargetAPI.recordDailySales(payload);

      if (response.success) {
        setSuccess(`Sale recorded. Earned ${formatPKR(response.data.totalEarning)} (${response.data.tierInfo.tierName}).`);
        setTimeout(() => {
          resetModal();
          onSuccess?.();
        }, 1500);
      } else {
        setError(response.message || 'Could not record the sale. Try again.');
      }
    } catch (err) {
      console.error('Sales submission error:', err);
      if (err.message?.includes('Employee')) {
        setError(`${err.message}. Refresh the list and choose the employee again.`);
      } else {
        setError(err.message || 'Could not record the sale. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setSelectedEmployee('');
    setDate(new Date().toISOString().split('T')[0]);
    setError('');
    setSuccess('');
    setPreview(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog
        open
        onClose={resetModal}
        size="max-w-md"
        title={preview ? 'Confirm sale' : 'Record a sale'}
        description={preview ? 'Each record counts as one sale. Tier bonuses are worked out from the day\'s total.' : 'Adds one sale to a CSR\'s day.'}
        footer={
          <>
            <Button variant="secondary" onClick={preview ? () => setPreview(null) : resetModal} disabled={submitting}>
              {preview ? 'Back' : 'Cancel'}
            </Button>
            <Button icon={Check} onClick={preview ? handleSubmit : handlePreview} disabled={loading || submitting}>
              {submitting ? 'Saving…' : preview ? 'Record sale' : 'Continue'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert>{error}</Alert>}

          {!preview ? (
            <>
              <Field label="CSR" htmlFor="rec-employee">
                {loading ? (
                  <p className="h-10 flex items-center text-sm text-muted">Loading employees…</p>
                ) : employees.length === 0 ? (
                  <p className="text-sm text-muted">
                    No employees in {department}.{' '}
                    <button type="button" onClick={loadEmployees} className="text-shift font-medium hover:underline">Refresh</button>
                  </p>
                ) : (
                  <Select id="rec-employee" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                    <option value="">Choose a CSR</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Date" htmlFor="rec-date">
                <Input id="rec-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </>
          ) : (
            <div>
              <p className="text-sm font-medium text-ink">{preview.employee.firstName} {preview.employee.lastName}</p>
              <p className="text-xs text-muted mb-3">
                {preview.employee.employeeId},{' '}
                {new Date(`${preview.date}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <div className="flex items-baseline justify-between gap-4 border-y border-line py-2.5 text-sm">
                <span className="text-ink">Base pay for 1 sale</span>
                <span className="tabular-nums text-ink">{formatPKR(preview.baseSalary)}</span>
              </div>
              <p className="mt-3 text-xs text-muted">
                Daily bonuses: 3, 5, 8, 10 and 15 sales earn PKR 500, 1,000, 2,000, 3,000 and 5,000.
                Weekly bonus: 35 approved CPL sales earn PKR 5,000.
              </p>
            </div>
          )}
        </div>
      </Dialog>

      {success && <Toast type="success" message={success} onClose={() => setSuccess('')} />}
    </>
  );
};

export default SalesRecordingModal;
