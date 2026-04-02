import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Search, Download, DollarSign } from 'lucide-react';
import { salaryAPI } from '../../../utils/api';
import GenerateSalaryModal from '../../../components/admin/GenerateSalaryModal';
import BonusModal from '../../../components/admin/BonusModal';

// ✅ OPTIMIZATION: Separated component to prevent re-renders of unrelated state changes
const SalariesTab = memo(({ user, onRefresh }) => {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [showGenerateSalaryModal, setShowGenerateSalaryModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [salarySearchTerm, setSalarySearchTerm] = useState('');
  const [salaryFilterMonth, setSalaryFilterMonth] = useState('');

  // Fetch salaries and employees on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const salariesRes = await salaryAPI.getAllSalaries({ bypassCache: true });
        setSalaries(salariesRes.data || []);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load salaries');
        setSalaries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ OPTIMIZATION: Memoize filtered salaries
  const filteredSalaries = useMemo(() => {
    return salaries.filter(salary => {
      if (!salary.employee) return false;
      
      const employee = salary.employee;
      
      const matchesMonth = salaryFilterMonth ? 
        new Date(salary.month).toISOString().slice(0, 7) === salaryFilterMonth : true;
      
      const matchesSearch = salarySearchTerm ? 
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(salarySearchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(salarySearchTerm.toLowerCase()) ||
        employee.employeeId?.toLowerCase().includes(salarySearchTerm.toLowerCase()) : true;
      
      return matchesMonth && matchesSearch;
    });
  }, [salaries, salarySearchTerm, salaryFilterMonth]);

  const handleDownloadSalaryReport = useCallback(async () => {
    try {
      const response = await salaryAPI.generateSalaryReport();
      if (response.success && response.data) {
        // Map the salary data to include flattened employee name
        const formattedData = (Array.isArray(response.data) ? response.data : response.data.data || []).map(salary => ({
          employeeId: salary.employee?.employeeId || 'N/A',
          employeeName: `${salary.employee?.firstName || ''} ${salary.employee?.lastName || ''}`.trim(),
          baseSalary: salary.baseSalary || 0,
          bonuses: salary.bonuses || 0,
          deductions: salary.deductions || 0,
          netSalary: (salary.baseSalary || 0) + (salary.bonuses || 0) - (salary.deductions || 0),
          month: new Date(salary.month).toLocaleDateString('default', { month: 'short', year: 'numeric' })
        }));
        
        const headers = ['employeeId', 'employeeName', 'baseSalary', 'bonuses', 'deductions', 'netSalary', 'month'];
        const csvContent = convertToCSV(formattedData, headers);
        const filename = `salary-report-${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(csvContent, filename);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate salary report');
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setShowGenerateSalaryModal(false);
    setShowBonusModal(false);
    onRefresh?.();
  }, [onRefresh]);

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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-blue-200/70" />
          <input
            type="text"
            placeholder="Search employees..."
            value={salarySearchTerm}
            onChange={(e) => setSalarySearchTerm(e.target.value)}
            className="pl-10 w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        
        <input
          type="month"
          value={salaryFilterMonth}
          onChange={(e) => setSalaryFilterMonth(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowGenerateSalaryModal(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <DollarSign className="w-4 h-4" />
          Generate Monthly Salary
        </button>
        
        <button
          onClick={handleDownloadSalaryReport}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Report
        </button>
      </div>

      {/* Salary Table */}
      {filteredSalaries.length === 0 ? (
        <div className="text-center py-12 text-blue-200/70">
          <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No salary records found</p>
        </div>
      ) : (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/10 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-200/80 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-200/80 uppercase tracking-wider">Base Salary</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-200/80 uppercase tracking-wider">Bonuses</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-200/80 uppercase tracking-wider">Deductions</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-200/80 uppercase tracking-wider">Net Salary</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-200/80 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-200/80 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredSalaries.map((salary) => {
                  const netSalary = (salary.baseSalary || 0) + (salary.bonuses || 0) - (salary.deductions || 0);
                  return (
                    <tr key={salary._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {salary.employee?.firstName?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {salary.employee?.firstName} {salary.employee?.lastName}
                            </div>
                            <div className="text-xs text-blue-200/70">
                              {salary.employee?.employeeId || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-green-100 font-medium">
                        RS{(salary.baseSalary || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-green-300">
                        RS{(salary.bonuses || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-300">
                        RS{(salary.deductions || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-green-300">
                        RS{netSalary.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-100">
                        {salary.month ? new Date(salary.month).toLocaleDateString('default', { month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedSalary(salary);
                            setShowBonusModal(true);
                          }}
                          className="p-2 text-yellow-300 hover:text-white hover:bg-yellow-500/20 rounded-lg transition-colors"
                          title="Add Bonus"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showGenerateSalaryModal && (
        <GenerateSalaryModal
          onClose={handleRefresh}
        />
      )}

      {showBonusModal && selectedSalary && (
        <BonusModal
          salary={selectedSalary}
          onClose={handleRefresh}
        />
      )}
    </div>
  );
});

SalariesTab.displayName = 'SalariesTab';

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

export default SalariesTab;
