// Time-based access control middleware
// Allows access only between 6:15 PM to 5:15 AM Pakistan Standard Time

const timeAccessControl = (req, res, next) => {
  try {
    // Skip time restriction in production unless explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_TIME_RESTRICTION !== 'true') {
      return next();
    }
    
    // Get current time in Pakistan Standard Time (Asia/Karachi timezone)
    const now = new Date();
    const pktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
    
    const currentHour = pktTime.getHours();
    const currentMinute = pktTime.getMinutes();
    
    // Convert current time to minutes since midnight for easier comparison
    const currentTimeInMinutes = (currentHour * 60) + currentMinute;
    
    // Define access window
    const startTime = (18 * 60) + 15; // 6:15 PM = 18:15 = 1095 minutes
    const endTime = (5 * 60) + 15;    // 5:15 AM = 05:15 = 315 minutes
    
    // Check if current time is within allowed window
    // Since the window crosses midnight (6:15 PM to 5:15 AM), we need special logic
    let isWithinAccessWindow = false;
    
    if (startTime > endTime) {
      // Window crosses midnight (like 6:15 PM to 5:15 AM)
      isWithinAccessWindow = (currentTimeInMinutes >= startTime) || (currentTimeInMinutes <= endTime);
    } else {
      // Window is within same day
      isWithinAccessWindow = (currentTimeInMinutes >= startTime) && (currentTimeInMinutes <= endTime);
    }
    
    if (!isWithinAccessWindow) {
      // Format times for user-friendly message
      const currentTimeFormatted = pktTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Karachi'
      });
      
      return res.status(403).json({
        success: false,
        message: 'System access is restricted to 6:15 PM - 5:15 AM Pakistan Standard Time only',
        currentTime: currentTimeFormatted,
        accessWindow: '6:15 PM - 5:15 AM PKT',
        error: 'ACCESS_TIME_RESTRICTED'
      });
    }
    
    // Log successful access (optional)
    console.log(`✅ Time access granted at ${pktTime.toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}`);
    
    next();
  } catch (error) {
    console.error('Time access control error:', error);
    return res.status(500).json({
      success: false,
      message: 'Time validation error',
      error: error.message
    });
  }
};

// Helper function to check if current time is within access window (for client-side)
const isWithinAccessWindow = () => {
  const now = new Date();
  const pktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  
  const currentHour = pktTime.getHours();
  const currentMinute = pktTime.getMinutes();
  const currentTimeInMinutes = (currentHour * 60) + currentMinute;
  
  const startTime = (18 * 60) + 15; // 6:15 PM
  const endTime = (5 * 60) + 15;    // 5:15 AM
  
  if (startTime > endTime) {
    return (currentTimeInMinutes >= startTime) || (currentTimeInMinutes <= endTime);
  } else {
    return (currentTimeInMinutes >= startTime) && (currentTimeInMinutes <= endTime);
  }
};

// Get current PKT time
const getCurrentPKTTime = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
};

// Get next access window start time
const getNextAccessTime = () => {
  const now = new Date();
  const pktTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  
  // If currently within access window, return null
  if (isWithinAccessWindow()) {
    return null;
  }
  
  // Calculate next 6:15 PM
  const nextAccess = new Date(pktTime);
  nextAccess.setHours(18, 15, 0, 0);
  
  // If it's past 6:15 PM today but before 5:15 AM tomorrow, next access is today
  // If it's after 5:15 AM, next access is today at 6:15 PM
  // If it's before 5:15 AM, next access was yesterday at 6:15 PM (shouldn't happen if outside window)
  
  if (pktTime.getHours() >= 6) {
    // It's after 5:15 AM, so next access is today at 6:15 PM
    if (pktTime.getHours() < 18 || (pktTime.getHours() === 18 && pktTime.getMinutes() < 15)) {
      // Before 6:15 PM today
      return nextAccess;
    }
  }
  
  // Add one day for next access
  nextAccess.setDate(nextAccess.getDate() + 1);
  return nextAccess;
};

export { 
  timeAccessControl, 
  isWithinAccessWindow, 
  getCurrentPKTTime, 
  getNextAccessTime 
};