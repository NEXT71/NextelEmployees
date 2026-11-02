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
const StatGroup = ({ items, className = '' }) => (
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
