import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import { useAuth } from '../../contexts/AuthContext';
import { salaryAPI } from '../../utils/api';
import { Download, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const EmployeeSalarySlips = () => {
  const navigate = useNavigate();
  const { user, logout: handleLogout } = useAuth();
  
  const [salarySlips, setSalarySlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchSalarySlips = async () => {
      try {
        setLoading(true);
        const response = await salaryAPI.getMySalarySlips();
        if (response.success) {
          setSalarySlips(response.data || []);
        } else {
          setError('Failed to load salary slips');
        }
      } catch (err) {
        setError(err.message || 'Error loading salary slips');
      } finally {
        setLoading(false);
      }
    };

    fetchSalarySlips();
  }, []);

  const handleDownloadSlip = (slip) => {
    const netPay = (slip.baseSalary || 0) + (slip.bonuses || 0) - (slip.deductions || 0);
    
    const csvContent = `
SALARY SLIP
Employee Name,${slip.employee?.firstName} ${slip.employee?.lastName}
Employee ID,${slip.employee?.employeeId}
Month,${new Date(slip.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })}

EARNINGS
Base Salary,${slip.baseSalary}
Bonuses,${slip.bonuses || 0}

DEDUCTIONS
Deductions,${slip.deductions || 0}

NET SALARY,${netPay}
    `.trim();

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-slip-${slip.employee?.employeeId}-${new Date(slip.month).toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">Loading your salary slips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        <Header 
          userName={user?.username} 
          onLogout={handleLogout} 
          pageTitle="My Salary Slips"
          onNavigateToDashboard={() => navigate('/employee/dashboard')}
          onNavigateToSales={() => navigate('/employee/sales-dashboard')}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-8 h-8 text-green-400" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-200 to-emerald-200 bg-clip-text text-transparent">
                My Salary Slips
              </h1>
            </div>
            <p className="text-blue-200/70">View and download your salary records</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-gap-3">
              <div className="text-red-200">{error}</div>
            </div>
          )}

          {/* Summary Cards */}
          {salarySlips.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="text-sm text-green-200/70 mb-1">Total Salaries</div>
                <div className="text-3xl font-bold text-green-300">{salarySlips.length}</div>
              </div>
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="text-sm text-green-200/70 mb-1">Total Earned</div>
                <div className="text-3xl font-bold text-green-300">
                  RS{salarySlips.reduce((sum, s) => sum + ((s.baseSalary || 0) + (s.bonuses || 0) - (s.deductions || 0)), 0).toLocaleString()}
                </div>
              </div>
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="text-sm text-green-200/70 mb-1">Latest Salary</div>
                <div className="text-3xl font-bold text-green-300">
                  RS{(salarySlips[0] ? (salarySlips[0].baseSalary || 0) + (salarySlips[0].bonuses || 0) - (salarySlips[0].deductions || 0) : 0).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Salary Slips List */}
          {salarySlips.length > 0 ? (
            <div className="space-y-4">
              {salarySlips.map((slip) => {
                const netPay = (slip.baseSalary || 0) + (slip.bonuses || 0) - (slip.deductions || 0);
                const isExpanded = expandedId === slip._id;

                return (
                  <div
                    key={slip._id}
                    className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200"
                  >
                    {/* Header */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : slip._id)}
                      className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 text-left">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">
                            {new Date(slip.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                          </h3>
                          <p className="text-blue-200/70 text-sm">Salary Slip</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-300">
                          RS{netPay.toLocaleString()}
                        </div>
                        <p className="text-blue-200/70 text-sm">Net Salary</p>
                      </div>
                    </button>

                    {/* Details */}
                    {isExpanded && (
                      <div className="border-t border-white/10 p-6 bg-white/2.5 space-y-6">
                        {/* Earnings */}
                        <div>
                          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            Earnings
                          </h4>
                          <div className="space-y-2 ml-6">
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-200/70">Base Salary</span>
                              <span className="text-green-300 font-medium">RS{(slip.baseSalary || 0).toLocaleString()}</span>
                            </div>
                            {slip.bonuses > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-blue-200/70">Bonuses</span>
                                <span className="text-green-300 font-medium">RS{slip.bonuses.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Deductions */}
                        <div>
                          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-400" />
                            Deductions
                          </h4>
                          <div className="space-y-2 ml-6">
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-200/70">Deductions</span>
                              <span className="text-red-300 font-medium">-RS{(slip.deductions || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {slip.notes && (
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-xs text-blue-200/80 font-mono">{slip.notes}</p>
                          </div>
                        )}

                        {/* Summary */}
                        <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                          <span className="text-white font-semibold">Total Net Salary</span>
                          <span className="text-2xl font-bold text-green-300">
                            RS{netPay.toLocaleString()}
                          </span>
                        </div>

                        {/* Download Button */}
                        <button
                          onClick={() => handleDownloadSlip(slip)}
                          className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download Salary Slip
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-12 text-center">
              <DollarSign className="w-16 h-16 text-blue-300/30 mx-auto mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">No Salary Slips Yet</h3>
              <p className="text-blue-200/70">Your salary slips will appear here once they are generated by your manager.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeSalarySlips;
