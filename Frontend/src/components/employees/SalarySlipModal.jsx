import React from 'react';
import { X, DollarSign, AlertCircle } from 'lucide-react';

const SalarySlipModal = ({ isOpen, onClose, salarySlip }) => {
  if (!isOpen || !salarySlip) return null;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // Format date to readable format
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Calculate net pay
  const netPay = (salarySlip.baseSalary || 0) + (salarySlip.bonuses || 0) - (salarySlip.deductions || 0);

  // Parse notes to extract deduction breakdown
  const parseDeductionBreakdown = (notes) => {
    if (!notes) return null;
    
    // Example notes format: "Fines: 1000 | Unpaid Leaves: 250 (5 absent days)"
    const finesMatch = notes.match(/Fines:\s*([\d,.]+)/);
    const leavesMatch = notes.match(/Unpaid Leaves:\s*([\d,.]+)\s*\((.*?)\)/);
    
    return {
      fines: finesMatch ? finesMatch[1] : '0',
      leaves: leavesMatch ? leavesMatch[1] : '0',
      absenceInfo: leavesMatch ? leavesMatch[2] : ''
    };
  };

  const breakdown = parseDeductionBreakdown(salarySlip.notes);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-white" />
            <h3 className="text-2xl font-bold text-white">Salary Slip</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Employee Information */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h4 className="text-lg font-bold text-gray-900 mb-4">Employee Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 font-medium">Name</p>
                <p className="text-lg text-gray-900 font-semibold">
                  {salarySlip.employee?.firstName} {salarySlip.employee?.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Employee ID</p>
                <p className="text-lg text-gray-900 font-semibold">
                  {salarySlip.employee?.employeeId}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Department</p>
                <p className="text-lg text-gray-900 font-semibold">
                  {salarySlip.employee?.department || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Month</p>
                <p className="text-lg text-gray-900 font-semibold">
                  {formatDate(salarySlip.month)}
                </p>
              </div>
            </div>
          </div>

          {/* Salary Breakdown */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h4 className="text-lg font-bold text-gray-900 mb-4">Salary Breakdown</h4>
            
            <div className="space-y-3">
              {/* Base Salary */}
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <span className="text-gray-700 font-medium">Base Salary</span>
                <span className="text-blue-700 font-bold text-lg">
                  {formatCurrency(salarySlip.baseSalary)}
                </span>
              </div>

              {/* Bonuses */}
              {(salarySlip.bonuses || 0) > 0 && (
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Bonuses</span>
                  <span className="text-green-700 font-bold text-lg">
                    +{formatCurrency(salarySlip.bonuses)}
                  </span>
                </div>
              )}

              {/* Deductions */}
              {(salarySlip.deductions || 0) > 0 && (
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Total Deductions</span>
                  <span className="text-red-700 font-bold text-lg">
                    -{formatCurrency(salarySlip.deductions)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Deduction Details */}
          {breakdown && (
            <div className="mb-8 pb-6 border-b border-gray-200">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Deduction Details
              </h4>
              
              <div className="space-y-3">
                {/* Fines */}
                <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <span className="text-gray-700 font-medium">Fines</span>
                  <span className="text-orange-700 font-bold text-lg">
                    {formatCurrency(breakdown.fines)}
                  </span>
                </div>

                {/* Leave Deductions */}
                <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div>
                    <p className="text-gray-700 font-medium">Unpaid Leaves</p>
                    <p className="text-sm text-gray-600">{breakdown.absenceInfo}</p>
                  </div>
                  <span className="text-yellow-700 font-bold text-lg">
                    {formatCurrency(breakdown.leaves)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {salarySlip.notes && (
            <div className="mb-8 pb-6 border-b border-gray-200">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Notes</h4>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {salarySlip.notes}
              </p>
            </div>
          )}

          {/* Net Pay (Summary) */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wide mb-2">Total Net Pay</p>
            <p className="text-4xl font-bold">{formatCurrency(netPay)}</p>
            <p className="text-blue-100 text-xs mt-2">
              {salarySlip.baseSalary} {salarySlip.bonuses > 0 ? `+ ${salarySlip.bonuses}` : ''} - {salarySlip.deductions} = {netPay}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Generated on {formatDate(salarySlip.createdAt || new Date())}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Print Slip
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalarySlipModal;
