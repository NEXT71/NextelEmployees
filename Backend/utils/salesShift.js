const TIME_ZONE = 'Asia/Karachi';

export const getSalesShiftRange = (date) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) return null;

  return {
    start: new Date(Date.UTC(year, month - 1, day, 13, 30)),
    end: new Date(Date.UTC(year, month - 1, day + 1, 0, 0))
  };
};

export const getSalesShiftDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  const minuteOfDay = Number(values.hour) * 60 + Number(values.minute);

  if (minuteOfDay >= 5 * 60 && minuteOfDay < 18 * 60 + 30) return null;

  const shiftDate = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  if (minuteOfDay < 5 * 60) shiftDate.setUTCDate(shiftDate.getUTCDate() - 1);

  return shiftDate.toISOString().slice(0, 10);
};

export const getSalesShiftCalendarDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const getSalesShiftMonthRange = (year, month) => {
  const start = getSalesShiftRange(`${year}-${String(month).padStart(2, '0')}-01`);
  const finalDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = getSalesShiftRange(`${year}-${String(month).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`);

  return start && end ? { start: start.start, end: end.end } : null;
};