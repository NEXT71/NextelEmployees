import { useState, memo } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import SalesAnalytics from '../../../components/admin/SalesAnalytics';
import PendingSalesReview from '../../../components/admin/PendingSalesReview';

// ✅ OPTIMIZATION: Separated component to prevent re-renders of unrelated state changes
const SalesTab = memo(({ onRefresh }) => {
  const [salesSubTab, setSalesSubTab] = useState('pending');

  return (
    <div className="space-y-4">
      {/* Sales Sub-Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-0">
        <button
          onClick={() => setSalesSubTab('pending')}
          className={`px-4 py-3 font-medium flex items-center space-x-2 text-sm ${
            salesSubTab === 'pending' 
              ? 'text-purple-300 border-b-2 border-purple-400' 
              : 'text-blue-200/70 hover:text-purple-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Pending Review</span>
        </button>
        <button
          onClick={() => setSalesSubTab('analytics')}
          className={`px-4 py-3 font-medium flex items-center space-x-2 text-sm ${
            salesSubTab === 'analytics' 
              ? 'text-purple-300 border-b-2 border-purple-400' 
              : 'text-blue-200/70 hover:text-purple-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Analytics</span>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {salesSubTab === 'pending' && (
          <PendingSalesReview onRefresh={onRefresh} />
        )}
        {salesSubTab === 'analytics' && (
          <SalesAnalytics onRefresh={onRefresh} />
        )}
      </div>
    </div>
  );
});

SalesTab.displayName = 'SalesTab';

export default SalesTab;
