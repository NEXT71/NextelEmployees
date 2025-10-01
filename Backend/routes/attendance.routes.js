import express from 'express';
import {
  bulkUpdateAdminAttendance,
  clockIn,
  clockOut,
  getAdminAttendance,
  getAttendance,
  getAttendanceStatus,
  updateAdminAttendance,
  getAdminAttendanceSummary,
  getAttendanceTimeWindow,
  triggerAbsenceMarking
} from '../controllers/attendance.controller.js';
import auth from '../middlewares/auth.js';
import admin from '../middlewares/admin.js';
import { attendanceTimeAccessControl } from '../middlewares/attendanceTimeAccess.js';

const attendanceRouter = express.Router();

// Clock in/out routes with specific attendance time restrictions (6PM - 5:30AM)
attendanceRouter.post('/clock-in', auth, attendanceTimeAccessControl, clockIn);
attendanceRouter.post('/clock-out', auth, attendanceTimeAccessControl, clockOut);

// Other attendance routes without the stricter time restriction
attendanceRouter.get('/', auth, getAttendance);
attendanceRouter.get('/status', auth, getAttendanceStatus);
attendanceRouter.get('/time-window', getAttendanceTimeWindow);

attendanceRouter.get('/admin', auth, admin, getAdminAttendance);
attendanceRouter.put('/admin/:id', auth, admin, updateAdminAttendance);
attendanceRouter.post('/admin/bulk', auth, admin, bulkUpdateAdminAttendance);
attendanceRouter.get('/admin/summary', auth, admin, getAdminAttendanceSummary);

// Manual trigger for absence marking (Admin only, for testing/manual use)
attendanceRouter.post('/admin/mark-absences', auth, admin, triggerAbsenceMarking);

export default attendanceRouter;