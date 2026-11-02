// Attendance-specific time access control (Pakistan Standard Time).
// Night shift: 5:30 PM to 6:30 AM. Clock-in closes at 6:00 AM so nobody clocks in
// moments before the 6:30 AM auto clock-out; clock-out stays open until 6:30 AM.

export const SHIFT_START_MINUTES = 17 * 60 + 30; // 5:30 PM
export const CLOCK_IN_END_MINUTES = 6 * 60;      // 6:00 AM
export const SHIFT_END_MINUTES = 6 * 60 + 30;    // 6:30 AM
export const LATE_AFTER_HOUR = 19;               // clock-ins from 7:00 PM are late

export const SHIFT_WINDOW_LABEL = '5:30 PM - 6:30 AM PKT';
export const CLOCK_IN_WINDOW_LABEL = '5:30 PM - 6:00 AM PKT';

const pktMinutesOf = (date = new Date()) => {
  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const hour = Number(timeParts.find((part) => part.type === 'hour')?.value);
  const minute = Number(timeParts.find((part) => part.type === 'minute')?.value);
  return hour * 60 + minute;
};

// Shift window used for clock-out: 5:30 PM to 6:30 AM (crosses midnight)
const isWithinAttendanceWindow = (date = new Date()) => {
  try {
    const minutes = pktMinutesOf(date);
    return minutes >= SHIFT_START_MINUTES || minutes <= SHIFT_END_MINUTES;
  } catch (error) {
    console.error('Error checking attendance window:', error);
    return false;
  }
};

const attendanceTimeAccessControl = (req, res, next) => {
  try {
    // Skip time restriction in development mode unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_ATTENDANCE_TIME_RESTRICTION !== 'true') {
      console.log('⚠️ Attendance time restriction bypassed in development mode');
      return next();
    }

    if (!isWithinAttendanceWindow()) {
      const pktTime = getCurrentPKTTime();
      const currentTimeFormatted = pktTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Karachi'
      });

      const nextAvailableTime = getNextAttendanceAccessTime();
      const nextTimeFormatted = nextAvailableTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Karachi'
      });
      const nextDateFormatted = nextAvailableTime.toLocaleDateString('en-US', {
        timeZone: 'Asia/Karachi',
        month: 'short',
        day: 'numeric'
      });

      return res.status(403).json({
        success: false,
        message: `Clock out is only allowed between ${SHIFT_WINDOW_LABEL}`,
        currentTime: currentTimeFormatted,
        allowedWindow: SHIFT_WINDOW_LABEL,
        nextAvailableTime: `${nextTimeFormatted} on ${nextDateFormatted}`,
        error: 'ATTENDANCE_TIME_RESTRICTED'
      });
    }

    next();
  } catch (error) {
    console.error('Attendance time access control error:', error);
    return res.status(500).json({
      success: false,
      message: 'Attendance time validation error',
      error: error.message
    });
  }
};

// Clock-in: 5:30 PM to 6:00 AM
const isWithinClockInWindow = (date = new Date()) => {
  const minutes = pktMinutesOf(date);
  return minutes >= SHIFT_START_MINUTES || minutes < CLOCK_IN_END_MINUTES;
};

// Late: clocked in at or after 7:00 PM (or after midnight)
const isLateClockIn = (date = new Date()) => {
  const hour = Math.floor(pktMinutesOf(date) / 60);
  return hour >= LATE_AFTER_HOUR || hour < 6;
};

// Get current PKT time
const getCurrentPKTTime = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
};

// Get next attendance access window start time (5:30 PM)
const getNextAttendanceAccessTime = () => {
  const pktTime = getCurrentPKTTime();

  // If currently within access window, return current time
  if (isWithinAttendanceWindow()) {
    return pktTime;
  }

  // Outside the window it's between 6:31 AM and 5:29 PM, so the next start is today at 5:30 PM
  const nextAccess = new Date(pktTime);
  nextAccess.setHours(Math.floor(SHIFT_START_MINUTES / 60), SHIFT_START_MINUTES % 60, 0, 0);
  return nextAccess;
};

// Get time remaining until next attendance window
const getTimeUntilNextAttendanceWindow = () => {
  if (isWithinAttendanceWindow()) {
    return { inWindow: true, message: 'Currently in attendance window' };
  }

  const nextAccessTime = getNextAttendanceAccessTime();
  const now = getCurrentPKTTime();
  const diffMs = nextAccessTime.getTime() - now.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    inWindow: false,
    hours,
    minutes,
    nextAccessTime,
    message: `Next attendance window opens in ${hours}h ${minutes}m`
  };
};

// Format time for display
const formatPKTTime = (date = new Date()) => {
  const pktTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  return pktTime.toLocaleString('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// Attendance record date for a moment on the night shift: times after midnight (up to
// 6:30 AM) belong to the previous day's shift. Returns null outside the shift.
const getShiftAttendanceDate = (pktTime = getCurrentPKTTime()) => {
  const minutes = pktTime.getHours() * 60 + pktTime.getMinutes();
  if (minutes > SHIFT_END_MINUTES && minutes < SHIFT_START_MINUTES) return null;
  const dayOffset = minutes <= SHIFT_END_MINUTES ? -1 : 0;
  return new Date(Date.UTC(
    pktTime.getUTCFullYear(),
    pktTime.getUTCMonth(),
    pktTime.getUTCDate() + dayOffset,
    0, 0, 0, 0
  ));
};

export {
  attendanceTimeAccessControl,
  isWithinClockInWindow,
  isLateClockIn,
  isWithinAttendanceWindow,
  getCurrentPKTTime,
  getNextAttendanceAccessTime,
  getTimeUntilNextAttendanceWindow,
  getShiftAttendanceDate,
  formatPKTTime
};
