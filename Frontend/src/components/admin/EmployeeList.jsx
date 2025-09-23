import React, { useState, useEffect } from 'react';
import { Search, Users, Filter, MoreVertical, UserCheck, UserX, Edit3, Eye, Calendar } from 'lucide-react';
import { employeeAPI } from '../../utils/api';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showActions, setShowActions] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await employeeAPI.getAllEmployees();
      setEmployees(data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (employeeId, currentStatus) => {
    try {
      await employeeAPI.updateEmployee(employeeId, {
        status: currentStatus === 'Active' ? 'Inactive' : 'Active'
      });
      
      fetchEmployees(); // Refresh list
      setShowActions(null);
    } catch (error) {
      console.error('Error updating employee status:', error);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !filterDepartment || emp.department === filterDepartment;
    const matchesStatus = !filterStatus || emp.status === filterStatus;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
            <span className="text-slate-300">Loading employees...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Employee Management</h2>
              <p className="text-sm text-slate-400">{employees.length} total employees</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg pl-10 pr-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors appearance-none"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg pl-10 pr-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors appearance-none"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="overflow-x-auto">
        {filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Users className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">No employees found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Employee</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Contact</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Department</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Position</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Start Date</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee._id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {employee.firstName?.[0]}{employee.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-sm text-slate-400">ID: {employee.employeeId || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white">{employee.email}</p>
                      <p className="text-sm text-slate-400">{employee.phoneNumber || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">{employee.department || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">{employee.position || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(employee.startDate)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      employee.status === 'Active' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {employee.status === 'Active' ? (
                        <UserCheck className="w-3 h-3 mr-1" />
                      ) : (
                        <UserX className="w-3 h-3 mr-1" />
                      )}
                      {employee.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <button
                        onClick={() => setShowActions(showActions === employee._id ? null : employee._id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {showActions === employee._id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-600/50 rounded-lg shadow-xl z-10 py-1">
                          <button
                            onClick={() => {/* Add view details functionality */}}
                            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center space-x-2"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Details</span>
                          </button>
                          <button
                            onClick={() => {/* Add edit functionality */}}
                            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center space-x-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit Employee</span>
                          </button>
                          <button
                            onClick={() => handleStatusToggle(employee._id, employee.status)}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700/50 flex items-center space-x-2 ${
                              employee.status === 'Active' 
                                ? 'text-red-400' 
                                : 'text-green-400'
                            }`}
                          >
                            {employee.status === 'Active' ? (
                              <>
                                <UserX className="w-4 h-4" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {filteredEmployees.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-700/50">
          <p className="text-sm text-slate-400">
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;