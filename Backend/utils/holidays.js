// Official off days (shift dates, YYYY-MM-DD in PKT). Every other day is a working day.
// No attendance is auto-marked on these dates and absences on them are not deducted.
export const OFF_DAYS = [
  '2026-11-01' // Sunday, official off
];

const dateKey = (date) => new Date(date).toISOString().split('T')[0];

// Attendance dates are stored as UTC midnight of the shift date
export const isOffDay = (date) => OFF_DAYS.includes(dateKey(date));

export const OFF_DAY_DATES = OFF_DAYS.map((d) => new Date(`${d}T00:00:00.000Z`));
