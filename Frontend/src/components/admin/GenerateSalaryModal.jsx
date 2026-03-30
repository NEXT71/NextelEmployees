import { useState } from 'react';
import { X, DollarSign, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { salaryAPI, employeeAPI } from '../../utils/api';

const GenerateSalaryModal = ({ isOpen, onClose, onSuccess, employees = [] }) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [step, setStep] = useState('form'); // 'form' or 'preview'

  const handleGeneratePreview = async () => {
    if (!selectedEmployee || !month || !year) {
      setError('Please select employee, month, and year');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Get employee details to show base salary
      const employeeResponse = await employeeAPI.getEmployeeById(selectedEmployee);
      const employeeData = employeeResponse.data;

      // Generate salary (this will calculate the breakdown)
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
      setError(err.message || 'Failed to generate salary preview');
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

  const getMonthName = (monthNum) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[parseInt(monthNum) - 1];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-blue-900/95 to-purple-900/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-semibold text-white">
              {step === 'form' ? 'Generate Monthly Salary' : 'Confirm Salary Generation'}
            </h2>
          </div>
          <button
            onClick={resetModal}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="flex items-gap-3 bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {step === 'form' ? (
            <>
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Select Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full bg-blue-800/80 border border-blue-500/50 rounded-lg py-2 px-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.firstName} {employee.lastName} ({employee.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-2">
                    Month
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full bg-blue-800/80 border border-blue-500/50 rounded-lg py-2 px-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = String(i + 1).padStart(2, '0');
                      return (
                        <option key={m} value={m}>
                          {getMonthName(m)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Year Selection */}
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-2">
                    Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full bg-blue-800/80 border border-blue-500/50 rounded-lg py-2 px-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const y = new Date().getFullYear() - 2 + i;
                      return (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Info Text */}
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-100">
                  System will automatically calculate deductions based on approved fines and absences for the selected month.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Preview */}
              {preview && (
                <div className="space-y-4">
                  {/* Employee Info */}
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Employee Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-200/70">Name:</span>
                        <span className="text-white font-medium">
                          {preview.employee.firstName} {preview.employee.lastName}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-200/70">ID:</span>
                        <span className="text-white font-medium">{preview.employee.employeeId}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-200/70">Month:</span>
                        <span className="text-white font-medium">
                          {getMonthName(month)} {year}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Salary Breakdown */}
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Salary Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-200/70">Base Salary:</span>
                        <span className="text-green-300 font-medium">
                          RS{preview.salary.breakdown.baseSalary.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-200/70">Approved Fines:</span>
                        <span className="text-red-300 font-medium">
                          -RS{preview.salary.breakdown.fines.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-200/70">Unpaid Leave ({preview.salary.breakdown.absentDays} days):</span>
                        <span className="text-red-300 font-medium">
                          -RS{preview.salary.breakdown.leaveDeduction.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                        <span className="text-white font-semibold">Net Salary:</span>
                        <span className="text-green-300 font-bold text-lg">
                          RS{preview.salary.breakdown.netPay.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-xs text-blue-200 font-mono">{preview.salary.notes}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-6 border-t border-white/20">
          <button
            onClick={resetModal}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200"
            disabled={loading}
          >
            {step === 'form' ? 'Cancel' : 'Edit'}
          </button>
          {step === 'form' ? (
            <button
              onClick={handleGeneratePreview}
              disabled={loading || !selectedEmployee}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Calculate & Preview
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleConfirmSalary}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm & Generate
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateSalaryModal;
