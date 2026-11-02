import Button from './Button';

// Prev / next footer for paged tables. Renders nothing when there's one page.
const Pagination = ({ page, pageSize, total, onPageChange, noun = 'results', className = '' }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 text-sm text-muted ${className}`}>
      <p className="tabular-nums">
        Page {page} of {pages}, {total.toLocaleString('en-US')} {noun}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pages}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
