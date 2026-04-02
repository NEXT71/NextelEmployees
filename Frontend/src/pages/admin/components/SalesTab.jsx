import { memo } from 'react';
import SalesAnalytics from '../../../components/admin/SalesAnalytics';
import PendingSalesReview from '../../../components/admin/PendingSalesReview';

// ✅ OPTIMIZATION: Separated component to prevent unnecessary re-renders
const SalesTab = memo(({ onRefresh }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Sales Analytics</h3>
        <SalesAnalytics />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Pending Sales Review</h3>
        <PendingSalesReview onRefresh={onRefresh} />
      </div>
    </div>
  );
});

SalesTab.displayName = 'SalesTab';

export default SalesTab;
