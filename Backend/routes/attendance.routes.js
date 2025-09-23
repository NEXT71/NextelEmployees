import express from 'express';
import {
  bulkUpdateAdminAttendance,
  clockIn,
  clockOut,
  getAdminAttendance,
  getAttendance,
  getAttendanceStatus,
  updateAdminAttendance,
  getAdminAttendanceSummary
} from '../controllers/attendance.controller.js';
import auth from '../middlewares/auth.js';
import admin from '../middlewares/admin.js';
import { timeAccessControl } from '../middlewares/timeAccess.js';

const attendanceRouter = express.Router();

// Apply time access control to all attendance routes
attendanceRouter.use(timeAccessControl);

// Protected routes
attendanceRouter.post('/clock-in', auth, clockIn);
attendanceRouter.post('/clock-out', auth, clockOut);
attendanceRouter.get('/', auth, getAttendance);
attendanceRouter.get('/status', auth, getAttendanceStatus);

attendanceRouter.get('/admin', auth, admin, getAdminAttendance);
attendanceRouter.put('/admin/:id', auth, admin, updateAdminAttendance);
attendanceRouter.post('/admin/bulk', auth, admin, bulkUpdateAdminAttendance);
attendanceRouter.get('/admin/summary', auth, admin, getAdminAttendanceSummary);

export default attendanceRouter;