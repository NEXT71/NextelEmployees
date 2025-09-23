import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Building, TrendingUp, Clock } from 'lucide-react';
import { employeeAPI } from '../../utils/api';

const EmployeeStats = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    departmentStats: [],
    attendanceRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch all employees
      const employeesResult = await employeeAPI.getAllEmployees();
      
      const employees = employeesResult.data || [];
      
      // Calculate department statistics
      const departmentStats = employees.reduce((acc, emp) => {
        const dept = emp.department || 'Unknown';
        if (!acc[dept]) {
          acc[dept] = { name: dept, count: 0, active: 0 };
        }
        acc[dept].count++;
        if (emp.status === 'Active') {
          acc[dept].active++;
        }
        return acc;
      }, {});

      setStats({
        totalEmployees: employees.length,
        activeEmployees: employees.filter(emp => emp.status === 'Active').length,
        departmentStats: Object.values(departmentStats),
        attendanceRate: 85 // This would come from attendance data
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue', trend = null }) => (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 bg-${color}-600/20 rounded-xl flex items-center justify-center`}>
            <Icon className={`w-6 h-6 text-${color}-400`} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <div className="text-right">
            <div className={`flex items-center space-x-1 ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
              <TrendingUp className={`w-4 h-4 ${!trend.positive && 'rotate-180'}`} />
              <span className="text-sm font-medium">{trend.value}</span>
            </div>
            <p className="text-xs text-slate-500">vs last month</p>
          </div>
        )}
      </div>
    </div>
  );

  const DepartmentCard = ({ department }) => (
    <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Building className="w-4 h-4 text-cyan-400" />
          <h4 className="font-medium text-white">{department.name}</h4>
        </div>
        <span className="text-sm text-slate-400">{department.count} total</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-green-400">Active: {department.active}</span>
          <span className="text-red-400">Inactive: {department.count - department.active}</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${department.count > 0 ? (department.active / department.count) * 100 : 0}%` }}
          ></div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-slate-700 rounded-xl"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-20"></div>
                  <div className="h-8 bg-slate-700 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          icon={Users}
          title="Total Employees"
          value={stats.totalEmployees}
          color="blue"
          trend={{ positive: true, value: "+12%" }}
        />
        <StatCard
          icon={UserCheck}
          title="Active Employees"
          value={stats.activeEmployees}
          subtitle={`${stats.totalEmployees > 0 ? ((stats.activeEmployees / stats.totalEmployees) * 100).toFixed(1) : 0}% of total`}
          color="green"
          trend={{ positive: true, value: "+8%" }}
        />
        <StatCard
          icon={Clock}
          title="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          subtitle="This month"
          color="indigo"
          trend={{ positive: true, value: "+3%" }}
        />
      </div>

      {/* Department Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          icon={Building}
          title="Departments"
          value={stats.departmentStats.length}
          subtitle="Active departments"
          color="cyan"
        />
      </div>

      {/* Department Breakdown */}
      {stats.departmentStats.length > 0 && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Building className="w-5 h-5 text-cyan-400" />
              <span>Department Overview</span>
            </h3>
            <p className="text-sm text-slate-400 mt-1">Employee distribution across departments</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.departmentStats
              .sort((a, b) => b.count - a.count)
              .map((department) => (
                <DepartmentCard key={department.name} department={department} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeStats;