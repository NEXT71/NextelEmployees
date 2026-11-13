// Who attendance applies to. QA and HR staff have no clock-in, so they are never
// auto-marked absent, never shown in the HR attendance views or the daily email, and
// existing Absent records are not deducted from their salary.
const EXEMPT_DEPARTMENTS = ['Quality Assurance', 'HR'];
const EXEMPT_ROLES = ['qa', 'hr'];

// employee.user must be populated with at least `role` for the role check to apply
export const isAttendanceExempt = (employee) =>
  EXEMPT_DEPARTMENTS.includes(employee?.department) || EXEMPT_ROLES.includes(employee?.user?.role);
