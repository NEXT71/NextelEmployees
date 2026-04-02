import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Search, Edit, UserCheck, AlertCircle } from 'lucide-react';
import { employeeAPI, fineAPI } from '../../../utils/api';
import { DEPARTMENTS } from '../../../utils/constants';
import CreateEmployeeModal from '../../../components/admin/CreateEmployeeModal';
import BulkFineModal from '../../../components/admin/BulkFineModal';

// ✅ OPTIMIZATION: Separated component to prevent re-renders of unrelated state changes
const EmployeesTab = memo(({ user, onRefresh }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkFineModal, setShowBulkFineModal] = useState(false);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await employeeAPI.getAllEmployees({ bypassCache: true });
        const filtered = (response.data || []).filter(emp => 
          emp.email !== user?.email && emp.user?._id !== user?._id
        );
        setEmployees(filtered);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load employees');
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [user]);

  // ✅ OPTIMIZATION: Memoize filtered list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = departmentFilter 
        ? emp.department === departmentFilter 
        : true;
      
      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchTerm, departmentFilter]);

  // View employee details
  const viewEmployeeDetails = useCallback(async (employee) => {
    try {
      const finesResponse = await fineAPI.getFinesByEmployee(employee._id);
      setSelectedEmployee(employee);
      setEmployeeFines(finesResponse.data || []);
      setShowEmployeeDetails(true);
    } catch (err) {
      setError(err.message || 'Failed to load employee details');
    }
  }, []);



  // Toggle select all
  const toggleSelectAll = useCallback(() => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp._id));
    }
  }, [selectedEmployees.length, filteredEmployees]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-blue-200/70" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      {selectedEmployees.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkFineModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            Apply Fine to {selectedEmployees.length}
          </button>
        </div>
      )}

      {/* Employee List */}
      {filteredEmployees.length === 0 ? (
        <div className="text-center py-12 text-blue-200/70">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No employees found</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left"><input type="checkbox" onChange={toggleSelectAll} /></th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase">Department</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredEmployees.map(emp => (
                <tr key={emp._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedEmployees.includes(emp._id)}
                      onChange={() => setSelectedEmployees(prev => 
                        prev.includes(emp._id) 
                          ? prev.filter(id => id !== emp._id)
                          : [...prev, emp._id]
                      )}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{emp.firstName} {emp.lastName}</td>
                  <td className="px-6 py-4 text-sm text-blue-200">{emp.email}</td>
                  <td className="px-6 py-4 text-sm text-blue-200">{emp.department}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      emp.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    <button 
                      onClick={() => viewEmployeeDetails(emp)}
                      className="text-blue-400 hover:text-blue-300"
                      title="View details"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <CreateEmployeeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          onRefresh?.();
        }}
      />

      <BulkFineModal
        isOpen={showBulkFineModal}
        onClose={() => setShowBulkFineModal(false)}
        employees={filteredEmployees}
        onApply={async (fineData) => {
          try {
            await fineAPI.applyBulkFine({
              ...fineData,
              employeeIds: selectedEmployees
            });
            setShowBulkFineModal(false);
            setSelectedEmployees([]);
            onRefresh?.();
          } catch (err) {
            setError(err.message);
          }
        }}
      />
    </div>
  );
});

EmployeesTab.displayName = 'EmployeesTab';

// Helper functions
const convertToCSV = (data, headers) => {
  const headerRow = headers.join(',');
  const rows = data.map(item => 
    headers.map(header => item[header] || '').join(',')
  );
  return [headerRow, ...rows].join('\n');
};

const downloadCSV = (content, filename) => {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default EmployeesTab;
