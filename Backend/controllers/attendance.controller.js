import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import Employee from '../models/Employee.js'

// Updated helper function to handle timezones properly
const getTodayRange = () => {
  // Get current date in UTC
  const now = new Date();
  const todayUTC = new Date(Date.UTC(
    now.getUTCFullYear(), 
    now.getUTCMonth(), 
    now.getUTCDate(),
    0, 0, 0, 0
  ));
  
  const tomorrowUTC = new Date(todayUTC);
  tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
  
  return { 
    today: todayUTC, 
    tomorrow: tomorrowUTC 
  };
};

// Updated clockIn controller
export const clockIn = async (req, res) => {
  try {
    const userId = req.user._id;
    const employee = await Employee.findOne({ user: userId })
      .select('_id firstName lastName employeeId department')
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found for this user'
      });
    }

    // Get current date in UTC
    const currentDate = new Date();
    const utcDate = new Date(Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth(),
      currentDate.getUTCDate()
    ));

    // Check existing attendance
    const existingAttendance = await Attendance.findOne({
      employee: employee._id,
      date: { 
        $gte: utcDate,
        $lt: new Date(utcDate.getTime() + 24 * 60 * 60 * 1000) 
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: existingAttendance.clockOut 
          ? 'Already clocked out today' 
          : 'Already clocked in today'
      });
    }

    // Create new attendance record with UTC date
    const newAttendance = await Attendance.create({
      employee: employee._id,
      date: utcDate,  // Store date in UTC
      clockIn: new Date(),  // Current timestamp
      status: 'Present'
    });

    res.status(201).json({
      success: true,
      message: 'Successfully clocked in',
      data: {
        id: newAttendance._id,
        clockIn: newAttendance.clockIn,
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId,
          department: employee.department
        }
      }
    });
  } catch (error) {
    console.error('ClockIn Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during clock in'
    });
  }
};

export const clockOut = async (req, res) => {
  try {
    const userId = req.user._id;
    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    const { today, tomorrow } = getTodayRange();

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today, $lt: tomorrow },
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
      message: 'Successfully clocked out',
      data: {
        id: attendance._id,
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut,
        hoursWorked: ((attendance.clockOut - attendance.clockIn) / (1000 * 60 * 60)).toFixed(2),
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`
        }
      }
    });
  } catch (error) {
    console.error('ClockOut Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during clock out'
    });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const employee = await Employee.findOne({ user: userId });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found for this user'
      });
    }

    const attendance = await Attendance.find({ employee: employee._id })
      .sort({ date: -1 });

    res.json({
      success: true,
      data: attendance  // Remove the .data wrapper
    });
  } catch (error) {
    console.error('GetAttendance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching attendance'
    });
  }
};

export const getAttendanceStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { today, tomorrow } = getTodayRange();

    // Find employee using the user ID from the token
    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found for this user'
      });
    }

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today, $lt: tomorrow }
    });

    res.json({
      success: true,
      data: {
        isClockedIn: !!attendance,
        isClockedOut: !!attendance?.clockOut,
        record: attendance
      }
    });

  } catch (error) {
    console.error('AttendanceStatus Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking attendance status'
    });
  }
};
// Admin - Get attendance data
export const getAdminAttendance = async (req, res) => {
  try {
    const { date, startDate, endDate, department, status } = req.query;
    const query = {};

    // Date filtering
    if (date) {
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);
      query.date = { $gte: selectedDate, $lt: nextDate };
    } else if (startDate && endDate) {
      query.date = { 
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Status filtering
    if (status) {
      query.status = status;
    }

    // Department filtering
    if (department) {
      const employeesInDept = await Employee.find({ department }, '_id');
      query.employee = { $in: employeesInDept.map(e => e._id) };
    }

    // Get attendance with employee details
    const attendance = await Attendance.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId department position',
        model: 'Employee'
      })
      .sort({ date: -1 });

    res.json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    console.error('AdminGetAttendance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching attendance records'
    });
  }
};

// Admin - Update single attendance record
export const updateAdminAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, clockIn, clockOut } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance ID'
      });
    }

    const updates = {};
    if (status) updates.status = status;
    if (clockIn) updates.clockIn = new Date(clockIn);
    if (clockOut) updates.clockOut = new Date(clockOut);

    const attendance = await Attendance.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate({
      path: 'employee',
      model: 'Employee',
      select: 'firstName lastName employeeId department'
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      message: 'Attendance record updated',
      data: attendance
    });
  } catch (error) {
    console.error('AdminUpdateAttendance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating attendance record'
    });
  }
};

// Admin - Bulk update attendance
export const bulkUpdateAdminAttendance = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid update data'
      });
    }

    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update.id },
        update: {
          $set: {
            status: update.status,
            ...(update.clockIn && { clockIn: new Date(update.clockIn) }),
            ...(update.clockOut && { clockOut: new Date(update.clockOut) })
          }
        }
      }
    }));

    const result = await Attendance.bulkWrite(bulkOps);

    res.json({
      success: true,
      message: 'Bulk update completed',
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('AdminBulkUpdateAttendance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk update'
    });
  }
};

// Admin - Get attendance summary
export const getAdminAttendanceSummary = async (req, res) => {
  try {
    const { date, startDate, endDate, department } = req.query;
    const matchQuery = {};

    // Date filtering
    if (date) {
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);
      matchQuery.date = { $gte: selectedDate, $lt: nextDate };
    } else if (startDate && endDate) {
      matchQuery.date = { 
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Department filtering
    if (department) {
      const employees = await Employee.find({ department }, '_id');
      matchQuery.employee = { $in: employees.map(e => e._id) };
    }

    const summary = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Get total employee count for percentage calculations
    const totalEmployees = await Employee.countDocuments(
      department ? { department } : {}
    );

    // Convert to object format for easier frontend use
    const summaryObj = {
      Present: 0,
      Absent: 0,
      Late: 0,
      'Half-day': 0,
      totalEmployees
    };

    summary.forEach(item => {
      summaryObj[item.status] = item.count;
    });

    // Calculate absent count (total employees - present employees)
    summaryObj.Absent = totalEmployees - 
      (summaryObj.Present + summaryObj.Late + summaryObj['Half-day']);

    res.json({
      success: true,
      data: summaryObj
    });
  } catch (error) {
    console.error('AdminAttendanceSummary Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating attendance summary'
    });
  }
};