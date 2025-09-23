import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Timer } from 'lucide-react';
import { 
  isWithinAccessWindow, 
  getAccessWindowInfo, 
  getAccessCountdown 
} from '../../utils/timeAccess';

const TimeAccessControl = ({ showFullInfo = false }) => {
  const [accessInfo, setAccessInfo] = useState(getAccessWindowInfo());
  const [countdown, setCountdown] = useState(getAccessCountdown());

  useEffect(() => {
    const updateTimeInfo = () => {
      setAccessInfo(getAccessWindowInfo());
      setCountdown(getAccessCountdown());
    };

    // Update every second
    const interval = setInterval(updateTimeInfo, 1000);

    return () => clearInterval(interval);
  }, []);

  if (accessInfo.isAccessible && !showFullInfo) {
    // If access is allowed and we don't need to show full info, show minimal indicator
    return (
      <div className="flex items-center space-x-2 text-green-400 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>System Available</span>
      </div>
    );
  }

  if (!accessInfo.isAccessible) {
    // Access is restricted - show restriction message
    return (
      <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-300">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-red-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-200 mb-2">System Access Restricted</h3>
            <p className="text-sm mb-3">
              The Nextel Employee Management System is only accessible during night hours:
            </p>
            <div className="bg-red-900/30 border border-red-500/20 rounded-md p-3 mb-3">
              <p className="font-medium text-red-100">Access Window: 6:15 PM - 5:15 AM PKT</p>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Current Time: {accessInfo.currentTime}</span>
              </div>
              
              {countdown && (
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4" />
                  <span>
                    Next Access: {countdown.nextAccess.toLocaleString('en-US', {
                      timeZone: 'Asia/Karachi',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              )}
              
              {countdown && (
                <div className="bg-red-900/20 border border-red-500/20 rounded-md p-2 mt-3">
                  <div className="text-center">
                    <p className="text-xs text-red-200 mb-1">Time until next access:</p>
                    <p className="font-mono text-lg font-bold text-red-100">
                      {countdown.hours.toString().padStart(2, '0')}:
                      {countdown.minutes.toString().padStart(2, '0')}:
                      {countdown.seconds.toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Access is allowed and we want to show full info
  return (
    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-green-300">
      <div className="flex items-start space-x-3">
        <CheckCircle className="w-6 h-6 text-green-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-green-200 mb-2">System Access Available</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Current Time: {accessInfo.currentTime}</span>
            </div>
            <div className="bg-green-900/30 border border-green-500/20 rounded-md p-2">
              <p className="text-green-100">Access Window: 6:15 PM - 5:15 AM PKT</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeAccessControl;