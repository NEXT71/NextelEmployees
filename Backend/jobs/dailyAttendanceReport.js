import cron from 'node-cron';
import Attendance from '../models/Attendance.js';
import '../models/Employee.js';
import { sendMail, isMailerConfigured } from '../utils/mailer.js';
import { isOffDay } from '../utils/holidays.js';
import { isAttendanceExempt } from '../utils/attendanceScope.js';
import '../models/User.js';

// Who receives the daily attendance summary. Comma-separate for several addresses.
const DEFAULT_RECIPIENTS = 'siyashehroz@gmail.com';
const getRecipients = () => process.env.ATTENDANCE_REPORT_TO || DEFAULT_RECIPIENTS;

const PKT = 'Asia/Karachi';
const STATUS_ORDER = { Present: 0, Late: 1, 'Half-day': 2, Absent: 3 };
const STATUS_COLOR = { Present: '#15803d', Late: '#b45309', 'Half-day': '#b45309', Absent: '#b91c1c' };

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const fmtTime = (d) => (d
  ? new Date(d).toLocaleTimeString('en-US', { timeZone: PKT, hour: 'numeric', minute: '2-digit' })
  : '—');

const fmtDuration = (start, end) => {
  if (!start || !end) return '—';
  const mins = Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};

// The shift that ended this morning started "yesterday" (PKT). Attendance dates are
// stored as UTC midnight of the shift's start day, same as finalizeAttendance().
export const getLastShiftDate = (now = new Date()) => {
  const pkt = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return new Date(Date.UTC(pkt.getUTCFullYear(), pkt.getUTCMonth(), pkt.getUTCDate() - 1));
};

export const buildAttendanceSummary = async (shiftDate) => {
  const records = await Attendance.find({ date: shiftDate })
    .populate({ path: 'employee', select: 'firstName lastName employeeId department user', populate: { path: 'user', select: 'role' } })
    .lean();

  const rows = records
    .filter((r) => r.employee && !isAttendanceExempt(r.employee))
    .map((r) => ({
      name: `${r.employee.firstName || ''} ${r.employee.lastName || ''}`.trim() || 'Unknown',
      employeeId: r.employee.employeeId || '—',
      department: r.employee.department || '—',
      status: r.status,
      clockIn: r.clockIn,
      clockOut: r.clockOut,
      autoClockOut: /Auto-clocked out/i.test(r.notes || '')
    }))
    .sort((a, b) =>
      (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
      (a.clockIn && b.clockIn ? new Date(a.clockIn) - new Date(b.clockIn) : 0) ||
      a.name.localeCompare(b.name));

  const count = (status) => rows.filter((r) => r.status === status).length;
  return {
    shiftDate,
    rows,
    totals: {
      total: rows.length,
      present: count('Present'),
      late: count('Late'),
      halfDay: count('Half-day'),
      absent: count('Absent')
    }
  };
};

export const renderAttendanceEmail = ({ shiftDate, rows, totals }) => {
  const dateLabel = shiftDate.toLocaleDateString('en-GB', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const offDay = isOffDay(shiftDate);

  const stat = (label, value, color = '#111827') =>
    `<td style="padding:12px 16px;border:1px solid #e5e7eb;">
       <div style="font-size:12px;color:#6b7280;">${label}</div>
       <div style="font-size:22px;font-weight:600;color:${color};">${value}</div>
     </td>`;

  const tableRows = rows.map((r) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;">${escapeHtml(r.name)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${escapeHtml(r.employeeId)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${escapeHtml(r.department)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;color:${STATUS_COLOR[r.status] || '#111827'};font-weight:600;">${escapeHtml(r.status)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;">${fmtTime(r.clockIn)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;">${fmtTime(r.clockOut)}${r.autoClockOut ? ' <span style="color:#b45309;font-size:11px;">(auto)</span>' : ''}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;">${fmtDuration(r.clockIn, r.clockOut)}</td>
    </tr>`).join('');

  const th = (h) => `<th style="text-align:left;padding:8px 10px;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;">${h}</th>`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:900px;">
    <h2 style="margin:0 0 4px;">Attendance summary</h2>
    <p style="margin:0 0 16px;color:#6b7280;">Shift starting ${escapeHtml(dateLabel)} (5:30 PM to 6:30 AM PKT)${offDay ? ' · Official off day' : ''}</p>
    <table style="border-collapse:collapse;margin-bottom:20px;"><tr>
      ${stat('Total', totals.total)}
      ${stat('Present', totals.present, STATUS_COLOR.Present)}
      ${stat('Late', totals.late, STATUS_COLOR.Late)}
      ${stat('Half-day', totals.halfDay, STATUS_COLOR['Half-day'])}
      ${stat('Absent', totals.absent, STATUS_COLOR.Absent)}
    </tr></table>
    ${rows.length === 0
      ? '<p>No attendance records for this shift.</p>'
      : `<table style="border-collapse:collapse;width:100%;font-size:13px;">
          <thead><tr>${['Employee', 'ID', 'Department', 'Status', 'Clock in', 'Clock out', 'Worked'].map(th).join('')}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>`}
    <p style="margin-top:16px;font-size:11px;color:#9ca3af;">Times are in PKT. "(auto)" means the employee forgot to clock out and the system clocked them out at 6:30 AM.</p>
  </div>`;

  const text = [
    `Attendance summary: shift starting ${dateLabel}`,
    `Total ${totals.total} | Present ${totals.present} | Late ${totals.late} | Half-day ${totals.halfDay} | Absent ${totals.absent}`,
    '',
    ...rows.map((r) => `${r.name} (${r.employeeId}, ${r.department}): ${r.status}, in ${fmtTime(r.clockIn)}, out ${fmtTime(r.clockOut)}, worked ${fmtDuration(r.clockIn, r.clockOut)}`)
  ].join('\n');

  return { subject: `Attendance summary: ${dateLabel}`, html, text };
};

export const sendDailyAttendanceReport = async (shiftDate = getLastShiftDate()) => {
  try {
    if (!isMailerConfigured()) {
      console.warn('⚠️ Daily attendance email skipped: EMAIL_USERNAME / EMAIL_PASSWORD not set');
      return { success: false, error: 'Email not configured' };
    }
    const summary = await buildAttendanceSummary(shiftDate);
    const { subject, html, text } = renderAttendanceEmail(summary);
    await sendMail({ to: getRecipients(), subject, html, text });
    console.log(`📧 Daily attendance summary sent for ${shiftDate.toISOString().slice(0, 10)} (${summary.totals.total} records)`);
    return { success: true, totals: summary.totals };
  } catch (error) {
    console.error('❌ Failed to send daily attendance summary:', error.message);
    return { success: false, error: error.message };
  }
};

// 6:45 AM PKT: after finalizeAttendance (6:30 AM) has auto-clocked-out stragglers
export const scheduleDailyAttendanceReport = () => {
  cron.schedule('45 6 * * *', async () => {
    console.log('⏰ Scheduled job triggered: Daily attendance summary email (6:45 AM PKT)');
    await sendDailyAttendanceReport();
  }, { timezone: PKT });
  console.log('   - 6:45 AM PKT: Email daily attendance summary');
};
