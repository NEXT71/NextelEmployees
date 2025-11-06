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
    
    // For night shift (6 PM - 6:30 AM), the "attendance day" starts at 6 PM
    // Set date to today at midnight for consistency
    const attendanceDate = new Date(Date.UTC(
      pktTime.getUTCFullYear(), 
      pktTime.getUTCMonth(), 
      pktTime.getUTCDate(),
      0, 0, 0, 0
    ));
    
    console.log(`📅 Creating absence records for date: ${attendanceDate.toISOString()}`);
    console.log(`⏰ Current PKT Time: ${pktTime.toLocaleString()}`);
    
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
 * Finalize attendance at end of shift window (6:30 AM PKT)
 * Auto-clock out employees who forgot to clock out
 * Log final attendance status for reporting
 * CRITICAL: This is where auto-reset happens to prevent employees being clocked out during their shift
 */
export const finalizeAttendance = async () => {
  try {
    console.log('🔄 Running attendance finalization job at shift end (6:30 AM PKT)...');
    
    const now = new Date();
    const pktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
    console.log(`⏰ Current PKT Time: ${pktTime.toLocaleString()}`);
    
    // IMPORTANT: At 6:30 AM, we're finalizing TODAY's shift (which started yesterday at 6 PM)
    // The shift that's ending is the one that started yesterday at 6 PM
    // So we need to finalize YESTERDAY's date records
    
    const yesterdayPKT = new Date(pktTime);
    yesterdayPKT.setDate(yesterdayPKT.getDate() - 1);
    
    const attendanceDate = new Date(Date.UTC(
      yesterdayPKT.getUTCFullYear(), 
      yesterdayPKT.getUTCMonth(), 
      yesterdayPKT.getUTCDate(),
      0, 0, 0, 0
    ));
    
    console.log(`📅 Finalizing attendance for shift date: ${attendanceDate.toISOString()}`);
    console.log(`📅 (This is the shift that started at 6 PM yesterday and ends now at 6:30 AM)`);
    
    // AUTO CLOCK-OUT: Find employees who are still clocked in from this shift
    const stillClockedIn = await Attendance.find({
      date: attendanceDate,
      clockIn: { $ne: null },
      clockOut: null
    }).populate('employee', 'firstName lastName employeeId');
    
    if (stillClockedIn.length > 0) {
      console.log(`🔄 Auto-clocking out ${stillClockedIn.length} employees who forgot to clock out`);
      console.log(`⚠️ These employees clocked in during the shift but never clocked out`);
      
      for (const record of stillClockedIn) {
        // Set clock-out to 6:30 AM today (end of current shift window)
        const autoClockOut = new Date(pktTime);
        autoClockOut.setHours(6, 30, 0, 0);
        
        record.clockOut = autoClockOut;
        record.notes = (record.notes || '') + ' [Auto-clocked out at 6:30 AM - shift end, forgot to clock out]';
        await record.save();
        
        console.log(`✅ Auto-clocked out: ${record.employee.firstName} ${record.employee.lastName} (${record.employee.employeeId})`);
        console.log(`   Clock In: ${record.clockIn.toLocaleString('en-US', {timeZone: 'Asia/Karachi'})}`);
        console.log(`   Clock Out: ${record.clockOut.toLocaleString('en-US', {timeZone: 'Asia/Karachi'})}`);
      }
    } else {
      console.log('✅ All employees properly clocked out - no auto clock-outs needed');
    }
    
    // Get all attendance records for the shift that just ended
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
    console.log(`   Shift Date: ${attendanceDate.toDateString()}`);
    console.log(`   Shift Period: 6:00 PM (yesterday) - 6:30 AM (today)`);
    console.log(`   Total: ${summary.total}`);
    console.log(`   Present: ${summary.present}`);
    console.log(`   Absent: ${summary.absent}`);
    console.log(`   Late: ${summary.late}`);
    console.log(`   Half-day: ${summary.halfDay}`);
    console.log(`   Auto-marked: ${summary.autoMarked}`);
    console.log('✅ Attendance finalization complete');
    
    return { success: true, summary, date: attendanceDate };
    
  } catch (error) {
    console.error('❌ Error in attendance finalization:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Schedule automated attendance jobs
 * - 6:00 PM PKT: Mark all employees absent (start of NEW shift) - NO AUTO-RESET HERE
 * - 6:30 AM PKT: Finalize attendance (end of CURRENT shift) + Auto clock-out (SAFE - shift has ended)
 * 
 * CRITICAL: Auto-reset only happens at 6:30 AM when the shift ENDS
 * This prevents employees from being auto-clocked out while still working
 */
export const scheduleAttendanceJobs = () => {
  // Schedule absence marking at 6:00 PM PKT daily
  // This creates NEW attendance records for the shift starting NOW
  // NO auto-reset here because the previous shift hasn't ended yet
  cron.schedule('0 18 * * *', async () => {
    console.log('⏰ Scheduled job triggered: Mark absences at shift start (6:00 PM PKT)');
    console.log('📝 Creating absence records for NEW shift starting now');
    console.log('⚠️ Previous shift is still ongoing (ends at 6:30 AM)');
    await markAbsentEmployees();
  }, {
    timezone: "Asia/Karachi"
  });
  
  // Schedule attendance finalization at 6:30 AM PKT daily
  // This finalizes the CURRENT shift that started yesterday at 6 PM
  // Auto clock-out is SAFE here because the shift has ended
  cron.schedule('30 6 * * *', async () => {
    console.log('⏰ Scheduled job triggered: Finalize attendance at shift end (6:30 AM PKT)');
    console.log('📝 Finalizing shift that started yesterday at 6:00 PM');
    console.log('✅ SAFE to auto clock-out - shift has ended');
    await finalizeAttendance();
  }, {
    timezone: "Asia/Karachi"
  });
  
  console.log('✅ Attendance scheduling initialized:');
  console.log('   - 6:00 PM PKT: Create absence records for NEW shift (no auto-reset)');
  console.log('   - 6:30 AM PKT: Finalize CURRENT shift + Auto clock-out (safe)');
  console.log('');
  console.log('🔒 Security: Auto clock-out only at 6:30 AM when shift ends');
  console.log('   This prevents employees from being clocked out during their shift');
};
