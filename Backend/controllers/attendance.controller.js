import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { 
  isWithinAttendanceWindow, 
  getCurrentPKTTime, 
  getTimeUntilNextAttendanceWindow,
  formatPKTTime 
} from '../middlewares/attendanceTimeAccess.js';

const getTodayRange = () => {
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

export const clockIn = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check if within attendance time window
    if (!isWithinAttendanceWindow()) {
      const timeInfo = getTimeUntilNextAttendanceWindow();
      return res.status(403).json({
        success: false,
        message: 'Clock in is only allowed between 6:00 PM - 5:30 AM Pakistan Standard Time',
        currentTime: formatPKTTime(getCurrentPKTTime()),
        allowedWindow: '6:00 PM - 5:30 AM PKT',
        nextAvailableTime: timeInfo.nextAccessTime ? formatPKTTime(timeInfo.nextAccessTime) : null,
        error: 'ATTENDANCE_TIME_RESTRICTED'
      });
    }

    const employee = await Employee.findOne({ user: userId })
      .select('_id firstName lastName employeeId status')
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    if (employee.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Only active employees can clock in'
      });
    }

    // Get today's date at midnight UTC (matches your schema's getter)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Use employee field to match your schema
    const [existingAttendance, newAttendance] = await Promise.all([
      Attendance.findOne({
        employee: employee._id,
        date: today
      }),
      Attendance.findOneAndUpdate(
        {
          employee: employee._id,  // Matches your schema
          date: today,
          clockOut: { $exists: false }
        },
        { 
          $setOnInsert: {
            clockIn: new Date(),
            status: 'Present'
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      )
    ]);

    if (existingAttendance && existingAttendance._id.toString() !== newAttendance._id.toString()) {
      return res.status(400).json({
        success: false,
        message: existingAttendance.clockOut 
          ? 'You have already completed attendance for today'
          : 'You are already clocked in',
        existingRecord: {
          clockIn: existingAttendance.clockIn,
          clockOut: existingAttendance.clockOut,
          status: existingAttendance.status
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Successfully clocked in',
      data: {
        id: newAttendance._id,
        clockIn: newAttendance.clockIn,
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`
        }
      }
    });

  } catch (error) {
    console.error('ClockIn Error:', error);
    
    if (error.code === 11000) {
      const userId = req.user?._id || req.user?.userId;
      const employee = await Employee.findOne({ user: userId });
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      const existing = await Attendance.findOne({
        employee: employee._id,
        date: today
      });
      
      return res.status(400).json({
        success: false,
        message: existing?.clockOut 
          ? 'Attendance already completed today' 
          : 'Already clocked in today',
        existingRecord: existing || null
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during clock in'
    });
  }
};

// Similarly update clockOut
export const clockOut = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.userId;
    
    // Check if within attendance time window
    if (!isWithinAttendanceWindow()) {
      const timeInfo = getTimeUntilNextAttendanceWindow();
      return res.status(403).json({
        success: false,
        message: 'Clock out is only allowed between 6:00 PM - 5:30 AM Pakistan Standard Time',
        currentTime: formatPKTTime(getCurrentPKTTime()),
        allowedWindow: '6:00 PM - 5:30 AM PKT',
        nextAvailableTime: timeInfo.nextAccessTime ? formatPKTTime(timeInfo.nextAccessTime) : null,
        error: 'ATTENDANCE_TIME_RESTRICTED'
      });
    }
    
    // Find employee by user reference
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

// Update getAttendance to match registration flow
export const getAttendance = async (req, res) => {
  try {
const userId = req.user?._id || req.user?.userId;
    
    // Find employee by user reference
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
      data: attendance
    });
  } catch (error) {
    console.error('GetAttendance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching attendance'
    });
  }
};

// Update getAttendanceStatus
export const getAttendanceStatus = async (req, res) => {
  try {
const userId = req.user?._id || req.user?.userId;
    const { today, tomorrow } = getTodayRange();

    // Find employee by user reference
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
        isClockedIn: !!attendance && !attendance.clockOut,
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
export const getAdminAttendance = async (req, res) => {
  try {
    const { date, startDate, endDate, department, status } = req.query;
    const query = {};

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

    if (status) {
      query.status = status;
    }

    if (department) {
      const employeesInDept = await Employee.find({ department }, '_id');
      query.employee = { $in: employeesInDept.map(e => e._id) };
    }

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

export const getAdminAttendanceSummary = async (req, res) => {
  try {
    const { date, startDate, endDate, department } = req.query;
    const matchQuery = {};

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

    const totalEmployees = await Employee.countDocuments(
      department ? { department } : {}
    );

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

export const getAttendanceTimeWindow = async (req, res) => {
  try {
    const timeInfo = getTimeUntilNextAttendanceWindow();
    const currentTime = getCurrentPKTTime();
    
    res.json({
      success: true,
      data: {
        isWithinAttendanceWindow: isWithinAttendanceWindow(),
        currentTime: formatPKTTime(currentTime),
        allowedWindow: '7:00 PM - 5:30 AM PKT',
        ...timeInfo
      }
    });
  } catch (error) {
    console.error('Error checking attendance time window:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking attendance time window',
      error: error.message
    });
  }
};