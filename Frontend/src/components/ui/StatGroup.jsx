import Panel from './Panel';

const tones = {
  present: 'text-present',
  late: 'text-late',
  absent: 'text-absent',
  shift: 'text-shift',
};

// A row of related figures in one panel, split by hairlines — use this
// instead of a row of separate stat cards.
// items: [{ label, value, hint, tone }]
// wrap: cards flow onto new rows and text wraps instead of truncating
// (for groups with long hints, e.g. amounts plus counts).
const wrapCols = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
};

const StatGroup = ({ items, className = '', wrap = false }) => wrap ? (
  <Panel className={`overflow-hidden ${className}`}>
    <dl className={`grid grid-cols-1 ${wrapCols[items.length] || wrapCols[4]} gap-px bg-line`}>
      {items.map((item) => (
        <div key={item.label} className="bg-surface px-5 py-4 min-w-0">
          <dt className="text-sm text-muted">{item.label}</dt>
          <dd className={`mt-1 text-2xl font-semibold tabular-nums break-words ${tones[item.tone] || 'text-ink'}`}>{item.value}</dd>
          {item.hint && <dd className="mt-0.5 text-xs text-muted">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  </Panel>
) : (
  <Panel className={`overflow-hidden ${className}`}>
    <dl className="grid grid-cols-2 md:grid-flow-col md:auto-cols-fr divide-line [&>*]:border-line [&>*]:border-b md:[&>*]:border-b-0 md:[&>*:not(:first-child)]:border-l">
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4 min-w-0">
          <dt className="text-sm text-muted truncate">{item.label}</dt>
          <dd className={`mt-1 text-2xl font-semibold tabular-nums truncate ${tones[item.tone] || 'text-ink'}`}>{item.value}</dd>
          {item.hint && <dd className="mt-0.5 text-xs text-muted truncate">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  </Panel>
);

export default StatGroup;
