// Section = titled block on the page; Panel = white bordered surface.
export const Section = ({ title, actions, className = '', children }) => (
  <section className={`min-w-0 ${className}`}>
    {(title || actions) && (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        {title && <h2 className="text-xl font-semibold text-ink">{title}</h2>}
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

const Panel = ({ className = '', children }) => (
  <div className={`bg-surface border border-line rounded-xl ${className}`}>{children}</div>
);

export default Panel;
