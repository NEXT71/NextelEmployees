import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';

// Clock in
const clockIn = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId || req.body.employeeId;
    
    if (!employeeId) {
      return res.status(400).json({ 
        success: false,
        message: 'Employee ID is required' 
      });
    }

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if already clocked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ 
        success: false,
        message: 'Already clocked in today' 
      });
    }

    const attendance = await Attendance.create({
      employee: employeeId,
      clockIn: new Date(),
      status: 'Present'
    });

    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (err) {
    next(err);
  }
};

// Clock out
 const clockOut = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId || req.body.employeeId;
    
    if (!employeeId) {
      return res.status(400).json({ 
        success: false,
        message: 'Employee ID is required' 
      });
    }

    // Find today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      },
      clockOut: { $exists: false }
    });

    if (!attendance) {
      return res.status(400).json({ 
        success: false,
        message: 'No active attendance record found' 
      });
    }

    attendance.clockOut = new Date();
    await attendance.save();

    res.json({
      success: true,
      data: attendance
    });
  } catch (err) {
    next(err);
  }
};

// Get attendance records
 const getAttendance = async (req, res, next) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const query = {};

    if (employeeId) {
      query.employee = employeeId;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ date: -1 })
      .select('-__v');

    res.json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (err) {
    next(err);
  }
};

// Optional: Get current attendance status
 const getAttendanceStatus = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    res.json({
      success: true,
      data: {
        isClockedIn: !!attendance,
        isClockedOut: attendance?.clockOut ? true : false,
        lastActivity: attendance
      }
    });
  } catch (err) {
    next(err);
  }
};

export {clockIn, clockOut, getAttendance, getAttendanceStatus}