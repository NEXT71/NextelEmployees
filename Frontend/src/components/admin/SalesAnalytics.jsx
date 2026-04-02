import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, Award, DollarSign, AlertCircle, BarChart3 } from 'lucide-react';
import { salesTargetAPI } from '../../utils/api';
import StatsCard from '../common/StatsCard';
import LoadingSkeleton from '../common/LoadingSkeleton';

const SalesAnalytics = ({ month = 3, year = 2026 }) => {
  const [salesData, setSalesData] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCSRs: 0,
    averageSalesPerCSR: 0,
    totalEarnings: 0,
    topPerformer: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  // ✅ OPTIMIZATION: Memoize calculateStats to prevent recreation on every render
  const calculateStats = useCallback((data) => {
    if (!data || data.length === 0) {
      setStats({
        totalSales: 0,
        totalCSRs: 0,
        averageSalesPerCSR: 0,
        totalEarnings: 0,
        topPerformer: null,
      });
      return;
    }

    // Group by employee
    const byEmployee = {};
    data.forEach(record => {
      const empId = record.employee?._id || record.employee;
      if (!byEmployee[empId]) {
        byEmployee[empId] = {
          employee: record.employee,
          totalSales: 0,
          totalEarnings: 0,
          daysWorked: 0,
          records: []
        };
      }
      byEmployee[empId].totalSales += record.salesCount || 0;
      byEmployee[empId].totalEarnings += record.totalEarningForDay || 0;
      byEmployee[empId].daysWorked += 1;
      byEmployee[empId].records.push(record);
    });

    const employees = Object.values(byEmployee);
    const totalSales = employees.reduce((sum, e) => sum + e.totalSales, 0);
    const totalEarnings = employees.reduce((sum, e) => sum + e.totalEarnings, 0);
    const avgSalesPerCSR = Math.round((totalSales / employees.length) * 100) / 100;

    // Find top performer
    let topPerformer = employees[0];
    employees.forEach(emp => {
      if (emp.totalEarnings > topPerformer.totalEarnings) {
        topPerformer = emp;
      }
    });

    setStats({
      totalSales,
      totalCSRs: employees.length,
      averageSalesPerCSR: avgSalesPerCSR,
      totalEarnings,
      topPerformer,
    });
  }, []);

  const loadSalesData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await salesTargetAPI.getAllCsrSales({
        startDate,
        endDate,
        limit: 20
      });

      if (response.data) {
        const data = response.data;
        setSalesData(data);
        calculateStats(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, calculateStats]);

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  const getTierBadge = (tier) => {
    const badges = {
      1: { color: 'bg-blue-600/30 text-blue-200 border-blue-500/50', text: 'Tier 1' },
      2: { color: 'bg-green-600/30 text-green-200 border-green-500/50', text: 'Tier 2' },
      3: { color: 'bg-purple-600/30 text-purple-200 border-purple-500/50', text: 'Tier 3' },
      0: { color: 'bg-gray-600/30 text-gray-200 border-gray-500/50', text: 'No Tier' },
    };
    const badge = badges[tier] || badges[0];
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={<DollarSign className="w-5 h-5" />}
          title="Total Sales"
          value={stats.totalSales.toLocaleString()}
          subtitle="CSRs combined"
          trend={stats.totalSales > 0 ? 'up' : 'stable'}
        />
        <StatsCard
          icon={<Users className="w-5 h-5" />}
          title="Active CSRs"
          value={stats.totalCSRs}
          subtitle="This period"
          trend="stable"
        />
        <StatsCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Avg Sales/CSR"
          value={stats.averageSalesPerCSR.toLocaleString()}
          subtitle="Per month"
          trend={stats.averageSalesPerCSR > 0 ? 'up' : 'stable'}
        />
        <StatsCard
          icon={<Award className="w-5 h-5" />}
          title="Total Earnings"
          value={`RS ${(stats.totalEarnings / 1000).toFixed(1)}K`}
          subtitle="With bonuses"
          trend={stats.totalEarnings > 0 ? 'up' : 'stable'}
        />
      </div>

      {/* Top Performer */}
      {stats.topPerformer && (
        <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 backdrop-blur-md border border-yellow-600/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Top Performer</h3>
          </div>
          <div className="bg-yellow-900/20 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-white font-semibold text-lg">
                  {stats.topPerformer.employee?.firstName} {stats.topPerformer.employee?.lastName}
                </h4>
                <p className="text-xs text-gray-400">{stats.topPerformer.employee?.employeeId}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-400">{stats.topPerformer.totalEarnings.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Total Earned</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-yellow-800/30 rounded p-2">
                <p className="text-gray-400 text-xs">Total Sales</p>
                <p className="text-yellow-300 font-bold">{stats.topPerformer.totalSales}</p>
              </div>
              <div className="bg-yellow-800/30 rounded p-2">
                <p className="text-gray-400 text-xs">Days Worked</p>
                <p className="text-yellow-300 font-bold">{stats.topPerformer.daysWorked}</p>
              </div>
              <div className="bg-yellow-800/30 rounded p-2">
                <p className="text-gray-400 text-xs">Avg/Day</p>
                <p className="text-yellow-300 font-bold">{(stats.topPerformer.totalSales / stats.topPerformer.daysWorked).toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales Data Table */}
      <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-md border border-blue-600/30 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-blue-600/30">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Sales Records</h3>
          </div>
          <p className="text-xs text-gray-400">
            {new Date(year, month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {error && (
          <div className="p-6 flex items-center gap-2 bg-red-900/20 border-t border-blue-600/30">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-200">{error}</span>
          </div>
        )}

        {salesData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-600/30 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Employee</th>
                  <th className="px-6 py-3 text-center">Date</th>
                  <th className="px-6 py-3 text-center">Sales</th>
                  <th className="px-6 py-3 text-right">Base Salary</th>
                  <th className="px-6 py-3 text-right">Bonus</th>
                  <th className="px-6 py-3 text-right">Total Earning</th>
                  <th className="px-6 py-3 text-center">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-600/20">
                {salesData.map((record, idx) => (
                  <tr key={idx} className="hover:bg-blue-800/20 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <p className="text-white font-medium">
                          {record.employee?.firstName} {record.employee?.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{record.employee?.employeeId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-300">
                      {new Date(record.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-semibold text-amber-400">
                      {record.salesCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-300">
                      RS {record.baseSalaryForDay?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      {record.tierBonus > 0 ? (
                        <span className="text-green-400 font-medium">+ RS {record.tierBonus.toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-400">
                      RS {record.totalEarningForDay?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {getTierBadge(record.achievedTier)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-400">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No sales records found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesAnalytics;
