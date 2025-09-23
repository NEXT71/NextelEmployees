// Attendance-specific time access control middleware
// Allows clock in/clock out only between 6:00 PM to 5:30 AM Pakistan Standard Time

const attendanceTimeAccessControl = (req, res, next) => {
  try {
    // Skip time restriction in development mode unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_ATTENDANCE_TIME_RESTRICTION !== 'true') {
      console.log('⚠️ Attendance time restriction bypassed in development mode');
      return next();
    }
    
    // Get current time in Pakistan Standard Time (Asia/Karachi timezone)
    const now = new Date();
    const pktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
    
    const currentHour = pktTime.getHours();
    const currentMinute = pktTime.getMinutes();
    
    // Convert current time to minutes since midnight for easier comparison
    const currentTimeInMinutes = (currentHour * 60) + currentMinute;
    
    // Define attendance access window: 6:00 PM to 5:30 AM
    const startTime = (18 * 60); // 6:00 PM = 18:00 = 1080 minutes
    const endTime = (5 * 60) + 30; // 5:30 AM = 05:30 = 330 minutes
    
    // Check if current time is within allowed window
    // Since the window crosses midnight (6:00 PM to 5:30 AM), we need special logic
    let isWithinAttendanceWindow = false;
    
    if (startTime > endTime) {
      // Window crosses midnight (like 6:00 PM to 5:30 AM)
      isWithinAttendanceWindow = (currentTimeInMinutes >= startTime) || (currentTimeInMinutes <= endTime);
    } else {
      // Window is within same day
      isWithinAttendanceWindow = (currentTimeInMinutes >= startTime) && (currentTimeInMinutes <= endTime);
    }
    
    if (!isWithinAttendanceWindow) {
      // Format current time for user-friendly message
      const currentTimeFormatted = pktTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Karachi'
      });
      
      // Calculate next available time
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
        message: 'Clock in/Clock out is only allowed between 6:00 PM - 5:30 AM Pakistan Standard Time',
        currentTime: currentTimeFormatted,
        allowedWindow: '6:00 PM - 5:30 AM PKT',
        nextAvailableTime: `${nextTimeFormatted} on ${nextDateFormatted}`,
        error: 'ATTENDANCE_TIME_RESTRICTED'
      });
    }
    
    // Log successful access
    console.log(`✅ Attendance time access granted at ${pktTime.toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}`);
    
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

// Helper function to check if current time is within attendance access window
const isWithinAttendanceWindow = () => {
  try {
    const now = new Date();
    const pktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
    
    const currentHour = pktTime.getHours();
    const currentMinute = pktTime.getMinutes();
    const currentTimeInMinutes = (currentHour * 60) + currentMinute;
    
    const startTime = (18 * 60); // 6:00 PM
    const endTime = (5 * 60) + 30; // 5:30 AM
    
    if (startTime > endTime) {
      return (currentTimeInMinutes >= startTime) || (currentTimeInMinutes <= endTime);
    } else {
      return (currentTimeInMinutes >= startTime) && (currentTimeInMinutes <= endTime);
    }
  } catch (error) {
    console.error('Error checking attendance window:', error);
    return false;
  }
};

// Get current PKT time
const getCurrentPKTTime = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
};

// Get next attendance access window start time
const getNextAttendanceAccessTime = () => {
  const now = new Date();
  const pktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  
  // If currently within access window, return current time
  if (isWithinAttendanceWindow()) {
    return pktTime;
  }
  
  // Calculate next 6:00 PM
  const nextAccess = new Date(pktTime);
  nextAccess.setHours(18, 0, 0, 0);
  
  const currentHour = pktTime.getHours();
  const currentMinute = pktTime.getMinutes();
  const currentTimeInMinutes = (currentHour * 60) + currentMinute;
  
  // If it's currently between 5:31 AM and 5:59 PM, next access is today at 6:00 PM
  if (currentTimeInMinutes > (5 * 60 + 30) && currentTimeInMinutes < (18 * 60)) {
    return nextAccess;
  }
  
  // If we're past 6:00 PM today or before 5:30 AM, calculate next window
  if (currentTimeInMinutes >= (18 * 60)) {
    // After 6:00 PM today, next access is tomorrow at 6:00 PM
    nextAccess.setDate(nextAccess.getDate() + 1);
  }
  
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

export { 
  attendanceTimeAccessControl,
  isWithinAttendanceWindow,
  getCurrentPKTTime,
  getNextAttendanceAccessTime,
  getTimeUntilNextAttendanceWindow,
  formatPKTTime
};