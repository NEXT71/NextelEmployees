import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Target, Award, DollarSign, Loader, AlertCircle } from 'lucide-react';
import { salesTargetAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import StatsCard from '../../components/common/StatsCard';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

const CSRSalesDashboard = () => {
  const { user } = useAuth();
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth() + 1);
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState(null);
  const [dailyRecords, setDailyRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const employeeId = user?.employeeId;

  useEffect(() => {
    if (employeeId) {
      loadMonthlyData();
    }
  }, [employeeId, activeMonth, activeYear]);

  const loadMonthlyData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await salesTargetAPI.getCsrMonthlyEarnings({
        employeeId,
        year: activeYear,
        month: activeMonth
      });

      if (response.data) {
        setMonthlyData(response.data.monthlyStats);
        setDailyRecords(response.data.dailyBreakdown || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      'Tier 1 (5-6 sales)': 'text-blue-400 bg-blue-900/30 border-blue-600/50',
      'Tier 2 (7-9 sales)': 'text-green-400 bg-green-900/30 border-green-600/50',
      'Tier 3 (10+ sales)': 'text-purple-400 bg-purple-900/30 border-purple-600/50',
      'No Tier (Below 5 sales)': 'text-gray-400 bg-gray-900/30 border-gray-600/50'
    };
    return colors[tier] || colors['No Tier (Below 5 sales)'];
  };

  const TierProgressBar = ({ tier, minSales }) => {
    if (!monthlyData) return null;
    const total = monthlyData.totalDays;
    const percentage = Math.min((monthlyData.daysPerTier[tier.toLowerCase()] / total) * 100, 100);
    
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="bg-black/30 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                tier === 'tier1' ? 'bg-blue-500' : tier === 'tier2' ? 'bg-green-500' : 'bg-purple-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-medium text-gray-300 min-w-fit">
          {monthlyData.daysPerTier[tier.toLowerCase()] || 0} days
        </span>
      </div>
    );
  };

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
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
              title="Total Sales"
              value={monthlyData.totalSales}
              subtitle="This month"
              trend={monthlyData.totalSales > 30 ? 'up' : 'stable'}
            />
            <StatsCard
              icon={<DollarSign className="w-5 h-5" />}
              title="Base Salary"
              value={`RS ${(monthlyData.totalBaseSalary / 1000).toFixed(1)}K`}
              subtitle={`${monthlyData.totalDays} days worked`}
              trend="up"
            />
            <StatsCard
              icon={<Award className="w-5 h-5" />}
              title="Tier Bonus"
              value={`RS ${(monthlyData.totalTierBonus / 1000).toFixed(1)}K`}
              subtitle="Performance bonus"
              trend={monthlyData.totalTierBonus > 0 ? 'up' : 'stable'}
            />
            <StatsCard
              icon={<Target className="w-5 h-5" />}
              title="Total Earnings"
              value={`RS ${(monthlyData.totalEarnings / 1000).toFixed(1)}K`}
              subtitle="Base + Bonus"
              trend="up"
            />
          </div>

          {/* Tier Breakdown */}
          <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-md border border-blue-600/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Tier Performance
            </h3>

            <div className="space-y-4">
              {/* Tier 1 */}
              <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-600/30">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-blue-200 font-medium">Tier 1</h4>
                    <p className="text-xs text-gray-400">5-6 sales (Base rate)</p>
                  </div>
                  <span className="text-2xl font-bold text-blue-400">{monthlyData.daysPerTier.tier1}</span>
                </div>
                <TierProgressBar tier="tier1" minSales={5} />
              </div>

              {/* Tier 2 */}
              <div className="bg-green-900/20 rounded-lg p-4 border border-green-600/30">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-green-200 font-medium">Tier 2</h4>
                    <p className="text-xs text-gray-400">7-9 sales (+20% bonus)</p>
                  </div>
                  <span className="text-2xl font-bold text-green-400">{monthlyData.daysPerTier.tier2}</span>
                </div>
                <TierProgressBar tier="tier2" minSales={7} />
              </div>

              {/* Tier 3 */}
              <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-600/30">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-purple-200 font-medium">Tier 3</h4>
                    <p className="text-xs text-gray-400">10+ sales (+50% bonus)</p>
                  </div>
                  <span className="text-2xl font-bold text-purple-400">{monthlyData.daysPerTier.tier3}</span>
                </div>
                <TierProgressBar tier="tier3" minSales={10} />
              </div>
            </div>

            {/* Best Day */}
            {monthlyData.bestDay && (
              <div className="mt-4 pt-4 border-t border-blue-600/30">
                <p className="text-xs text-gray-400 mb-2">Best Day</p>
                <div className="flex items-center justify-between bg-green-900/30 rounded p-3 border border-green-600/40">
                  <span className="text-green-200">{new Date(monthlyData.bestDay.date).toLocaleDateString('en-GB')}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">{monthlyData.bestDay.sales} sales</p>
                    <p className="text-xs text-green-300">RS {monthlyData.bestDay.earning.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
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
                      <th className="px-6 py-3 text-center">Sales</th>
                      <th className="px-6 py-3 text-right">Base</th>
                      <th className="px-6 py-3 text-right">Bonus</th>
                      <th className="px-6 py-3 text-right">Total</th>
                      <th className="px-6 py-3 text-center">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-600/20">
                    {dailyRecords.map((record, idx) => (
                      <tr key={idx} className="hover:bg-blue-800/20 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {new Date(record.date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-6 py-4 text-sm text-center font-semibold text-amber-400">
                          {record.sales}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-300">
                          RS {record.baseSalary.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          {record.tierBonus > 0 ? (
                            <span className="text-green-400 font-medium">+ RS {record.tierBonus.toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-green-400">
                          RS {record.totalEarning.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getTierColor(record.tier)}`}>
                            {record.tier}
                          </span>
                        </td>
                      </tr>
                    ))}
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
  );
};

export default CSRSalesDashboard;
