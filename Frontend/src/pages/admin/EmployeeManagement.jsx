import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import AdminShell from '../../components/admin/AdminShell';
import CreateEmployeeModal from '../../components/admin/CreateEmployeeModal';
import EmployeeList from '../../components/admin/EmployeeList';
import EmployeeStats from '../../components/admin/EmployeeStats';
import Button from '../../components/ui/Button';

const EmployeeManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold text-ink">Employee accounts</h1>
          <p className="mt-1 text-sm text-muted">Create logins and see who's active in each department.</p>
        </div>
        <Button icon={UserPlus} onClick={() => setShowCreateModal(true)}>
          Add employee
        </Button>
      </div>

      <div className="space-y-8">
        <EmployeeStats key={`stats-${refreshKey}`} />
        <EmployeeList key={`list-${refreshKey}`} />
      </div>

      <CreateEmployeeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEmployeeAdded={() => setRefreshKey((prev) => prev + 1)}
      />
    </AdminShell>
  );
};

export default EmployeeManagement;
