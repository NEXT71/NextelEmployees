import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Search, AlertTriangle, Trash2, X, Download } from 'lucide-react';
import { fineAPI, employeeAPI } from '../../../utils/api';
import { FINE_TYPES } from '../../../utils/constants';

// ✅ OPTIMIZATION: Separated component to prevent re-renders of unrelated state changes
const FinesTab = memo(({ user, onRefresh }) => {
  const [fines, setFines] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [fineSearchTerm, setFineSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [fineFilter, setFineFilter] = useState('');
  
  // Applied filters
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedMonthFilter, setAppliedMonthFilter] = useState('');
  const [appliedDateFilter, setAppliedDateFilter] = useState('');
  const [appliedEmployeeFilter, setAppliedEmployeeFilter] = useState('');
  const [appliedFineFilter, setAppliedFineFilter] = useState('');

  // Fetch fines and employees on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [finesRes, employeesRes] = await Promise.all([
          fineAPI.getAllFines({ bypassCache: true }),
          employeeAPI.getAllEmployees({ bypassCache: true })
        ]);
        
        setFines(finesRes.data || []);
        setEmployees(employeesRes.data || []);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load fines');
        setFines([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ OPTIMIZATION: Memoize filtered fines
  const filteredFines = useMemo(() => {
    return fines.filter(fine => {
      if (!fine.employee) return false;
      
      const employee = employees.find(e => e._id === fine.employee._id);
      if (!employee) return false;
      
      const matchesEmployee = appliedEmployeeFilter ? fine.employee._id === appliedEmployeeFilter : true;
      const matchesType = appliedFineFilter ? fine.type === appliedFineFilter : true;
      
      const matchesMonth = appliedMonthFilter ? 
        new Date(fine.date).toISOString().slice(0, 7) === appliedMonthFilter : true;
      
      const matchesDate = appliedDateFilter ? 
        new Date(fine.date).toISOString().slice(0, 10) === appliedDateFilter : true;
      
      const matchesSearch = appliedSearchTerm ? 
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
        employee.employeeId?.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
        fine.type.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
        fine.description?.toLowerCase().includes(appliedSearchTerm.toLowerCase()) : true;
      
      return matchesEmployee && matchesType && matchesMonth && matchesDate && matchesSearch;
    });
  }, [fines, employees, appliedEmployeeFilter, appliedFineFilter, appliedMonthFilter, appliedDateFilter, appliedSearchTerm]);

  // ✅ OPTIMIZATION: Memoize grouped fines
  const groupedFines = useMemo(() => {
    return filteredFines.reduce((groups, fine) => {
      const employeeId = fine.employee._id;
      if (!groups[employeeId]) {
        groups[employeeId] = [];
      }
      groups[employeeId].push(fine);
      return groups;
    }, {});
  }, [filteredFines]);

  const clearFinesFilters = useCallback(() => {
    setFineSearchTerm('');
    setMonthFilter('');
    setDateFilter('');
    setEmployeeFilter('');
    setFineFilter('');
    setAppliedSearchTerm('');
    setAppliedMonthFilter('');
    setAppliedDateFilter('');
    setAppliedEmployeeFilter('');
    setAppliedFineFilter('');
  }, []);

  const handleDeleteFine = useCallback(async (fineId) => {
    if (window.confirm('Are you sure you want to delete this fine?')) {
      try {
        await fineAPI.deleteFine(fineId);
        setFines(fines.filter(f => f._id !== fineId));
        onRefresh?.();
      } catch (err) {
        setError(err.message || 'Failed to delete fine');
      }
    }
  }, [fines, onRefresh]);

  const handleDownloadFineReport = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        month: appliedMonthFilter || '',
        date: appliedDateFilter || '',
        employeeId: appliedEmployeeFilter || '',
        type: appliedFineFilter || ''
      }).toString();

      const response = await fineAPI.generateFineReport(queryParams);
      if (response.success && response.data) {
        const headers = ['date', 'employeeId', 'employeeName', 'type', 'description', 'amount', 'status'];
        const csvContent = convertToCSV(response.data, headers);
        const filename = `fine-report-${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(csvContent, filename);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate fine report');
    }
  }, [appliedMonthFilter, appliedDateFilter, appliedEmployeeFilter, appliedFineFilter]);

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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-blue-200/70" />
          <input
            type="text"
            placeholder="Search fines..."
            value={fineSearchTerm}
            onChange={(e) => setFineSearchTerm(e.target.value)}
            className="pl-10 w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        
        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">All Employees</option>
          {employees.map(emp => (
            <option key={emp._id} value={emp._id}>
              {emp.firstName} {emp.lastName}
            </option>
          ))}
        </select>
        
        <select
          value={fineFilter}
          onChange={(e) => setFineFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">All Fine Types</option>
          {FINE_TYPES.map(type => (
            <option key={type.name} value={type.name}>{type.name}</option>
          ))}
        </select>
        
        <button
          onClick={() => {
            setAppliedSearchTerm(fineSearchTerm);
            setAppliedMonthFilter(monthFilter);
            setAppliedDateFilter(dateFilter);
            setAppliedEmployeeFilter(employeeFilter);
            setAppliedFineFilter(fineFilter);
          }}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Apply
        </button>
        
        <button
          onClick={clearFinesFilters}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleDownloadFineReport}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Report
        </button>
      </div>

      {/* Fines List */}
      {Object.keys(groupedFines).length === 0 ? (
        <div className="text-center py-12 text-blue-200/70">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No fines found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedFines).map(([employeeId, employeeFines]) => {
            const employee = employeeFines[0].employee;
            const totalAmount = employeeFines.reduce((sum, fine) => sum + (fine.amount || 0), 0);
            const approvedCount = employeeFines.filter(fine => fine.approved).length;
            const pendingCount = employeeFines.length - approvedCount;
            
            return (
              <div key={employeeId} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <div className="px-6 py-4 bg-white/10 border-b border-white/10 flex justify-between items-center">
                  <div>
                    <h4 className="text-white font-semibold">{employee?.firstName} {employee?.lastName}</h4>
                    <p className="text-xs text-blue-200/70">{employee?.employeeId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">RS {totalAmount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{approvedCount} approved • {pendingCount} pending</p>
                  </div>
                </div>
                
                <div className="divide-y divide-white/10">
                  {employeeFines.map(fine => (
                    <div key={fine._id} className="px-6 py-3 hover:bg-white/5 transition-colors flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{fine.type}</p>
                        <p className="text-xs text-blue-200/70">{new Date(fine.date).toLocaleDateString()}</p>
                        {fine.description && <p className="text-xs text-gray-400 mt-1">{fine.description}</p>}
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">RS {fine.amount?.toLocaleString()}</p>
                          <p className={`text-xs ${fine.approved ? 'text-green-400' : 'text-yellow-400'}`}>
                            {fine.approved ? 'Approved' : 'Pending'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteFine(fine._id)}
                          className="text-red-400 hover:text-red-300"
                          title="Delete fine"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

FinesTab.displayName = 'FinesTab';

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

export default FinesTab;
