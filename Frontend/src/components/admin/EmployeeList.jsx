import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';
import { employeeAPI } from '../../utils/api';
import { Section } from '../ui/Panel';
import DataTable from '../ui/DataTable';
import Badge from '../ui/Badge';
import { Input, Select } from '../ui/Field';

const statusTone = { Active: 'present', 'On Leave': 'late' };

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await employeeAPI.getAllEmployees();
      // Admin pages show active employees only (On Leave counts as active)
      setEmployees((data.data || []).filter((emp) => String(emp.status || '').toLowerCase() !== 'inactive'));
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return employees.filter((emp) => {
      const matchesSearch =
        emp.firstName?.toLowerCase().includes(q) ||
        emp.lastName?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.employeeId?.toLowerCase().includes(q);

      const matchesDepartment = !filterDepartment || emp.department === filterDepartment;

      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchTerm, filterDepartment]);

  const departments = [...new Set(employees.map((emp) => emp.department).filter(Boolean))];

  const empty =
    searchTerm || filterDepartment
      ? 'No active employees match your search.'
      : 'No active employees yet. Add one with the button above.';

  return (
    <Section title="Active employees">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
          <Input
            type="text"
            aria-label="Search employees"
            placeholder="Search name, email or employee ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select aria-label="Department" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </Select>
      </div>

      <DataTable
        loading={loading}
        empty={empty}
        rows={filteredEmployees}
        columns={[
          {
            key: 'name',
            header: 'Employee',
            render: (emp) => (
              <>
                <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                <span className="block text-xs text-muted">{emp.employeeId || 'No ID'}</span>
              </>
            ),
          },
          {
            key: 'contact',
            header: 'Contact',
            render: (emp) => (
              <>
                {emp.email || '—'}
                <span className="block text-xs text-muted">{emp.contact?.phone || emp.phoneNumber || 'No phone'}</span>
              </>
            ),
          },
          { key: 'department', header: 'Department', render: (emp) => emp.department || '—' },
          { key: 'hired', header: 'Hired', render: (emp) => formatDate(emp.hireDate || emp.startDate) },
          {
            key: 'status',
            header: 'Status',
            render: (emp) => <Badge tone={statusTone[emp.status] || 'absent'}>{emp.status || 'Unknown'}</Badge>,
          },
        ]}
      />
      {!loading && filteredEmployees.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Showing {filteredEmployees.length} of {employees.length} active employees
        </p>
      )}
    </Section>
  );
};

export default EmployeeList;
