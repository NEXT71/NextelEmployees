import { X } from 'lucide-react';

const tones = {
  error: 'border-absent/30 bg-absent-soft text-absent',
  success: 'border-present/30 bg-present-soft text-present',
  warning: 'border-late/30 bg-late-soft text-late',
};

// Inline message banner, optionally dismissible
const Alert = ({ tone = 'error', onDismiss, className = '', children }) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${tones[tone]} ${className}`}
  >
    <span>{children}</span>
    {onDismiss && (
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 hover:text-ink">
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

export default Alert;
