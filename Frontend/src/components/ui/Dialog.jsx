import { useEffect } from 'react';
import { X } from 'lucide-react';

// Centered dialog. Closes on Escape and on backdrop click.
const Dialog = ({ open, onClose, title, description, children, footer, size = 'max-w-2xl' }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className={`relative w-full ${size} bg-surface rounded-xl shadow-float flex flex-col max-h-[90vh] max-h-[90dvh]`}>
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-line">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 -mr-1.5 rounded-lg text-muted hover:text-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-line flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 [&>*]:w-full sm:[&>*]:w-auto">{footer}</div>}
      </div>
    </div>
  );
};

export default Dialog;
