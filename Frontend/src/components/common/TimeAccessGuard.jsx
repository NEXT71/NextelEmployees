import React, { useState, useEffect } from 'react';
import { isWithinAccessWindow } from '../../utils/timeAccess';
import TimeAccessControl from './TimeAccessControl';

const TimeAccessGuard = ({ children }) => {
  const [isAccessible, setIsAccessible] = useState(isWithinAccessWindow());

  useEffect(() => {
    const checkAccess = () => {
      setIsAccessible(isWithinAccessWindow());
    };

    // Check access immediately
    checkAccess();

    // Check every minute
    const interval = setInterval(checkAccess, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!isAccessible) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <img 
                src="/nextelbpologo.jpg" 
                alt="Nextel BPO" 
                className="w-10 h-10 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Nextel Employees</h1>
            <p className="text-red-200">Employee Management System</p>
          </div>
          
          <TimeAccessControl showFullInfo={true} />
          
          <div className="mt-6 text-center">
            <p className="text-red-200 text-sm">
              Please return during the access window to use the system.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default TimeAccessGuard;