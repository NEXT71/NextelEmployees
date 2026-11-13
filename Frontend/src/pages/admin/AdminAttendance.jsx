import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Download, RefreshCw, Pencil } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import AdminShell from '../../components/admin/AdminShell';
import Panel from '../../components/ui/Panel';
import StatGroup from '../../components/ui/StatGroup';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Dialog from '../../components/ui/Dialog';
import { Tabs } from '../../components/ui/Tabs';
import { Field, Input, Select } from '../../components/ui/Field';
import { API_BASE_URL } from '../../utils/constants';

const DEPARTMENTS = [
  'Sales',
  'Quality Assurance',
  'HR'
];

const STATUS_OPTIONS = [
  { value: 'Present', label: 'Present' },
  { value: 'Absent', label: 'Absent' },
  { value: 'Late', label: 'Late' },
  { value: 'Half-day', label: 'Half day' }
];

const STATUS_TEXT = {
  Present: 'text-present',
  Absent: 'text-absent',
  Late: 'text-late',
  'Half-day': 'text-late',
};

const emptySummary = {
  Present: 0,
  Absent: 0,
  Late: 0,
  'Half-day': 0,
  totalEmployees: 0
};

// DatePicker renders its own <input>; give it the same look as Field inputs
const datePickerClass = `h-10 w-full sm:w-40 rounded-lg border border-line bg-surface px-3 text-sm text-ink
  focus:outline-none focus:border-shift focus:ring-2 focus:ring-shift/20`;

const fmtTime = (value) =>
  value ? new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';

const fmtDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Edits clock-in or clock-out time for one record; sends the same update as before
const EditTimeDialog = ({ target, onSave, onClose }) => {
  const { record, field } = target;
  const current = record[field] ? new Date(record[field]) : null;
  const [time, setTime] = useState(
    current
      ? `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`
      : ''
  );
  const label = field === 'clockIn' ? 'clock-in' : 'clock-out';
  const name = `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim() || 'this employee';

  const save = (e) => {
    e.preventDefault();
    if (!time) return;
    const [hours, minutes] = time.split(':');
    const newDate = new Date(record.date);
    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    onSave(record._id, { [field]: newDate });
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="max-w-sm"
      title={`Edit ${label} time`}
      description={`${name}, ${fmtDate(record.date)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="edit-time-form" disabled={!time}>Save time</Button>
        </>
      }
    >
      <form id="edit-time-form" onSubmit={save}>
        <Field label={`New ${label} time`} htmlFor="edit-time">
          <Input id="edit-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} autoFocus required />
        </Field>
      </form>
    </Dialog>
  );
};

const AdminAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('daily');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isDateRange, setIsDateRange] = useState(false);
  const [summary, setSummary] = useState(emptySummary);
  const [monthlyPayrollCycle] = useState('');
  const [editTarget, setEditTarget] = useState(null); // { record, field: 'clockIn' | 'clockOut' }

  // Core fetch attendance function
  // silent: refresh in the background without swapping the table for a loading state
  const fetchAttendanceData = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();

      if (activeTab === 'daily') {
        params.append('date', selectedDate.toISOString().split('T')[0]);
      } else if (activeTab === 'monthly') {
        // Handle monthly payroll cycle
        if (monthlyPayrollCycle) {
          const [start, end] = monthlyPayrollCycle.split('_');
          params.append('startDate', start);
          params.append('endDate', end);
        }
      } else {
        params.append('startDate', startDate.toISOString().split('T')[0]);
        params.append('endDate', endDate.toISOString().split('T')[0]);
      }

      if (departmentFilter) params.append('department', departmentFilter);
      if (statusFilter) params.append('status', statusFilter);

      const attendanceRes = await axios.get(`${API_BASE_URL}/attendance/admin?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAttendance(attendanceRes.data.data || []); // Ensure we always have an array
      setIsDateRange(attendanceRes.data.isDateRange || false);

      // Then fetch the summary data
      const summaryParams = new URLSearchParams();
      if (activeTab === 'daily') {
        summaryParams.append('date', selectedDate.toISOString().split('T')[0]);
      } else if (activeTab === 'monthly') {
        if (monthlyPayrollCycle) {
          const [start, end] = monthlyPayrollCycle.split('_');
          summaryParams.append('startDate', start);
          summaryParams.append('endDate', end);
        }
      } else {
        summaryParams.append('startDate', startDate.toISOString().split('T')[0]);
        summaryParams.append('endDate', endDate.toISOString().split('T')[0]);
      }
      if (departmentFilter) summaryParams.append('department', departmentFilter);

      const summaryRes = await axios.get(`${API_BASE_URL}/attendance/admin/summary`, {
        headers: { Authorization: `Bearer ${token}` },
        params: summaryParams
      });

      setSummary(summaryRes.data.data || emptySummary);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Could not load attendance. Refresh to try again.');
      setAttendance([]); // Reset to empty array on error
      setSummary(emptySummary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDate, startDate, endDate, departmentFilter, statusFilter, monthlyPayrollCycle]);

  // Update single attendance record
  const updateAttendanceRecord = async (id, updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE_URL}/attendance/admin/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Use the server's record (it recalculates status from the times); fall back to the sent fields
        const saved = response.data.data;
        const merge = (record) => (record._id === id
          ? { ...record, ...updates, ...(saved && typeof saved === 'object' ? saved : {}), employee: saved?.employee?.firstName ? saved.employee : record.employee }
          : record);
        // Date-range views hold groups of records; daily view is a flat list
        setAttendance((prev) => prev.map((item) => (Array.isArray(item.records)
          ? { ...item, records: item.records.map(merge) }
          : merge(item))));
        // Summary counts may have changed: refresh quietly in the background
        fetchAttendanceData({ silent: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the record. Try again.');
    }
  };

  // Filtered attendance - handle both flat array and grouped data
  const getAllRecords = () => {
    if (isDateRange && Array.isArray(attendance)) {
      return attendance.flatMap(group => group.records || []);
    }
    return attendance;
  };

  const matchesSearch = (record) => {
    const employeeName = record.employee
      ? `${record.employee.firstName || ''} ${record.employee.lastName || ''}`.toLowerCase()
      : '';
    const employeeId = record.employee?.employeeId?.toLowerCase() || '';
    return employeeName.includes(searchTerm.toLowerCase()) || employeeId.includes(searchTerm.toLowerCase());
  };

  const filteredAttendance = getAllRecords().filter(matchesSearch);
  const totalRecords = getAllRecords().length;

  // Export to CSV
  const exportToCSV = () => {
    const allRecords = getAllRecords();
    if (allRecords.length === 0) {
      setError('There are no records to export for these filters.');
      return;
    }

    const headers = [
      'Date', 'Employee ID', 'Name', 'Department', 'Status', 'Clock In', 'Clock Out'
    ];

    const data = [
      headers.join(','),
      ...allRecords.map(record => [
        new Date(record.date).toLocaleDateString(),
        record.employee?.employeeId || '',
        `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(),
        record.employee?.department || '',
        record.status,
        record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '',
        record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : ''
      ].map(field => `"${field?.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    let filename;
    if (activeTab === 'daily') {
      filename = `attendance_${selectedDate.toISOString().split('T')[0]}.csv`;
    } else if (activeTab === 'monthly' && monthlyPayrollCycle) {
      const [start, end] = monthlyPayrollCycle.split('_');
      filename = `attendance_payroll_${start}_to_${end}.csv`;
    } else {
      filename = `attendance_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv`;
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderRow = (record) => (
    <tr key={record._id}>
      <td className="px-5 py-3 text-ink">{fmtDate(record.date)}</td>
      <td className="px-3 py-3">
        <span className="font-medium text-ink">{record.employee?.firstName} {record.employee?.lastName}</span>
        <span className="block text-xs text-muted">{record.employee?.employeeId || 'No ID'}</span>
      </td>
      <td className="px-3 py-3 text-ink">{record.employee?.department || 'Not assigned'}</td>
      <td className="px-3 py-3">
        <select
          value={record.status}
          onChange={(e) => updateAttendanceRecord(record._id, { status: e.target.value })}
          aria-label={`Status for ${record.employee?.firstName || 'employee'}`}
          className={`h-8 rounded-md border border-line bg-surface pl-2 pr-7 text-xs font-medium focus:outline-none focus:border-shift focus:ring-2 focus:ring-shift/20 ${STATUS_TEXT[record.status] || 'text-ink'}`}
        >
          {STATUS_OPTIONS.map(status => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </td>
      {['clockIn', 'clockOut'].map((field) => (
        <td key={field} className="px-3 py-3">
          <button
            type="button"
            onClick={() => setEditTarget({ record, field })}
            className="group inline-flex items-center gap-1.5 rounded-md px-1.5 -mx-1.5 py-0.5 text-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift"
            title={`Edit ${field === 'clockIn' ? 'clock-in' : 'clock-out'} time`}
          >
            {fmtTime(record[field])}
            <Pencil className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
          </button>
        </td>
      ))}
    </tr>
  );

  const heading =
    activeTab === 'daily'
      ? `Attendance on ${fmtDate(selectedDate)}`
      : `Attendance from ${fmtDate(startDate)} to ${fmtDate(endDate)}`;

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-ink">Attendance</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={Download} onClick={exportToCSV}>Export CSV</Button>
          <Button variant="ghost" size="icon" icon={RefreshCw} onClick={fetchAttendanceData} disabled={loading} aria-label="Refresh" />
        </div>
      </div>

      <div className="space-y-6">
        {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

        <StatGroup
          items={[
            { label: 'Employees', value: summary.totalEmployees || 0 },
            { label: 'Present', value: summary.Present || 0, tone: 'present' },
            { label: 'Late', value: summary.Late || 0, tone: 'late' },
            { label: 'Half day', value: summary['Half-day'] || 0, tone: 'late' },
            { label: 'Absent', value: summary.Absent || 0, tone: 'absent' },
          ]}
        />

        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'daily', label: 'One day' },
            { key: 'range', label: 'Date range' },
          ]}
        />

        <div className="flex flex-wrap items-end gap-3">
          {activeTab === 'daily' ? (
            <Field label="Date">
              <DatePicker selected={selectedDate} onChange={(date) => setSelectedDate(date)} className={datePickerClass} />
            </Field>
          ) : (
            <>
              <Field label="From">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  className={datePickerClass}
                />
              </Field>
              <Field label="To">
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  className={datePickerClass}
                />
              </Field>
            </>
          )}
          <Field label="Department" htmlFor="att-dept">
            <Select id="att-dept" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="sm:w-44">
              <option value="">All departments</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="att-status">
            <Select id="att-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-36">
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Search" htmlFor="att-search" className="flex-1 min-w-0 sm:min-w-[200px] w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
              <Input
                id="att-search"
                type="text"
                placeholder="Name or employee ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </Field>
        </div>

        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h2 className="text-xl font-semibold text-ink">{heading}</h2>
            {!loading && (
              <p className="text-sm text-muted tabular-nums">
                Showing {filteredAttendance.length} of {totalRecords} records
              </p>
            )}
          </div>

          <Panel className="overflow-hidden">
            {loading ? (
              <p className="px-5 py-8 text-sm text-muted">Loading attendance…</p>
            ) : filteredAttendance.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">
                {totalRecords === 0
                  ? 'No attendance records for these dates and filters.'
                  : 'No records match your search.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-line text-left">
                      {['Date', 'Employee', 'Department', 'Status', 'Clock in', 'Clock out'].map((h, i) => (
                        <th key={h} scope="col" className={`${i === 0 ? 'px-5' : 'px-3'} py-3 text-xs font-medium text-muted`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {isDateRange
                      ? attendance.map((dateGroup) => {
                          const rows = (dateGroup.records || []).filter(matchesSearch);
                          if (rows.length === 0) return null;
                          return (
                            <React.Fragment key={dateGroup.date}>
                              <tr className="bg-paper">
                                <th colSpan={6} scope="colgroup" className="px-5 py-2 text-left text-sm font-medium text-ink">
                                  {new Date(dateGroup.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                  <span className="ml-2 font-normal text-muted">{dateGroup.records.length} records</span>
                                </th>
                              </tr>
                              {rows.map(renderRow)}
                            </React.Fragment>
                          );
                        })
                      : filteredAttendance.map(renderRow)}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <p className="mt-3 text-xs text-muted">Change a status from its dropdown. Click a time to edit it.</p>
        </div>
      </div>

      {editTarget && (
        <EditTimeDialog target={editTarget} onSave={updateAttendanceRecord} onClose={() => setEditTarget(null)} />
      )}
    </AdminShell>
  );
};

export default AdminAttendance;
