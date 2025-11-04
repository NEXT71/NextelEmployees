import React from 'react';
import { Inbox, Users, AlertTriangle, FileText, Search, Package } from 'lucide-react';

const EmptyState = ({ 
  type = 'default', 
  title, 
  description, 
  action,
  actionLabel,
  className = '' 
}) => {
  const icons = {
    default: Inbox,
    employees: Users,
    fines: AlertTriangle,
    reports: FileText,
    search: Search,
    data: Package
  };

  const Icon = icons[type] || icons.default;

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="relative mb-6">
        {/* Animated circles */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-blue-500/10 animate-pulse" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-blue-500/20 animate-pulse delay-75" />
        </div>
        
        {/* Icon */}
        <div className="relative z-10 w-20 h-20 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full backdrop-blur-sm border border-white/10">
          <Icon className="w-10 h-10 text-blue-300" />
        </div>
      </div>

      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 text-center">
        {title || 'No data found'}
      </h3>
      
      {description && (
        <p className="text-sm sm:text-base text-blue-200/70 text-center max-w-md mb-6">
          {description}
        </p>
      )}

      {action && actionLabel && (
        <button
          onClick={action}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-blue-500/20 hover-scale ripple"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
