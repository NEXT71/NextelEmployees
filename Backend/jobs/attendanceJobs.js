import cron from 'node-cron';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';

/**
 * Mark all active employees as absent at the start of attendance window (6:00 PM PKT)
 * This creates baseline attendance records for all employees
 * When employees clock in, their status will be updated from Absent to Present/Late
 */
export const markAbsentEmployees = async () => {
  try {
    console.log('🔄 Running auto-absence marking job...');
    
    // Get current date in Pakistan Time and set to beginning of shift day
    const now = new Date();
    const pktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
    
    // For night shift (6 PM - 5:30 AM), the "attendance day" starts at 6 PM
    // Set date to today at midnight for consistency
    const attendanceDate = new Date(Date.UTC(
      pktTime.getUTCFullYear(), 
      pktTime.getUTCMonth(), 
      pktTime.getUTCDate(),
      0, 0, 0, 0
    ));
    
    console.log(`📅 Marking absences for date: ${attendanceDate.toISOString()}`);
    
    // Get all active employees and populate user to check role
    const allEmployees = await Employee.find({ status: 'Active' }).populate('user', 'role');
    console.log(`👥 Found ${allEmployees.length} active employees`);
    
    // Filter out admin users from attendance tracking
    const nonAdminEmployees = allEmployees.filter(emp => 
      !emp.user || emp.user.role !== 'admin'
    );
    
    console.log(`👤 Filtered to ${nonAdminEmployees.length} non-admin employees`);
    
    if (nonAdminEmployees.length === 0) {
      console.log('⚠️ No non-admin employees found');
      return { success: true, count: 0, message: 'No non-admin employees to mark' };
    }
    
    // Get employees who already have attendance records for today
    const todayAttendance = await Attendance.find({
      date: attendanceDate
    });
    
    const employeesWithRecords = new Set(
      todayAttendance.map(record => record.employee.toString())
    );
    
    console.log(`✅ ${employeesWithRecords.size} employees already have attendance records`);
    
    // Find employees without attendance records
    const employeesWithoutRecords = nonAdminEmployees.filter(
      emp => !employeesWithRecords.has(emp._id.toString())
    );
    
    console.log(`❌ ${employeesWithoutRecords.length} employees need absence records`);
    
    if (employeesWithoutRecords.length === 0) {
      console.log('✅ All non-admin employees already have attendance records for today');
      return { 
        success: true, 
        count: 0, 
        message: 'All non-admin employees already have attendance records',
        totalEmployees: nonAdminEmployees.length,
        withRecords: employeesWithRecords.size
      };
    }
    
    // Create absent records for employees without records
    const absentRecords = [];
    for (const employee of employeesWithoutRecords) {
      try {
        const record = await Attendance.create({
          employee: employee._id,
          date: attendanceDate,
          status: 'Absent',
          clockIn: null,
          clockOut: null,
          autoMarked: true,
          notes: 'Auto-marked absent at shift start (6:00 PM PKT)'
        });
        absentRecords.push(record);
        console.log(`✅ Marked absent: ${employee.firstName} ${employee.lastName} (${employee.employeeId})`);
      } catch (err) {
        console.error(`❌ Error marking absent for ${employee.employeeId}:`, err.message);
      }
    }
    
    console.log(`✅ Successfully marked ${absentRecords.length} non-admin employees as absent`);
    
    return { 
      success: true, 
      count: absentRecords.length,
      totalEmployees: nonAdminEmployees.length,
      withRecords: employeesWithRecords.size,
      newAbsenceRecords: absentRecords.length,
      date: attendanceDate
    };
    
  } catch (error) {
    console.error('❌ Error in auto-absence marking:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Finalize attendance at end of shift window (5:30 AM PKT)
 * Log final attendance status for reporting
 */
export const finalizeAttendance = async () => {
  try {
    console.log('🔄 Running attendance finalization job...');
    
    const now = new Date();
    const pktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
    
    // Get yesterday's date (since shift ends at 5:30 AM, we're finalizing yesterday's shift)
    const yesterdayPKT = new Date(pktTime);
    yesterdayPKT.setDate(yesterdayPKT.getDate() - 1);
    
    const attendanceDate = new Date(Date.UTC(
      yesterdayPKT.getUTCFullYear(), 
      yesterdayPKT.getUTCMonth(), 
      yesterdayPKT.getUTCDate(),
      0, 0, 0, 0
    ));
    
    console.log(`📅 Finalizing attendance for date: ${attendanceDate.toISOString()}`);
    
    // Get all attendance records for the shift
    const records = await Attendance.find({ date: attendanceDate }).populate('employee');
    
    // Count statuses
    const summary = {
      total: records.length,
      present: records.filter(r => r.status === 'Present').length,
      absent: records.filter(r => r.status === 'Absent').length,
      late: records.filter(r => r.status === 'Late').length,
      halfDay: records.filter(r => r.status === 'Half-day').length,
      autoMarked: records.filter(r => r.autoMarked).length
    };
    
    console.log('📊 Attendance Summary:');
    console.log(`   Total: ${summary.total}`);
    console.log(`   Present: ${summary.present}`);
    console.log(`   Absent: ${summary.absent}`);
    console.log(`   Late: ${summary.late}`);
    console.log(`   Half-day: ${summary.halfDay}`);
    console.log(`   Auto-marked: ${summary.autoMarked}`);
    
    return { success: true, summary, date: attendanceDate };
    
  } catch (error) {
    console.error('❌ Error in attendance finalization:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Schedule automated attendance jobs
 * - 6:00 PM PKT: Mark all employees absent (start of shift)
 * - 5:30 AM PKT: Finalize attendance (end of shift)
 */
export const scheduleAttendanceJobs = () => {
  // Schedule absence marking at 6:00 PM PKT daily
  // This runs when the attendance window opens
  cron.schedule('0 18 * * *', async () => {
    console.log('⏰ Scheduled job triggered: Mark absences at shift start (6:00 PM PKT)');
    await markAbsentEmployees();
  }, {
    timezone: "Asia/Karachi"
  });
  
  // Schedule attendance finalization at 5:30 AM PKT daily
  // This runs when the attendance window closes
  cron.schedule('30 5 * * *', async () => {
    console.log('⏰ Scheduled job triggered: Finalize attendance at shift end (5:30 AM PKT)');
    await finalizeAttendance();
  }, {
    timezone: "Asia/Karachi"
  });
  
  console.log('✅ Attendance scheduling initialized:');
  console.log('   - Absence marking: 6:00 PM PKT daily (shift start)');
  console.log('   - Attendance finalization: 5:30 AM PKT daily (shift end)');
};
