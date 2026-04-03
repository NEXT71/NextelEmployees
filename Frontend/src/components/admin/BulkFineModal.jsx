import React, { useState } from 'react';
import { X, AlertTriangle, Users, CheckSquare, Square } from 'lucide-react';
import { FINE_TYPES } from '../../utils/constants';

const BulkFineModal = ({ isOpen, onClose, employees, onApply }) => {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [fineType, setFineType] = useState(FINE_TYPES[0].name);
  const [fineAmount, setFineAmount] = useState(FINE_TYPES[0].amount);
  const [description, setDescription] = useState('');
  const [fineDate, setFineDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const handleFineTypeChange = (e) => {
    const selectedType = FINE_TYPES.find(type => type.name === e.target.value);
    setFineType(selectedType.name);
    setFineAmount(selectedType.amount);
  };

  const toggleEmployee = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp._id));
    }
  };

  const handleApply = async () => {
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }

    setIsApplying(true);
    try {
      await onApply({
        employeeIds: selectedEmployees,
        type: fineType,
        amount: fineAmount,
        description,
        date: fineDate
      });
      
      // Reset form
      setSelectedEmployees([]);
      setDescription('');
      setSearchTerm('');
      setDepartmentFilter('');
      onClose();
    } catch (error) {
      console.error('Error applying bulk fine:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter ? emp.department === departmentFilter : true;
    
    return matchesSearch && matchesDepartment;
  });

  const departments = [...new Set(employees.map(emp => emp.department))];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/20 sticky top-0 bg-blue-900/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-white">Bulk Apply Fine</h2>
              <p className="text-xs sm:text-sm text-blue-200/80">
                {selectedEmployees.length} of {filteredEmployees.length} employees selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
          
          {/* Fine Details Section */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-medium text-white mb-3">Fine Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Fine Type</label>
                <select
                  value={fineType}
                  onChange={handleFineTypeChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  {FINE_TYPES.map((type) => (
                    <option key={type.name} value={type.name} className="bg-gray-800">
                      {type.name} (RS{type.amount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount (RS)</label>
                <input
                  type="number"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  value={fineDate}
                  onChange={(e) => setFineDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Reason for fine (optional)"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  rows="2"
                />
              </div>
            </div>
          </div>

          {/* Employee Selection Section */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Users className="w-4 h-4" />
                Select Employees
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="" className="bg-gray-800">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept} className="bg-gray-800">{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Select All */}
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 mb-3 transition-colors"
            >
              {selectedEmployees.length === filteredEmployees.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>Select All ({filteredEmployees.length})</span>
            </button>

            {/* Employee List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredEmployees.length === 0 ? (
                <p className="text-center text-gray-400 py-4">No employees found</p>
              ) : (
                filteredEmployees.map(employee => (
                  <div
                    key={employee._id}
                    onClick={() => toggleEmployee(employee._id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      selectedEmployees.includes(employee._id)
                        ? 'bg-orange-500/20 border border-orange-500/30'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {selectedEmployees.includes(employee._id) ? (
                      <CheckSquare className="w-5 h-5 text-orange-300 flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {employee.employeeId} • {employee.department}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 border-t border-white/10 bg-white/5">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="flex-1 px-4 py-3 bg-transparent border border-gray-500 hover:border-gray-400 text-gray-300 hover:text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying || selectedEmployees.length === 0}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApplying ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Applying...
              </span>
            ) : (
              `Apply Fine to ${selectedEmployees.length} Employee${selectedEmployees.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkFineModal;
