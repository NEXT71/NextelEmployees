import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Calendar, Target, Award, AlertCircle, MessageCircle, Send } from 'lucide-react';
import { salesTargetAPI, authAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import CSRSalesSubmission from '../../components/employees/CSRSalesSubmission';
import Header from '../../components/common/Header';
import StatsCard from '../../components/common/StatsCard';
import MessageCenter from '../../components/common/MessageCenter';

const CSRSalesDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth() + 1);
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'submit'
  const [monthlyData, setMonthlyData] = useState(null);
  const [dailyRecords, setDailyRecords] = useState([]);
  const [error, setError] = useState('');
  const [showMessageCenter, setShowMessageCenter] = useState(false);

  const loadMonthlyData = useCallback(async () => {
    try {
      setError('');

      // Get monthly stats
      const earningsResponse = await salesTargetAPI.getCsrMonthlyEarnings({
        year: activeYear,
        month: activeMonth
      });

      console.log('📊 Monthly earnings response:', earningsResponse);

      // Get individual sales records for the month
      const startDate = new Date(activeYear, activeMonth - 1, 1);
      const endDate = new Date(activeYear, activeMonth, 0);
      
      const salesResponse = await salesTargetAPI.getCsrDailySalesReport({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      console.log('📊 Daily sales response:', salesResponse);

      if (earningsResponse && earningsResponse.data) {
        const monthlyStats = earningsResponse.data.monthlyStats || earningsResponse.data;
        const dailyRecords = salesResponse?.data || [];
        
        setMonthlyData(monthlyStats);
        setDailyRecords(dailyRecords);
        
        console.log('✅ Loaded all sales data:', {
          monthlyStats,
          dailyCount: dailyRecords.length
        });
      } else {
        throw new Error('No data received from server');
      }
    } catch (err) {
      console.error('❌ Error loading sales:', err);
      setError(err.message || 'Failed to load sales data');
    }
  }, [activeYear, activeMonth]);

  useEffect(() => {
    if (user) {
      loadMonthlyData();
    }
  }, [user, loadMonthlyData]);



  const handleLogout = async () => {
    try {
      await authAPI.logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <Header 
        userName={user?.username} 
        onLogout={handleLogout} 
        pageTitle="Sales Dashboard"
        onNavigateToDashboard={() => navigate('/employeedashboard')}
        onNavigateToSalary={() => navigate('/employee/salary-slips')}
      />

            {/* Tab Navigation */}
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="flex gap-2 mb-6 bg-blue-900/40 backdrop-blur-md border border-blue-600/30 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-6 py-2 rounded-md font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <TrendingUp size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('submit')}
            className={`flex items-center gap-2 px-6 py-2 rounded-md font-semibold transition-all ${
              activeTab === 'submit'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Send size={20} />
            Submit Sale
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'submit' ? (
        <CSRSalesSubmission />
      ) : (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 relative z-10">
        <div className="space-y-6">
          {/* Month/Year Selector */}
          <div className="flex items-center gap-4 bg-gradient-to-r from-blue-900/40 to-purple-900/40 backdrop-blur-md border border-blue-600/30 rounded-lg p-4">
        <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <div className="flex items-center gap-2">
          <select
            value={activeMonth}
            onChange={(e) => setActiveMonth(parseInt(e.target.value))}
            className="bg-blue-800/50 border border-blue-600/50 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2026, i).toLocaleDateString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={activeYear}
            onChange={(e) => setActiveYear(parseInt(e.target.value))}
            className="bg-blue-800/50 border border-blue-600/50 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-200">{error}</span>
        </div>
      )}

      {monthlyData && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Approved Sales"
              value={monthlyData?.totalApprovedSales || 0}
              subtitle="This month"
              trend={monthlyData?.totalApprovedSales > 0 ? 'up' : 'stable'}
            />
            <StatsCard
              icon={<AlertCircle className="w-5 h-5" />}
              title="Pending Review"
              value={monthlyData?.totalPendingSales || 0}
              subtitle="Awaiting approval"
              trend="stable"
            />
            <StatsCard
              icon={<Award className="w-5 h-5" />}
              title="Approval Rate"
              value={`${monthlyData?.approvalRate || 0}%`}
              subtitle="Of submitted sales"
              trend={monthlyData?.approvalRate > 80 ? 'up' : 'stable'}
            />
            <StatsCard
              icon={<Target className="w-5 h-5" />}
              title="Total Earnings"
              value={`RS ${((monthlyData?.totalEarnings || 0) / 1000).toFixed(1)}K`}
              subtitle="From approved sales"
              trend={monthlyData?.totalEarnings > 0 ? 'up' : 'stable'}
            />
          </div>

          {/* Sales Status Breakdown */}
          <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-md border border-blue-600/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Sales Summary
            </h3>

            <div className="space-y-4">
              {/* Approved */}
              <div className="bg-green-900/20 rounded-lg p-4 border border-green-600/30">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-green-200 font-medium">✅ Approved</h4>
                    <p className="text-xs text-gray-400">Approved by admin</p>
                  </div>
                  <span className="text-2xl font-bold text-green-400">{monthlyData?.totalApprovedSales || 0}</span>
                </div>
                <div className="bg-green-900/30 rounded-full h-2 w-full"></div>
              </div>

              {/* Pending */}
              <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-600/30">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-yellow-200 font-medium">⏳ Pending</h4>
                    <p className="text-xs text-gray-400">Awaiting admin review</p>
                  </div>
                  <span className="text-2xl font-bold text-yellow-400">{monthlyData?.totalPendingSales || 0}</span>
                </div>
                <div className="bg-yellow-900/30 rounded-full h-2 w-full"></div>
              </div>

              {/* Disapproved */}
              <div className="bg-red-900/20 rounded-lg p-4 border border-red-600/30">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-red-200 font-medium">❌ Disapproved</h4>
                    <p className="text-xs text-gray-400">Rejected by admin</p>
                  </div>
                  <span className="text-2xl font-bold text-red-400">{monthlyData?.totalDisapprovedSales || 0}</span>
                </div>
                <div className="bg-red-900/30 rounded-full h-2 w-full"></div>
              </div>
            </div>
          </div>

          {/* Daily Records */}
          <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-md border border-blue-600/30 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-blue-600/30">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Daily Breakdown
              </h3>
            </div>

            {dailyRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-blue-600/30 text-xs font-semibold text-gray-300 uppercase tracking-wider bg-black/20">
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Customer</th>
                      <th className="px-6 py-3 text-center">Status</th>
                      <th className="px-6 py-3 text-right">DIDs</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-right">Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-600/20">
                    {dailyRecords.map((record, idx) => {
                      const isApproved = record.status === 'approved';
                      const earned = isApproved ? 1000 : 0;
                      const statusColors = {
                        approved: 'bg-green-900/40 text-green-300 border-green-600/40',
                        pending: 'bg-yellow-900/40 text-yellow-300 border-yellow-600/40',
                        disapproved: 'bg-red-900/40 text-red-300 border-red-600/40'
                      };
                      
                      const customerName = record.customer 
                        ? `${record.customer.firstName} ${record.customer.lastName}`.trim()
                        : 'N/A';
                      
                      return (
                        <tr key={idx} className="hover:bg-blue-800/20 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {new Date(record.saleDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {customerName}
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${statusColors[record.status] || 'bg-gray-900/40 text-gray-300 border-gray-600/40'}`}>
                              {record.status === 'approved' && '✅ Approved'}
                              {record.status === 'pending' && '⏳ Pending'}
                              {record.status === 'disapproved' && '❌ Disapproved'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-300">
                            {(record.dids && record.dids.length) ? record.dids.split(',').length : 0}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-amber-400">
                            RS {(record.pricePerSale || record.baseSalary || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold">
                            {isApproved ? (
                              <span className="text-green-400">+ RS {earned.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-400">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No sales records yet for this period</p>
              </div>
            )}
          </div>
        </>
      )}
        </div>
      </div>
            )}


      {/* Floating Message Button */}
      <button
        onClick={() => setShowMessageCenter(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 group"
        title="Contact Admins"
      >
        <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
      </button>

      {/* Message Center Modal */}
      <MessageCenter 
        isOpen={showMessageCenter}
        onClose={() => setShowMessageCenter(false)}
      />
    </div>
  );
};

export default CSRSalesDashboard;
