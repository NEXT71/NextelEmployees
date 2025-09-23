import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { attendanceAPI } from '../../utils/api';
import { 
  isWithinAttendanceWindow, 
  getAttendanceWindowInfo, 
  getAttendanceAccessCountdown 
} from '../../utils/attendanceTimeAccess';

const AttendanceTimeStatus = ({ className = '', compact = false }) => {
  const [timeWindowData, setTimeWindowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch time window data from backend
  const fetchTimeWindowData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await attendanceAPI.getAttendanceTimeWindow();
      
      if (response?.success) {
        setTimeWindowData(response.data);
      } else {
        throw new Error('Failed to fetch time window data');
      }
    } catch (err) {
      console.error('Error fetching time window data:', err);
      setError(err.message || 'Failed to check attendance time window');
      
      // Fallback to client-side calculation
      const fallbackData = getAttendanceWindowInfo();
      setTimeWindowData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch data on mount and refresh every minute
  useEffect(() => {
    fetchTimeWindowData();
    
    const refreshTimer = setInterval(() => {
      fetchTimeWindowData();
    }, 60000); // Refresh every minute

    return () => clearInterval(refreshTimer);
  }, []);

  // Get real-time countdown
  const getCountdown = () => {
    const countdown = getAttendanceAccessCountdown();
    if (!countdown) return null;
    
    return {
      hours: countdown.hours,
      minutes: countdown.minutes,
      seconds: countdown.seconds
    };
  };

  const countdown = getCountdown();
  const isWithinWindow = timeWindowData?.isWithinAttendanceWindow ?? isWithinAttendanceWindow();

  if (loading) {
    return (
      <div className={`backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-blue-200">Checking attendance window...</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {isWithinWindow ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-400" />
        )}
        <span className={`text-sm font-medium ${isWithinWindow ? 'text-green-300' : 'text-red-300'}`}>
          {isWithinWindow ? 'Attendance Available' : 'Attendance Restricted'}
        </span>
      </div>
    );
  }

  return (
    <div className={`backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl overflow-hidden ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isWithinWindow ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {isWithinWindow ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Attendance Status
              </h3>
              <p className="text-sm text-blue-200/80">
                Clock in/out availability
              </p>
            </div>
          </div>
          
          <button
            onClick={fetchTimeWindowData}
            disabled={loading}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 text-blue-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Current Status */}
          <div className={`p-4 rounded-lg border ${
            isWithinWindow 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${isWithinWindow ? 'text-green-300' : 'text-red-300'}`}>
                  {isWithinWindow ? '✅ Clock In/Out Available' : '❌ Clock In/Out Restricted'}
                </p>
                <p className="text-sm text-blue-200/80 mt-1">
                  {timeWindowData?.message || (isWithinWindow ? 
                    'You can clock in or clock out now' : 
                    'Clock in/out is not allowed at this time'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Time Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-blue-300" />
                <span className="text-sm font-medium text-blue-200">Current Time</span>
              </div>
              <p className="text-lg font-mono text-white">
                {currentTime.toLocaleString('en-US', {
                  timeZone: 'Asia/Karachi',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                })}
              </p>
              <p className="text-xs text-blue-200/60 mt-1">
                {currentTime.toLocaleDateString('en-US', {
                  timeZone: 'Asia/Karachi',
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })} PKT
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-4 h-4 text-blue-300" />
                <span className="text-sm font-medium text-blue-200">Allowed Window</span>
              </div>
              <p className="text-lg font-semibold text-white">
                6:00 PM - 5:30 AM
              </p>
              <p className="text-xs text-blue-200/60 mt-1">
                Pakistan Standard Time
              </p>
            </div>
          </div>

          {/* Countdown Timer (only show when outside window) */}
          {!isWithinWindow && countdown && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-orange-300" />
                <span className="text-sm font-medium text-orange-200">Next Available Time</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-mono font-bold text-orange-100">
                  {String(countdown.hours).padStart(2, '0')}:
                  {String(countdown.minutes).padStart(2, '0')}:
                  {String(countdown.seconds).padStart(2, '0')}
                </div>
                <div className="text-sm text-orange-200/80">
                  <p>Time remaining until</p>
                  <p>attendance window opens</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-300">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceTimeStatus;