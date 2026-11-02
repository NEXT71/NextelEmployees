import { memo } from 'react';

// Legacy single-figure tile, restyled to the design tokens. Prefer
// ui/StatGroup for a row of related figures.
const tones = {
  green: 'text-present',
  red: 'text-absent',
  yellow: 'text-late',
  orange: 'text-late',
};

const StatsCard = memo(({ title, value, subtitle, icon, color }) => (
  <div className="bg-surface border border-line rounded-xl px-5 py-4 min-w-0">
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm text-muted truncate">{title}</p>
      {icon && <span className="text-muted shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
    </div>
    <p className={`mt-1 text-2xl font-semibold tabular-nums truncate ${tones[color] || 'text-ink'}`}>{value}</p>
    {subtitle && <p className="mt-0.5 text-xs text-muted truncate">{subtitle}</p>}
  </div>
));

StatsCard.displayName = 'StatsCard';

export default StatsCard;
