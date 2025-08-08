import express from 'express'
const attendanceRouter = express.Router();
import { clockIn, clockOut, getAttendance, getAttendanceStatus } from '../controllers/attendance.controller.js';
import auth from '../middlewares/auth.js';

attendanceRouter.post('/clock-in', auth, clockIn);
attendanceRouter.post('/clock-out', auth, clockOut);
attendanceRouter.get('/', auth, getAttendance);

export default attendanceRouter;