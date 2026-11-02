import { useState, useEffect } from 'react';
import { employeeAPI } from '../../utils/api';
import Panel, { Section } from '../ui/Panel';
import StatGroup from '../ui/StatGroup';

const EmployeeStats = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    departmentStats: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const employeesResult = await employeeAPI.getAllEmployees();
      // Admin pages count active employees only (On Leave counts as active)
      const employees = (employeesResult.data || []).filter((emp) => String(emp.status || '').toLowerCase() !== 'inactive');

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
        activeEmployees: employees.filter((emp) => emp.status === 'Active').length,
        departmentStats: Object.values(departmentStats),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onLeave = stats.totalEmployees - stats.activeEmployees;
  const departments = [...stats.departmentStats].sort((a, b) => b.count - a.count);
  const largest = departments[0]?.count || 1;

  return (
    <div className="space-y-8">
      <StatGroup
        items={[
          { label: 'Active employees', value: loading ? '—' : stats.totalEmployees, tone: 'present' },
          { label: 'On leave', value: loading ? '—' : onLeave, tone: onLeave ? 'late' : undefined },
          { label: 'Departments', value: loading ? '—' : stats.departmentStats.length },
        ]}
      />

      {!loading && departments.length > 0 && (
        <Section title="Departments">
          <Panel className="overflow-hidden">
            <ul className="divide-y divide-line">
              {departments.map((dept) => {
                const deptOnLeave = dept.count - dept.active;
                return (
                  <li key={dept.name} className="grid grid-cols-[1fr_auto] sm:grid-cols-[200px_1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3">
                    <p className="text-sm font-medium text-ink truncate">{dept.name}</p>
                    <div className="order-last col-span-2 sm:order-none sm:col-span-1 h-2 rounded-full bg-paper overflow-hidden" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-ink"
                        style={{ width: `${(dept.count / largest) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted tabular-nums text-right whitespace-nowrap">
                      <span className="text-ink">{dept.count}</span> {dept.count === 1 ? 'employee' : 'employees'}
                      {deptOnLeave > 0 && `, ${deptOnLeave} on leave`}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </Section>
      )}
    </div>
  );
};

export default EmployeeStats;
