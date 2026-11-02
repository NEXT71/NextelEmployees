import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const types = {
  success: { icon: CheckCircle, edge: 'border-l-present', icon_: 'text-present' },
  error: { icon: AlertCircle, edge: 'border-l-absent', icon_: 'text-absent' },
  warning: { icon: AlertTriangle, edge: 'border-l-late', icon_: 'text-late' },
  info: { icon: Info, edge: 'border-l-shift', icon_: 'text-shift' },
};

const Toast = ({ message, type = 'info', duration = 4000, onClose }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = types[type] || types.info;
  const Icon = config.icon;

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`bg-surface border border-line border-l-4 ${config.edge} rounded-lg shadow-float p-4 pr-10 min-w-[300px] max-w-md animate-toast-in relative`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.icon_} flex-shrink-0`} aria-hidden="true" />
        <p className="text-sm text-ink flex-1 leading-relaxed">{message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="absolute top-3 right-3 p-1 rounded text-muted hover:text-ink"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
