import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const Toast = ({ message, type = 'info', duration = 4000, onClose }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const types = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-500/90',
      borderColor: 'border-green-400',
      iconColor: 'text-green-100'
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-500/90',
      borderColor: 'border-red-400',
      iconColor: 'text-red-100'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-orange-500/90',
      borderColor: 'border-orange-400',
      iconColor: 'text-orange-100'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-500/90',
      borderColor: 'border-blue-400',
      iconColor: 'text-blue-100'
    }
  };

  const config = types[type] || types.info;
  const Icon = config.icon;

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} backdrop-blur-md border-l-4 rounded-lg shadow-2xl p-4 pr-12 min-w-[320px] max-w-md animate-toast-in relative overflow-hidden`}
    >
      {/* Animated progress bar */}
      <div 
        className="absolute bottom-0 left-0 h-1 bg-white/30 animate-toast-progress"
        style={{ animationDuration: `${duration}ms` }}
      />
      
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <p className="text-white text-sm font-medium flex-1 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
