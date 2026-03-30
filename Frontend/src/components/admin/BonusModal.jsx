import { useState } from 'react';
import { X, Gift, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { salaryAPI } from '../../utils/api';

const BonusModal = ({ isOpen, onClose, onSuccess, salary = null }) => {
  const [bonusAmount, setBonusAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddBonus = async () => {
    if (!bonusAmount || !salary) {
      setError('Please enter bonus amount');
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
      setError(err.message || 'Failed to add bonus');
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-blue-900/95 to-purple-900/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">Add Bonus</h2>
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

          {/* Employee Information */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Salary Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-200/70">Employee:</span>
                <span className="text-white font-medium">
                  {salary.employee?.firstName} {salary.employee?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200/70">Month:</span>
                <span className="text-white font-medium">
                  {new Date(salary.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-200/70">Base Salary:</span>
                <span className="text-green-300 font-medium">RS{salary.baseSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-200/70">Deductions:</span>
                <span className="text-red-300 font-medium">-RS{salary.deductions.toLocaleString()}</span>
              </div>
              {salary.bonuses > 0 && (
                <div className="flex justify-between">
                  <span className="text-yellow-200/70">Current Bonus:</span>
                  <span className="text-yellow-300 font-medium">RS{salary.bonuses.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bonus Amount Input */}
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">
              Bonus Amount (RS)
            </label>
            <input
              type="number"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              placeholder="Enter bonus amount"
              className="w-full bg-blue-800/80 border border-blue-500/50 rounded-lg py-2 px-3 text-white font-medium placeholder-blue-300/70 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
              min="0"
              step="100"
            />
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Performance bonus, Incentive, etc."
              rows="3"
              className="w-full bg-blue-800/80 border border-blue-500/50 rounded-lg py-2 px-3 text-white font-medium placeholder-blue-300/70 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 resize-none"
            />
          </div>

          {/* Net Salary Preview */}
          {bonusAmount && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold">New Net Salary:</span>
                <span className="text-green-300 font-bold text-xl">
                  RS{netSalary.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-green-200/70 mt-2">
                ({salary.baseSalary.toLocaleString()} + {bonusAmount} - {salary.deductions.toLocaleString()})
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-6 border-t border-white/20">
          <button
            onClick={resetModal}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleAddBonus}
            disabled={loading || !bonusAmount}
            className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Add Bonus
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BonusModal;
