// Button — primary (ink), secondary (outlined), danger, ghost.
// Note: white text uses `text-surface`, not `text-white`, because the legacy
// overrides in index.css repaint any class containing "text-white".
const variants = {
  primary: 'bg-ink text-surface hover:bg-ink-soft disabled:bg-line disabled:text-muted',
  secondary: 'bg-surface text-ink border border-line hover:border-muted disabled:text-muted',
  danger: 'bg-absent text-surface hover:opacity-90 disabled:bg-line disabled:text-muted',
  ghost: 'text-muted hover:text-ink hover:bg-paper disabled:opacity-50',
};

const sizes = {
  md: 'h-10 px-4 text-sm gap-2',
  sm: 'h-8 px-3 text-sm gap-1.5',
  icon: 'h-8 w-8 justify-center',
};

const Button = ({ variant = 'primary', size = 'md', icon: Icon, className = '', children, ...props }) => (
  <button
    type="button"
    className={`inline-flex items-center rounded-lg font-medium whitespace-nowrap
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift focus-visible:ring-offset-2
      disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    {...props}
  >
    {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
    {children}
  </button>
);

export default Button;
