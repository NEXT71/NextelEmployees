// Attendance-specific time access utilities for frontend
// Mirrors the backend rules (Backend/middlewares/attendanceTimeAccess.js), Pakistan Standard Time:
// night shift 5:30 PM to 6:30 AM; clock-in closes at 6:00 AM; clock-out allowed until 6:30 AM.

export const SHIFT_START_MINUTES = 17 * 60 + 30; // 5:30 PM
export const CLOCK_IN_END_MINUTES = 6 * 60;      // 6:00 AM
export const SHIFT_END_MINUTES = 6 * 60 + 30;    // 6:30 AM
export const SHIFT_WINDOW_LABEL = '5:30 PM - 6:30 AM PKT';
export const CLOCK_IN_WINDOW_LABEL = '5:30 PM - 6:00 AM PKT';

const pktMinutesNow = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return hour * 60 + minute;
};

// Clock-out window: 5:30 PM to 6:30 AM PKT
export const isWithinAttendanceWindow = () => {
  try {
    const minutes = pktMinutesNow();
    return minutes >= SHIFT_START_MINUTES || minutes <= SHIFT_END_MINUTES;
  } catch (error) {
    console.error('Error checking attendance window:', error);
    return false;
  }
};

// Clock-in window: 5:30 PM to 6:00 AM PKT
export const isWithinClockInWindow = () => {
  const minutes = pktMinutesNow();
  return minutes >= SHIFT_START_MINUTES || minutes < CLOCK_IN_END_MINUTES;
};

// Get current Pakistan Standard Time
export const getCurrentPKTTime = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
};

// Format PKT time for display
export const formatPKTTime = (date = getCurrentPKTTime()) => {
  return date.toLocaleString('en-US', {
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

// Get time until next attendance access window
export const getTimeUntilNextAttendanceAccess = () => {
  if (isWithinAttendanceWindow()) {
    return null; // Already within attendance access window
  }
  
  const now = getCurrentPKTTime();
  const nextAccess = new Date(now);
  
  // Set to next shift start (5:30 PM)
  nextAccess.setHours(Math.floor(SHIFT_START_MINUTES / 60), SHIFT_START_MINUTES % 60, 0, 0);
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = (currentHour * 60) + currentMinute;
  
  // Outside the shift window, next access is today at 5:30 PM or tomorrow
  if (currentTimeInMinutes < SHIFT_START_MINUTES && currentTimeInMinutes > SHIFT_END_MINUTES) {
    // Between 6:31 AM and 5:29 PM today, next access is today at 5:30 PM
    return nextAccess;
  } else {
    // After 5:30 PM today, next access is tomorrow at 5:30 PM
    if (currentTimeInMinutes >= SHIFT_START_MINUTES) {
      nextAccess.setDate(nextAccess.getDate() + 1);
    }
    return nextAccess;
  }
};

// Get formatted countdown to next attendance access
export const getAttendanceAccessCountdown = () => {
  const nextAccess = getTimeUntilNextAttendanceAccess();
  if (!nextAccess) return null;
  
  const now = getCurrentPKTTime();
  const diff = nextAccess - now;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds, nextAccess };
};

// Get attendance access window information
export const getAttendanceWindowInfo = () => {
  const isWithin = isWithinAttendanceWindow();
  const currentTime = formatPKTTime();
  const countdown = getAttendanceAccessCountdown();
  
  return {
    isAccessible: isWithin,
    currentTime,
    accessWindow: SHIFT_WINDOW_LABEL,
    message: isWithin 
      ? 'Clock in/Clock out is currently available'
      : 'Clock in/Clock out is currently restricted',
    countdown: countdown ? {
      timeRemaining: `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`,
      nextAccessTime: formatPKTTime(countdown.nextAccess)
    } : null
  };
};

// Validate attendance action before attempting
export const validateAttendanceAction = (action = 'Clock in/Clock out') => {
  const isAllowed = isWithinAttendanceWindow();
  const windowInfo = getAttendanceWindowInfo();
  
  if (!isAllowed) {
    return {
      success: false,
      message: `${action} is only allowed between ${SHIFT_WINDOW_LABEL}`,
      ...windowInfo
    };
  }
  
  return {
    success: true,
    message: `${action} is allowed`,
    ...windowInfo
  };
};

// Create a real-time clock component data
export const createAttendanceTimeDisplay = () => {
  const windowInfo = getAttendanceWindowInfo();
  
  return {
    ...windowInfo,
    statusColor: windowInfo.isAccessible ? 'green' : 'red',
    statusIcon: windowInfo.isAccessible ? '✅' : '❌',
    displayText: windowInfo.isAccessible 
      ? 'Attendance Available' 
      : 'Attendance Restricted'
  };
};

// Helper to check if we're approaching the end of attendance window
export const isApproachingAttendanceWindowEnd = (minutesBeforeEnd = 30) => {
  if (!isWithinAttendanceWindow()) return false;
  
  const now = getCurrentPKTTime();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = (currentHour * 60) + currentMinute;
  
  const endTime = SHIFT_END_MINUTES; // 6:30 AM
  const warningTime = endTime - minutesBeforeEnd;
  
  // If we're in the early morning hours (0-6:30), check if we're close to 6:30 AM
  if (currentHour >= 0 && currentHour <= 6) {
    return currentTimeInMinutes >= warningTime && currentTimeInMinutes <= endTime;
  }
  
  return false;
};

// Get warning message if approaching end of window
export const getAttendanceWindowWarning = (minutesBeforeEnd = 30) => {
  if (!isApproachingAttendanceWindowEnd(minutesBeforeEnd)) return null;
  
  const now = getCurrentPKTTime();
  const endTime = new Date(now);
  endTime.setHours(6, 30, 0, 0);
  
  // If it's past midnight, the end time is today at 6:30 AM
  if (now.getHours() >= 0 && now.getHours() <= 6) {
    // We're already in the correct day
  } else {
    // We're in the previous day, so end time should be tomorrow
    endTime.setDate(endTime.getDate() + 1);
  }
  
  const timeUntilEnd = Math.floor((endTime - now) / (1000 * 60)); // minutes
  
  return {
    warning: true,
    message: `Attendance window closes in ${timeUntilEnd} minutes at 6:30 AM`,
    timeRemaining: timeUntilEnd,
    endTime: formatPKTTime(endTime)
  };
};