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
import { markAbsentEmployees } from '../jobs/attendanceJobs.js';

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

    // Get today's date at midnight UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Check if there's an existing attendance record (likely auto-marked as Absent)
    const existingAttendance = await Attendance.findOne({
      employee: employee._id,
      date: today
    });

    // If record exists and is auto-marked Absent, update it to Present
    if (existingAttendance) {
      if (existingAttendance.clockIn) {
        return res.status(400).json({
          success: false,
          message: 'You have already clocked in for today',
          existingRecord: {
            clockIn: existingAttendance.clockIn,
            status: existingAttendance.status
          }
        });
      }

      // Update the auto-marked absent record
      existingAttendance.clockIn = new Date();
      existingAttendance.status = 'Present';
      existingAttendance.autoMarked = false;
      existingAttendance.notes = 'Clocked in during attendance window';
      await existingAttendance.save();

      return res.status(200).json({
        success: true,
        message: 'Successfully clocked in',
        data: {
          id: existingAttendance._id,
          clockIn: existingAttendance.clockIn,
          status: existingAttendance.status,
          employee: {
            id: employee._id,
            employeeId: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`
          }
        }
      });
    }

    // If no record exists, create new one (shouldn't happen if scheduler is working)
    const newAttendance = await Attendance.create({
      employee: employee._id,
      date: today,
      clockIn: new Date(),
      status: 'Present',
      autoMarked: false
    });

    return res.status(201).json({
      success: true,
      message: 'Successfully clocked in',
      data: {
        id: newAttendance._id,
        clockIn: newAttendance.clockIn,
        status: newAttendance.status,
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`
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
        hasClockedIn: !!attendance && !!attendance.clockIn,
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

    // Get all employees and filter out admins
    let employeeFilter = {};
    if (department) {
      employeeFilter.department = department;
    }
    
    // Find all employees with their user role
    const employees = await Employee.find(employeeFilter)
      .populate('user', 'role username');
    
    console.log('🔍 DEBUG: Total employees found:', employees.length);
    employees.forEach(emp => {
      console.log(`   - ${emp.employeeId} (${emp.firstName} ${emp.lastName}):`, 
        emp.user ? `User: ${emp.user.username}, Role: ${emp.user.role}` : 'NO USER LINKED');
    });
    
    // Filter out employees who have admin role
    const nonAdminEmployees = employees.filter(emp => {
      const isAdmin = emp.user && emp.user.role === 'admin';
      if (isAdmin) {
        console.log(`   ❌ EXCLUDING ADMIN: ${emp.employeeId} (${emp.firstName} ${emp.lastName})`);
      }
      return !isAdmin;
    });
    
    console.log('✅ Non-admin employees after filtering:', nonAdminEmployees.length);
    
    const nonAdminEmployeeIds = nonAdminEmployees.map(e => e._id);
    
    // Add employee filter to query
    query.employee = { $in: nonAdminEmployeeIds };
    
    console.log('📊 Query employee IDs:', nonAdminEmployeeIds.length);

    const attendance = await Attendance.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId department',
        model: 'Employee'
      })
      .sort({ date: -1 });

    console.log('📝 Attendance records returned:', attendance.length);

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
    const { status, clockIn } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance ID'
      });
    }

    const updates = {};
    if (status) updates.status = status;
    if (clockIn) updates.clockIn = new Date(clockIn);

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
            ...(update.clockIn && { clockIn: new Date(update.clockIn) })
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

    // Get all employees and filter out admins
    let employeeFilter = {};
    if (department) {
      employeeFilter.department = department;
    }
    
    // Find all non-admin employees
    const employees = await Employee.find(employeeFilter)
      .populate('user', 'role');
    
    // Filter out employees who have admin role
    const nonAdminEmployees = employees.filter(emp => 
      !emp.user || emp.user.role !== 'admin'
    );
    
    const nonAdminEmployeeIds = nonAdminEmployees.map(e => e._id);
    matchQuery.employee = { $in: nonAdminEmployeeIds };

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

    // Count only non-admin employees
    const totalEmployees = nonAdminEmployees.length;

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

// Manual trigger for marking absences (Admin only)
export const triggerAbsenceMarking = async (req, res) => {
  try {
    const result = await markAbsentEmployees();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Successfully processed absence marking`,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to mark absences',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error triggering absence marking:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering absence marking',
      error: error.message
    });
  }
};