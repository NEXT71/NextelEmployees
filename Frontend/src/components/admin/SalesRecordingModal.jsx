import { useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, AlertCircle, CheckCircle, Award } from 'lucide-react';
import { salesTargetAPI, employeeAPI } from '../../utils/api';
import Toast from '../common/Toast';

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
        console.log(`✅ Loaded ${response.data.length} employees for department: ${department}`, response.data.slice(0, 2));
        setEmployees(response.data);
      } else {
        console.warn('No employee data in response:', response);
        setError('No employees returned from server');
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
      setError(`Failed to load employees: ${err.message}`);
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
    // Validate all required fields
    if (!selectedEmployee) {
      setError('Please select an employee');
      return;
    }
    if (!date) {
      setError('Please select a date');
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

      // Validate employee selection
      if (!selectedEmployee) {
        setError('Employee selection is required');
        setSubmitting(false);
        return;
      }

      const employee = employees.find(e => e._id === selectedEmployee);
      if (!employee) {
        setError('Selected employee not found in employee list');
        setSubmitting(false);
        return;
      }

      const payload = {
        employeeId: selectedEmployee,
        salesCount: 1,  // Each record = 1 sale
        date: date  // Backend will convert to Date object
      };

      console.log('📤 Submitting sales record', { 
        employeeId: selectedEmployee,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        payload 
      });
      const response = await salesTargetAPI.recordDailySales(payload);

      if (response.success) {
        setSuccess(`Sale recorded! Earned RS${response.data.totalEarning} (${response.data.tierInfo.tierName})`);
        setTimeout(() => {
          resetModal();
          onSuccess?.();
        }, 1500);
      } else {
        setError(response.message || 'Failed to record sales');
      }
    } catch (err) {
      console.error('❌ Sales submission error:', err);
      // Provide more helpful error messages
      if (err.message?.includes('Employee')) {
        setError(`Employee issue: ${err.message}. Please refresh and reselect the employee.`);
      } else {
        setError(err.message || 'Failed to record sales');
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-blue-900/95 to-purple-900/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">
                {preview ? 'Confirm Sales Record' : 'Record Daily Sales'}
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
            {!preview ? (
              <>
                {/* Error Display */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-900/60 border border-red-600/50 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-200">{error}</span>
                  </div>
                )}

                {/* Employee Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-200">Select CSR <span className="text-red-400">*</span></label>
                    <button
                      type="button"
                      onClick={loadEmployees}
                      disabled={loading}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-500"
                    >
                      {loading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                  {loading ? (
                    <div className="w-full bg-blue-800/80 border border-blue-600/50 text-white rounded-lg px-3 py-2 text-sm text-gray-400">
                      Loading employees...
                    </div>
                  ) : employees.length === 0 ? (
                    <div className="w-full bg-blue-800/80 border border-red-600/50 text-white rounded-lg px-3 py-2 text-sm text-red-300">
                      No employees found
                    </div>
                  ) : (
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="w-full bg-blue-800/80 border border-blue-600/50 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="">Choose an employee...</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeId})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Date <span className="text-red-400">*</span></label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-blue-800/80 border border-blue-600/50 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </>
            ) : (
              /* Preview */
              <div className="space-y-4">
                <div className="bg-blue-800/50 rounded-lg p-4 border border-blue-600/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-medium">{preview.employee.firstName} {preview.employee.lastName}</h3>
                      <p className="text-xs text-gray-400">{preview.employee.employeeId}</p>
                      <p className="text-xs text-gray-600 mt-1">ID: {selectedEmployee?.substring(0, 12)}...</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-amber-400">{preview.salesCount}</div>
                      <p className="text-xs text-gray-400">Sales</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>Base Salary (RS 1000/sale):</span>
                      <span className="text-white font-medium">RS {preview.baseSalary.toLocaleString()}</span>
                    </div>
                    {preview.bonus > 0 && (
                      <div className="flex justify-between text-green-300">
                        <span>{preview.tierName} Bonus:</span>
                        <span className="text-green-400 font-medium">+ RS {preview.bonus.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-blue-600/50 pt-2 mt-2">
                      <span className="text-gray-300">Total Earning:</span>
                      <span className="text-green-400">RS {preview.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-3 flex items-start gap-2">
                  <Award className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-200">{preview.tierName}</p>
                    <p className="text-xs text-amber-300 mt-1">
                      {preview.tier === 0 && 'Below target - work towards 5 sales for Tier 1'}
                      {preview.tier === 1 && 'Base rate applied'}
                      {preview.tier === 2 && '20% bonus applied for achieving 7+ sales'}
                      {preview.tier === 3 && '50% bonus applied for achieving 10+ sales'}
                    </p>
                  </div>
                </div>

                {preview.notes && (
                  <div className="bg-blue-800/30 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Notes:</p>
                    <p className="text-sm text-gray-200">{preview.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-600/50 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-white/20">
            <button
              onClick={resetModal}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {preview ? 'Back' : 'Cancel'}
            </button>
            <button
              onClick={preview ? handleSubmit : handlePreview}
              disabled={loading || submitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {preview ? 'Confirm & Save' : 'Preview'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {success && <Toast type="success" message={success} onClose={() => setSuccess('')} />}
    </>
  );
};

export default SalesRecordingModal;
