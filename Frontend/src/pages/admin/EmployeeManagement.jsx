import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import AdminHeader from '../../components/common/AdminHeader';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 sm:w-64 sm:h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <AdminHeader />
      
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 relative z-10">
        {/* Header Section */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admindashboard')}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white rounded-lg transition-all duration-200 border border-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm sm:text-base">Back</span>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Employee Management
                </h1>
                <p className="text-blue-200/70 mt-1 text-xs sm:text-sm">Manage your workforce efficiently</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 shadow-lg text-sm sm:text-base"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Add Employee</span>
            </button>
          </div>
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