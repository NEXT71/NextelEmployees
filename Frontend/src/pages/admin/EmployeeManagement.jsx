import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CreateEmployeeModal from '../../components/admin/CreateEmployeeModal';
import EmployeeList from '../../components/admin/EmployeeList';
import EmployeeStats from '../../components/admin/EmployeeStats';
import { authAPI } from '../../utils/api';

const EmployeeManagement = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateEmployee = async (employeeData) => {
    try {
      const result = await authAPI.registerEmployee(employeeData);
      console.log('Employee created successfully:', result);
      
      // Close modal and refresh the employee list
      setShowCreateModal(false);
      setRefreshKey(prev => prev + 1); // Force refresh of child components
      
      // Show success message (you can use toast notification library)
      alert('Employee created successfully!');
    } catch (error) {
      console.error('Error creating employee:', error);
      alert(`Error: ${error.message}`);
      throw error; // Re-throw to let the modal handle the loading state
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admindashboard')}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Employee Management</h1>
              <p className="text-slate-400 mt-1">Manage your workforce efficiently</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Add New Employee
          </button>
        </div>

        {/* Stats Section */}
        <EmployeeStats key={`stats-${refreshKey}`} />

        {/* Employee List */}
        <EmployeeList key={`list-${refreshKey}`} />

        {/* Create Employee Modal */}
        <CreateEmployeeModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateEmployee}
        />
      </div>
    </div>
  );
};

export default EmployeeManagement;