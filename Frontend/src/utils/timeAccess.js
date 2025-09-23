// Time-based access utilities for frontend
// Mirrors the backend logic for Pakistan Standard Time access control

// Check if current time is within access window (6:15 PM to 5:15 AM PKT)
export const isWithinAccessWindow = () => {
  // Get current time in Pakistan Standard Time (UTC+5)
  const now = new Date();
  const pktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  
  const currentHour = pktTime.getHours();
  const currentMinute = pktTime.getMinutes();
  const currentTimeInMinutes = (currentHour * 60) + currentMinute;
  
  const startTime = (18 * 60) + 15; // 6:15 PM = 1095 minutes
  const endTime = (5 * 60) + 15;    // 5:15 AM = 315 minutes
  
  // Since window crosses midnight (6:15 PM to 5:15 AM)
  return (currentTimeInMinutes >= startTime) || (currentTimeInMinutes <= endTime);
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

// Get time until next access window
export const getTimeUntilNextAccess = () => {
  if (isWithinAccessWindow()) {
    return null; // Already within access window
  }
  
  const now = getCurrentPKTTime();
  const nextAccess = new Date(now);
  
  // Set to next 6:15 PM
  nextAccess.setHours(18, 15, 0, 0);
  
  // If it's already past 6:15 PM today and before 5:15 AM tomorrow,
  // we shouldn't be here (should be within access window)
  // If it's after 5:15 AM, next access is today at 6:15 PM
  if (now.getHours() >= 6) {
    // After 5:15 AM, so next access is today at 6:15 PM
    if (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() < 15)) {
      // Before 6:15 PM today
      return nextAccess;
    }
  }
  
  // Add one day for next access
  nextAccess.setDate(nextAccess.getDate() + 1);
  return nextAccess;
};

// Get formatted countdown to next access
export const getAccessCountdown = () => {
  const nextAccess = getTimeUntilNextAccess();
  if (!nextAccess) return null;
  
  const now = getCurrentPKTTime();
  const diff = nextAccess - now;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds, nextAccess };
};

// Get access window information
export const getAccessWindowInfo = () => {
  const isWithin = isWithinAccessWindow();
  const currentTime = formatPKTTime();
  
  return {
    isAccessible: isWithin,
    currentTime,
    accessWindow: '6:15 PM - 5:15 AM PKT',
    message: isWithin 
      ? 'System access is currently available'
      : 'System access is currently restricted'
  };
};