import { useState } from 'react';
import { Search, ReceiptText } from 'lucide-react';
import { FINE_TYPES } from '../../utils/constants';
import { formatPKR } from '../employees/MonthLedger';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Field';

const BulkFineModal = ({ isOpen, onClose, employees, onApply }) => {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [fineType, setFineType] = useState(FINE_TYPES[0].name);
  const [fineAmount, setFineAmount] = useState(FINE_TYPES[0].amount);
  const [description, setDescription] = useState('');
  const [fineDate, setFineDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const handleFineTypeChange = (e) => {
    const selectedType = FINE_TYPES.find(type => type.name === e.target.value);
    setFineType(selectedType.name);
    setFineAmount(selectedType.amount);
  };

  const toggleEmployee = (employeeId) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleApply = async () => {
    if (selectedEmployees.length === 0) {
      alert('Select at least one employee.');
      return;
    }

    setIsApplying(true);
    try {
      await onApply({
        employeeIds: selectedEmployees,
        type: fineType,
        amount: fineAmount,
        description,
        date: fineDate
      });

      // Reset form
      setSelectedEmployees([]);
      setDescription('');
      setSearchTerm('');
      setDepartmentFilter('');
      onClose();
    } catch (error) {
      console.error('Error applying bulk fine:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = departmentFilter ? emp.department === departmentFilter : true;

    return matchesSearch && matchesDepartment;
  });

  const toggleAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp._id));
    }
  };

  const departments = [...new Set(employees.map(emp => emp.department))];
  const count = selectedEmployees.length;
  const allSelected = filteredEmployees.length > 0 && count === filteredEmployees.length;

  return (
    <Dialog
      open
      onClose={onClose}
      size="max-w-3xl"
      title="Fine several employees"
      description={`${count} of ${filteredEmployees.length} employees selected`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isApplying}>Cancel</Button>
          <Button variant="danger" icon={ReceiptText} onClick={handleApply} disabled={isApplying || count === 0}>
            {isApplying ? 'Adding fines…' : `Fine ${count} employee${count !== 1 ? 's' : ''}`}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Fine type" htmlFor="bulk-type">
            <Select id="bulk-type" value={fineType} onChange={handleFineTypeChange}>
              {FINE_TYPES.map((type) => (
                <option key={type.name} value={type.name}>
                  {type.name} ({formatPKR(type.amount)})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount (PKR)" htmlFor="bulk-amount">
            <Input id="bulk-amount" type="number" value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} />
          </Field>
          <Field label="Date" htmlFor="bulk-date">
            <Input id="bulk-date" type="date" value={fineDate} onChange={(e) => setFineDate(e.target.value)} />
          </Field>
          <Field label="Reason (optional)" htmlFor="bulk-desc" className="sm:col-span-3" hint="Each employee sees this next to the fine.">
            <Textarea id="bulk-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="resize-none" />
          </Field>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-ink mb-2">Employees</legend>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
              <Input
                type="text"
                aria-label="Search employees"
                placeholder="Search name, email or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select aria-label="Department" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="sm:w-48">
              <option value="">All departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </Select>
          </div>

          <div className="rounded-lg border border-line overflow-hidden">
            <label className="flex items-center gap-3 px-3 py-2.5 bg-paper border-b border-line text-sm font-medium text-ink cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded border-line accent-ink" />
              Select all ({filteredEmployees.length})
            </label>
            <div className="max-h-64 overflow-y-auto divide-y divide-line">
              {filteredEmployees.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted">No employees match.</p>
              ) : (
                filteredEmployees.map(employee => {
                  const checked = selectedEmployees.includes(employee._id);
                  return (
                    <label
                      key={employee._id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${checked ? 'bg-shift-soft' : 'hover:bg-paper'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmployee(employee._id)}
                        className="w-4 h-4 rounded border-line accent-ink"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink truncate">{employee.firstName} {employee.lastName}</span>
                        <span className="block text-xs text-muted truncate">{employee.employeeId}, {employee.department}</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
};

export default BulkFineModal;
