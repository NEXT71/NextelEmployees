import { useState, useEffect, useCallback } from 'react';
import { Gift, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { bonusAPI } from '../../utils/api';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);

// The logged-in employee's own bonuses. Fetches its own data.
const MyBonuses = ({ title = 'Your Bonuses' }) => {
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bonusAPI.getMyBonuses();
      if (res?.error) throw new Error(res.message);
      setBonuses(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err.message || 'Failed to load bonuses');
      setBonuses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = bonuses.reduce((sum, b) => sum + (b.amount || 0), 0);

  return (
    <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div
        className="p-6 border-b border-white/10 flex justify-between items-center cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center space-x-3">
          <Gift className="w-5 h-5 text-yellow-300" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {bonuses.length > 0 && (
            <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full">
              {bonuses.length} · {formatCurrency(total)}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => { e.stopPropagation(); load(); }}
            disabled={loading}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-blue-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {open ? <ChevronUp className="text-blue-300" /> : <ChevronDown className="text-blue-300" />}
        </div>
      </div>

      {open && (
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-center text-blue-300 h-24 flex items-center justify-center">Loading bonuses...</div>
          ) : error ? (
            <div className="p-6 text-center text-red-300 flex flex-col items-center">
              <AlertCircle className="w-5 h-5 mb-2" />
              <span className="mb-2">{error}</span>
              <button onClick={load} className="text-blue-300 hover:text-blue-200 underline text-sm">Try Again</button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  {['Date', 'Type', 'Amount', 'Reason'].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-blue-200/80 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {bonuses.length > 0 ? (
                  bonuses.map((bonus) => (
                    <tr key={bonus._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm text-white">{formatDate(bonus.date)}</td>
                      <td className="px-6 py-4 text-sm text-blue-100">{bonus.type}</td>
                      <td className="px-6 py-4 text-sm text-yellow-300 font-mono">{formatCurrency(bonus.amount)}</td>
                      <td className="px-6 py-4 text-sm text-blue-100">{bonus.description || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-blue-200/70">No bonuses yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default MyBonuses;
