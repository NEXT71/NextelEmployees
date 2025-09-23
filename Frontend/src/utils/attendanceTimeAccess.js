// Attendance-specific time access utilities for frontend
// Mirrors the backend logic for Pakistan Standard Time attendance access control (6:00 PM to 5:30 AM)

// Check if current time is within attendance access window (6:00 PM to 5:30 AM PKT)
export const isWithinAttendanceWindow = () => {
  try {
    // Get current time in Pakistan Standard Time (UTC+5)
    const now = new Date();
    const pktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
    
    const currentHour = pktTime.getHours();
    const currentMinute = pktTime.getMinutes();
    
    // 6:00 PM to 5:30 AM (18:00 to 05:30)
    const startHour = 18; // 6 PM
    const startMinute = 0;
    const endHour = 5; // 5 AM
    const endMinute = 30; // 30 minutes past 5 AM
    
    // Check if current time is within the allowed window
    let isWithinWindow = false;
    
    if (currentHour >= startHour) {
      // After 6 PM today
      isWithinWindow = true;
    } else if (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute)) {
      // Before 5:30 AM next day
      isWithinWindow = true;
    }
    
    return isWithinWindow;
  } catch (error) {
    console.error('Error checking attendance window:', error);
    return false;
  }
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
  
  // Set to next 6:00 PM
  nextAccess.setHours(18, 0, 0, 0);
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = (currentHour * 60) + currentMinute;
  
  // If it's currently outside 6:00 PM - 5:30 AM window, next access is today at 6:00 PM or tomorrow
  if (currentTimeInMinutes < (18 * 60) && currentTimeInMinutes > (5 * 60 + 30)) {
    // Between 5:31 AM and 5:59 PM today, next access is today at 6:00 PM
    return nextAccess;
  } else {
    // After 6:00 PM today or before 5:30 AM, next access is tomorrow at 6:00 PM
    if (currentTimeInMinutes >= (18 * 60)) {
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
    accessWindow: '6:00 PM - 5:30 AM PKT',
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
      message: `${action} is only allowed between 6:00 PM - 5:30 AM Pakistan Standard Time`,
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
  
  const endTime = (5 * 60) + 30; // 5:30 AM = 330 minutes
  const warningTime = endTime - minutesBeforeEnd;
  
  // If we're in the early morning hours (0-5:30), check if we're close to 5:30 AM
  if (currentHour >= 0 && currentHour <= 5) {
    return currentTimeInMinutes >= warningTime && currentTimeInMinutes <= endTime;
  }
  
  return false;
};

// Get warning message if approaching end of window
export const getAttendanceWindowWarning = (minutesBeforeEnd = 30) => {
  if (!isApproachingAttendanceWindowEnd(minutesBeforeEnd)) return null;
  
  const now = getCurrentPKTTime();
  const endTime = new Date(now);
  endTime.setHours(5, 30, 0, 0);
  
  // If it's past midnight, the end time is today at 5:30 AM
  if (now.getHours() >= 0 && now.getHours() <= 5) {
    // We're already in the correct day
  } else {
    // We're in the previous day, so end time should be tomorrow
    endTime.setDate(endTime.getDate() + 1);
  }
  
  const timeUntilEnd = Math.floor((endTime - now) / (1000 * 60)); // minutes
  
  return {
    warning: true,
    message: `Attendance window closes in ${timeUntilEnd} minutes at 5:30 AM`,
    timeRemaining: timeUntilEnd,
    endTime: formatPKTTime(endTime)
  };
};