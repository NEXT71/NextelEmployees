import Panel from './Panel';

// columns: [{ key, header, align: 'left' | 'right', render: (row) => node }]
const DataTable = ({ columns, rows, rowKey = (row, i) => row._id || i, loading, error, onRetry, empty = 'Nothing here yet' }) => {
  const align = (col) => (col.align === 'right' ? 'text-right' : 'text-left');

  let body;
  if (loading) {
    body = <p className="px-5 py-8 text-sm text-muted">Loading…</p>;
  } else if (error) {
    body = (
      <div className="px-5 py-8 text-sm">
        <p className="text-absent">{error}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-2 text-shift font-medium hover:underline">
            Try again
          </button>
        )}
      </div>
    );
  } else if (!rows.length) {
    body = <p className="px-5 py-8 text-sm text-muted">{empty}</p>;
  }

  return (
    <Panel className="overflow-hidden">
      {body || (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                {columns.map((col) => (
                  <th key={col.key} scope="col" className={`px-5 py-3 text-xs font-medium text-muted ${align(col)}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row, i) => (
                <tr key={rowKey(row, i)}>
                  {columns.map((col) => (
                    <td key={col.key} className={`px-5 py-3 text-ink tabular-nums whitespace-nowrap ${align(col)}`}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

export default DataTable;
