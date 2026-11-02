import User from '../models/User.js';
import Employee from '../models/Employee.js';
import SalesTarget from '../models/SalesTarget.js';
import Salary from '../models/Salary.js';
import Fine from '../models/Fine.js';
import Attendance from '../models/Attendance.js';
import { logAuditDelete } from './audit.js';

const FRONTLINE_DEPARTMENTS = ['Sales', 'Verifier'];

// Login account linked to an employee, whichever side holds the reference
export const findLinkedUser = (employee) =>
  User.findOne({
    $or: [
      { employeeId: employee._id },
      ...(employee.user ? [{ _id: employee.user._id || employee.user }] : [])
    ]
  });

// CSRs and verifiers: an 'employee' login (or none) in the Sales or Verifier department.
// Admin and HR may only permanently delete these; other staff are deactivated instead.
export const isFrontlineEmployee = (employee, linkedUser) => {
  if (linkedUser && linkedUser.role !== 'employee') return false;
  return employee.isCloser === true || FRONTLINE_DEPARTMENTS.includes(employee.department);
};

// Permanently deletes an employee with their login, salaries, sales, fines and attendance.
// Everything is snapshotted to the audit log first so a super admin can restore it.
export const deleteEmployeeCascade = async (req, employee, linkedUser) => {
  const id = employee._id;
  const [salaries, sales, fines, attendance] = await Promise.all([
    Salary.find({ employee: id }).lean(),
    SalesTarget.find({ agent: id }).lean(),
    Fine.find({ employee: id }).lean(),
    Attendance.find({ employee: id }).lean()
  ]);

  await logAuditDelete(req, {
    action: 'employee.delete',
    entityType: 'employee',
    entityId: id,
    summary: `Permanently deleted ${employee.firstName} ${employee.lastName} (${employee.employeeId}) with ${salaries.length} salaries, ${sales.length} sales, ${fines.length} fines, ${attendance.length} attendance records`,
    snapshot: employee,
    meta: { salaries, sales, fines, attendance }
  });

  await Promise.all([
    Salary.deleteMany({ employee: id }),
    SalesTarget.deleteMany({ agent: id }),
    Fine.deleteMany({ employee: id }),
    Attendance.deleteMany({ employee: id }),
    linkedUser ? User.findByIdAndDelete(linkedUser._id) : Promise.resolve()
  ]);
  await Employee.findByIdAndDelete(id);

  return { salaries: salaries.length, sales: sales.length, fines: fines.length, attendance: attendance.length };
};
