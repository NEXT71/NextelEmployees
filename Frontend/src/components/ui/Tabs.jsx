// Tabs = page-level views with an underline; Segmented = compact filter switch.
// items: [{ key, label, icon, count }]
export const Tabs = ({ items, value, onChange, className = '' }) => (
  <div role="tablist" className={`flex gap-6 border-b border-line overflow-x-auto ${className}`}>
    {items.map((item) => {
      const Icon = item.icon;
      const selected = item.key === value;
      return (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => onChange(item.key)}
          className={`-mb-px flex items-center gap-2 h-11 border-b-2 text-sm font-medium whitespace-nowrap
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift rounded-t
            ${selected ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}
        >
          {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
          {item.label}
          {item.count > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-late-soft text-late text-xs inline-flex items-center justify-center tabular-nums">
              {item.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export const Segmented = ({ items, value, onChange, label }) => (
  <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-0.5 p-0.5 rounded-lg bg-paper border border-line">
    {items.map((item) => {
      const selected = item.key === value;
      return (
        <button
          key={item.key}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(item.key)}
          className={`h-8 px-3 rounded-md text-sm font-medium whitespace-nowrap
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift
            ${selected ? 'bg-surface text-ink border border-line' : 'text-muted hover:text-ink border border-transparent'}`}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);
