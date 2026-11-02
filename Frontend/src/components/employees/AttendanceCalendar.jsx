import Panel from '../ui/Panel';

const DOT = {
  Present: 'bg-present',
  Late: 'bg-late',
  'Half-day': 'bg-late',
  Absent: 'bg-absent',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Year/month/day of a date as seen in Pakistan
export const pktParts = (date) => {
  const [y, m, d] = new Date(date)
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
    .split('-')
    .map(Number);
  return { y, m, d };
};

const AttendanceCalendar = ({ records, now }) => {
  const today = pktParts(now);
  const daysInMonth = new Date(today.y, today.m, 0).getDate();
  const leadingBlanks = (new Date(today.y, today.m - 1, 1).getDay() + 6) % 7; // Monday-first

  const byDay = {};
  records.forEach((record) => {
    if (!record?.date) return;
    const { y, m, d } = pktParts(record.date);
    if (y === today.y && m === today.m) byDay[d] = record.status;
  });

  const counts = Object.values(byDay).reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const legend = [
    { label: 'Present', count: counts.Present || 0, dot: 'bg-present' },
    { label: 'Late', count: (counts.Late || 0) + (counts['Half-day'] || 0), dot: 'bg-late' },
    { label: 'Absent', count: counts.Absent || 0, dot: 'bg-absent' },
  ];

  const monthName = new Date(today.y, today.m - 1, 1).toLocaleDateString('en-US', { month: 'long' });

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold text-ink">{monthName}</h3>
        <ul className="flex items-center gap-4 text-sm text-muted">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${item.dot}`} aria-hidden="true" />
              {item.label}
              <span className="font-medium text-ink tabular-nums">{item.count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-xs text-muted pb-1">{day}</div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const status = byDay[day];
          const isToday = day === today.d;
          const isFuture = day > today.d;
          return (
            <div
              key={day}
              title={status ? `${monthName} ${day}: ${status}` : undefined}
              className={`h-11 rounded-lg border flex flex-col items-center justify-center gap-1 text-sm tabular-nums
                ${isToday ? 'border-shift ring-1 ring-shift' : isFuture ? 'border-transparent' : 'border-line'}
                ${isFuture ? 'text-muted/60' : 'text-ink bg-surface'}`}
            >
              {day}
              <span className={`w-1.5 h-1.5 rounded-full ${status ? DOT[status] || 'bg-line' : 'bg-transparent'}`} aria-hidden="true" />
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

export default AttendanceCalendar;
