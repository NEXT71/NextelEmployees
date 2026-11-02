import { LogIn, LogOut } from 'lucide-react';
import Panel from '../ui/Panel';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { SHIFT_START_MINUTES, SHIFT_END_MINUTES } from '../../utils/attendanceTimeAccess';

// The night shift runs 5:30 PM → 6:30 AM PKT. Positions on the track are
// minutes since 5:30 PM, out of 13 hours.
const SHIFT_START = SHIFT_START_MINUTES;
const SHIFT_LENGTH = 24 * 60 - SHIFT_START_MINUTES + SHIFT_END_MINUTES;
const LATE_AFTER = 19 * 60; // matches isLateClockIn in the backend

// Accepts a Date or an ISO string (the API sends strings); null if unreadable
const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pktMinutes = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(date));
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return get('hour') * 60 + get('minute');
};

const shiftOffset = (date) => (pktMinutes(date) - SHIFT_START + 1440) % 1440;
const onShift = (date) => shiftOffset(date) < SHIFT_LENGTH;
const toPct = (offset) => (Math.min(offset, SHIFT_LENGTH) / SHIFT_LENGTH) * 100;
const isLateTime = (date) => {
  const minutes = pktMinutes(date);
  return minutes >= LATE_AFTER || minutes < 6 * 60;
};

export const formatPKT = (date) =>
  new Date(date).toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit' });

// Track labels: shift start and end, plus every two hours (offsets from 5:30 PM)
const HOURS = [
  { label: '5:30 PM', at: 0 },
  { label: '8 PM', at: 150, wide: true },
  { label: '10 PM', at: 270, wide: true },
  { label: '12 AM', at: 390 },
  { label: '2 AM', at: 510, wide: true },
  { label: '4 AM', at: 630, wide: true },
  { label: '6:30 AM', at: SHIFT_LENGTH },
];

const ShiftTrack = ({ now, clockInAt, clockOutAt }) => {
  const nowOnShift = onShift(now);
  const inPct = clockInAt ? toPct(shiftOffset(clockInAt)) : null;
  const endAt = clockOutAt || (nowOnShift ? now : null);
  const endPct = endAt ? toPct(shiftOffset(endAt)) : null;
  const late = clockInAt && isLateTime(clockInAt);

  const summary = [
    'Shift 5:30 PM to 6:30 AM',
    clockInAt && `clocked in at ${formatPKT(clockInAt)}`,
    clockOutAt && `clocked out at ${formatPKT(clockOutAt)}`,
    nowOnShift && `now ${formatPKT(now)}`,
  ].filter(Boolean).join(', ');

  return (
    <div role="img" aria-label={summary}>
      <div className="relative h-10 rounded-full bg-paper border border-line">
        {/* worked span */}
        {inPct !== null && endPct !== null && endPct > inPct && (
          <span
            className={`absolute inset-y-0 rounded-full ${late ? 'bg-late-soft' : 'bg-present-soft'}`}
            style={{ left: `${inPct}%`, width: `${endPct - inPct}%` }}
          />
        )}

        {/* hour dividers, drawn over the worked span */}
        {HOURS.slice(1, -1).map((h) => (
          <span key={h.at} className="absolute top-2 bottom-2 w-px bg-ink/10" style={{ left: `${toPct(h.at)}%` }} />
        ))}

        {/* clock-in point */}
        {inPct !== null && (
          <span
            className="absolute top-1/2 w-2.5 h-2.5 -mt-[5px] -ml-[5px] rounded-full bg-ink ring-2 ring-surface"
            style={{ left: `max(10px, ${inPct}%)` }}
          />
        )}

        {/* now marker */}
        {nowOnShift && !clockOutAt && (
          <span className="absolute -top-1.5 -bottom-1.5 w-0.5 -ml-px bg-shift rounded-full" style={{ left: `${toPct(shiftOffset(now))}%` }} />
        )}
      </div>

      <div className="relative h-5 mt-2 text-xs text-muted tabular-nums">
        {HOURS.map((h, i) => (
          <span
            key={h.at}
            className={`absolute whitespace-nowrap ${h.wide ? 'hidden sm:inline' : ''} ${
              i === 0 ? '' : i === HOURS.length - 1 ? '-translate-x-full' : '-translate-x-1/2'
            }`}
            style={{ left: `${toPct(h.at)}%` }}
          >
            {h.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const ShiftPanel = ({ now, clockInAt: clockInRaw, clockOutAt: clockOutRaw, canClockIn, canClockOut, busy, onClockIn, onClockOut }) => {
  const clockInAt = toDate(clockInRaw);
  const clockOutAt = toDate(clockOutRaw);
  const clockedIn = !!clockInAt;
  const done = clockedIn && !!clockOutAt;
  const isLateNow = isLateTime(now);
  const lateClockIn = clockedIn && isLateTime(clockInAt);

  let badge;
  let note;
  if (done) {
    badge = <Badge tone="neutral">Shift complete</Badge>;
    note = `Clocked in at ${formatPKT(clockInAt)} and out at ${formatPKT(clockOutAt)}.`;
  } else if (clockedIn) {
    badge = (
      <Badge tone={lateClockIn ? 'late' : 'present'} dot>
        {lateClockIn ? 'Late' : 'On shift'} since {formatPKT(clockInAt)}
      </Badge>
    );
    note = 'Clock-out is open until 6:30 AM PKT.';
  } else if (canClockIn) {
    badge = <Badge tone="neutral">Not clocked in</Badge>;
    note = isLateNow
      ? 'Clocking in now will be marked late. On time is before 7:00 PM PKT.'
      : 'Clock in before 7:00 PM PKT to be on time.';
  } else {
    badge = <Badge tone="neutral">Off shift</Badge>;
    note = 'Clock-in opens at 5:30 PM PKT.';
  }

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-medium text-muted mb-1">Tonight's shift</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="font-condensed font-semibold text-[40px] sm:text-[56px] leading-none text-ink tabular-nums">
              {formatPKT(now)}
            </p>
            {badge}
          </div>
        </div>

        {!done && (
          clockedIn ? (
            <Button icon={LogOut} onClick={onClockOut} disabled={!canClockOut || busy}>
              {busy ? 'Clocking out…' : 'Clock out'}
            </Button>
          ) : (
            <Button icon={LogIn} onClick={onClockIn} disabled={!canClockIn || busy}>
              {busy ? 'Clocking in…' : 'Clock in'}
            </Button>
          )
        )}
      </div>

      <ShiftTrack now={now} clockInAt={clockInAt} clockOutAt={clockOutAt} />

      <p className="mt-4 text-sm text-muted">{note}</p>
    </Panel>
  );
};

export default ShiftPanel;
