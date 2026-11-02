// Status pill. Tone names match the status tokens in tailwind.config.js.
const tones = {
  present: 'bg-present-soft text-present',
  late: 'bg-late-soft text-late',
  absent: 'bg-absent-soft text-absent',
  shift: 'bg-shift-soft text-shift',
  neutral: 'bg-paper text-muted border border-line',
};

// Maps backend status strings onto a tone
export const statusTone = (status) => {
  switch (status) {
    case 'Present':
    case 'Approved':
    case 'Paid':
      return 'present';
    case 'Late':
    case 'Half-day':
    case 'Pending':
      return 'late';
    case 'Absent':
    case 'Rejected':
      return 'absent';
    default:
      return 'neutral';
  }
};

const Badge = ({ tone = 'neutral', dot = false, className = '', children }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]} ${className}`}>
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
    {children}
  </span>
);

export default Badge;
