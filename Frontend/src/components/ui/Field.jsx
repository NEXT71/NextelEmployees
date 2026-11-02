// Form controls sharing one look: 40px tall, line border, cobalt focus ring.
const control = `w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70
  focus:outline-none focus:border-shift focus:ring-2 focus:ring-shift/20 disabled:bg-paper disabled:text-muted`;

export const Field = ({ label, hint, htmlFor, children, className = '' }) => (
  <div className={className}>
    {label && (
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink mb-1.5">
        {label}
      </label>
    )}
    {children}
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
  </div>
);

export const Input = ({ className = '', ...props }) => <input className={`${control} h-10 ${className}`} {...props} />;

export const Select = ({ className = '', children, ...props }) => (
  <select className={`${control} h-10 pr-8 ${className}`} {...props}>
    {children}
  </select>
);

export const Textarea = ({ className = '', ...props }) => <textarea className={`${control} py-2.5 ${className}`} {...props} />;
