import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, ChevronDown, Database } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';
import { formatSalesShiftDate, getCurrentSalesShiftDate, getSalesShiftRange } from '../../utils/salesShift';
import Panel from '../ui/Panel';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import Pagination from '../ui/Pagination';
import { Segmented } from '../ui/Tabs';
import { Field, Input, Textarea } from '../ui/Field';

// Helper to get auth token from localStorage
const getAuthToken = () => {
  try {
    return localStorage.getItem('token');
  } catch (err) {
    console.warn('Failed to get token from localStorage:', err);
    return null;
  }
};

// Helper to build headers with auth token
const getHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Helper to get agent full name from submission (handles undefined cases)
const getAgentName = (submission) => {
  if (submission.agentName && submission.agentName.trim()) {
    return submission.agentName;
  }
  if (submission.agent) {
    const agent = submission.agent;
    if (typeof agent === 'object' && agent.firstName && agent.lastName) {
      return `${agent.firstName} ${agent.lastName}`;
    }
  }
  return 'Unknown agent';
};

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const STATUS_FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'disapproved', label: 'Rejected' },
];

const statusBadge = {
  pending: <Badge tone="late">Pending</Badge>,
  approved: <Badge tone="present">Approved</Badge>,
  disapproved: <Badge tone="absent">Rejected</Badge>,
};

const PendingSalesReview = ({ onRefresh }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getCurrentSalesShiftDate);
  const [currentPage, setCurrentPage] = useState(1);
  const [dbStatus, setDbStatus] = useState(null);
  const ITEMS_PER_PAGE = 15;

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setCurrentPage(1); // Reset to first page
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const queryUrl = `${API_BASE_URL}/sales-submissions?status=${filter}&limit=100`;
      
      const response = await fetch(queryUrl, {
        method: 'GET',
        credentials: 'include',
        headers: getHeaders(token)
      });

      console.log('📥 Response Status:', response.status, response.statusText);
      console.log('Response Headers:', {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ Error response:', errorData);
        } catch (e) {
          errorData = { message: `HTTP ${response.status}` };
        }
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch submissions`);
      }

      const data = await response.json();
      console.log('✓ Received submissions:', data.data?.length, 'Total:', data.pagination?.total);
      setSubmissions(data.data || []);
    } catch (error) {
      console.error('❌ Error fetching submissions:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Fetch database status for debugging
  const checkDatabaseStatus = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/sales-submissions/debug/status`, {
        credentials: 'include',
        headers: getHeaders(token)
      });
      const data = await response.json();
      setDbStatus(data);
      console.log('📊 Database status:', data);
    } catch (err) {
      console.error('❌ Failed to check database status:', err);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Filter submissions by selected date
  const filteredByDate = submissions.filter(submission => {
    const range = getSalesShiftRange(selectedDate);
    const timestamp = new Date(submission.createdAt || submission.saleDate);
    return range && timestamp >= range.start && timestamp < range.end;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredByDate.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSubmissions = filteredByDate.slice(startIndex, endIndex);

  // Single approve
  const handleApprove = async (id) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/sales-submissions/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders(token)
      });

      if (!response.ok) throw new Error('Failed to approve');

      alert('Submission approved successfully');
      setSubmissions(submissions.filter(s => s._id !== id));
      onRefresh?.();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to approve submission');
    }
  };

  // Single disapprove
  const handleDisapprove = async (id) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/sales-submissions/${id}/disapprove`, {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders(token),
        body: JSON.stringify({
          rejectionReason: rejectReason
        })
      });

      if (!response.ok) throw new Error('Failed to disapprove');

      alert('Submission disapproved');
      setShowRejectForm(null);
      setRejectReason('');
      setSubmissions(submissions.filter(s => s._id !== id));
      onRefresh?.();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to disapprove submission');
    }
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      alert('Please select submissions to approve');
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/sales-submissions/bulk/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders(token),
        body: JSON.stringify({
          submissionIds: Array.from(selectedIds)
        })
      });

      if (!response.ok) throw new Error('Failed to bulk approve');

      const data = await response.json();
      alert(`Successfully approved ${data.data.summary.approved} submissions`);
      setSelectedIds(new Set());
      onRefresh?.();
      fetchSubmissions();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to bulk approve submissions');
    } finally {
      setLoading(false);
    }
  };

  // Bulk disapprove
  const handleBulkDisapprove = async () => {
    if (selectedIds.size === 0) {
      alert('Please select submissions to disapprove');
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/sales-submissions/bulk/disapprove`, {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders(token),
        body: JSON.stringify({
          submissionIds: Array.from(selectedIds),
          rejectionReason: rejectReason
        })
      });

      if (!response.ok) throw new Error('Failed to bulk disapprove');

      const data = await response.json();
      alert(`Successfully disapproved ${data.data.summary.disapproved} submissions`);
      setSelectedIds(new Set());
      setRejectReason('');
      fetchSubmissions();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to bulk disapprove submissions');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Toggle all
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedSubmissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedSubmissions.map(s => s._id)));
    }
  };

  const allOnPageSelected = paginatedSubmissions.length > 0 && selectedIds.size === paginatedSubmissions.length;
  const statusLabel = STATUS_FILTERS.find((s) => s.key === filter)?.label.toLowerCase();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Shift day" htmlFor="psr-date">
          <Input
            id="psr-date"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setCurrentPage(1);
            }}
            className="w-44"
          />
        </Field>
        <Segmented
          label="Status"
          value={filter}
          onChange={setFilter}
          items={STATUS_FILTERS.map((s) => (s.key === filter ? { ...s, label: `${s.label} (${filteredByDate.length})` } : s))}
        />
        <button
          type="button"
          onClick={checkDatabaseStatus}
          className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
          title="Check how many sale records the database holds"
        >
          <Database className="w-3.5 h-3.5" aria-hidden="true" />
          Database status
        </button>
      </div>

      <p className="text-sm text-muted">
        {filteredByDate.length} {statusLabel} {filteredByDate.length === 1 ? 'sale' : 'sales'} on the{' '}
        {formatSalesShiftDate(`${selectedDate}T18:00:00+05:00`)} shift
      </p>

      {error && (
        <Alert>
          <span className="font-medium">Could not load sales.</span> {error}{' '}
          {dbStatus && <>The database holds {dbStatus.database?.totalRecords || 0} records. </>}
          <button type="button" onClick={fetchSubmissions} className="underline underline-offset-2 font-medium">Try again</button>
        </Alert>
      )}

      {dbStatus && (
        <Panel className="px-4 py-3 text-xs text-muted space-y-1">
          <p className="font-medium text-ink">Database status</p>
          <p>Total records: <span className="text-ink tabular-nums">{dbStatus.database?.totalRecords || 0}</span></p>
          <p>
            By status:{' '}
            {Object.entries(dbStatus.database?.byStatus || {}).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}
          </p>
          <p>Problem indexes: {dbStatus.database?.hasUniqueIndexes?.length > 0 ? <span className="text-absent">yes</span> : 'none'}</p>
        </Panel>
      )}

      {selectedIds.size > 0 && (
        <Panel className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-ink">
          <span className="text-sm font-medium text-ink">{selectedIds.size} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              aria-label="Reason for rejecting selected sales"
              placeholder="Reason, if rejecting"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="h-8 w-56"
            />
            <Button variant="danger" size="sm" icon={X} onClick={handleBulkDisapprove} disabled={loading}>Reject selected</Button>
            <Button size="sm" icon={Check} onClick={handleBulkApprove} disabled={loading}>Approve selected</Button>
          </div>
        </Panel>
      )}

      <Panel className="overflow-hidden">
        {loading ? (
          <p className="px-5 py-8 text-sm text-muted">Loading sales…</p>
        ) : filteredByDate.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">No {statusLabel} sales on this shift day. Pick another date above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums whitespace-nowrap">
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="pl-5 pr-2 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all on this page"
                      className="w-4 h-4 rounded border-line accent-ink"
                    />
                  </th>
                  {['CSR', 'Customer', 'DIDs', 'Submitted', 'Status', ''].map((h) => (
                    <th key={h || 'more'} scope="col" className="px-3 py-3 text-xs font-medium text-muted">
                      {h || <span className="sr-only">Details</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginatedSubmissions.map((submission) => {
                  const expanded = expandedId === submission._id;
                  return (
                    <React.Fragment key={submission._id}>
                      <tr className={selectedIds.has(submission._id) ? 'bg-shift-soft' : undefined}>
                        <td className="pl-5 pr-2 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(submission._id)}
                            onChange={() => toggleSelect(submission._id)}
                            aria-label={`Select sale by ${getAgentName(submission)}`}
                            className="w-4 h-4 rounded border-line accent-ink"
                          />
                        </td>
                        <td className="px-3 py-3 font-medium text-ink">{getAgentName(submission)}</td>
                        <td className="px-3 py-3 text-ink">
                          {submission.customer?.firstName} {submission.customer?.lastName}
                          <span className="block text-xs text-muted">{submission.customer?.phone}</span>
                        </td>
                        <td className="px-3 py-3 text-ink">{submission.dids || '—'}</td>
                        <td className="px-3 py-3 text-muted">{fmtDate(submission.createdAt)}</td>
                        <td className="px-3 py-3">{statusBadge[submission.status] || <Badge>{submission.status}</Badge>}</td>
                        <td className="px-3 py-3 pr-5 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            icon={ChevronDown}
                            onClick={() => setExpandedId(expanded ? null : submission._id)}
                            aria-label={expanded ? 'Hide details' : 'Show details'}
                            aria-expanded={expanded}
                            className={expanded ? '[&>svg]:rotate-180' : ''}
                          />
                        </td>
                      </tr>

                      {expanded && (
                        <tr className="bg-paper">
                          <td colSpan={7} className="px-5 py-4 whitespace-normal">
                            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                              {[
                                ['Customer', `${submission.customer?.firstName || ''} ${submission.customer?.lastName || ''}`],
                                ['Phone', submission.customer?.phone || '—'],
                                ['State', submission.customer?.state || '—'],
                                ['Zip code', submission.customer?.zipCode || '—'],
                                ['DIDs', submission.dids || '—'],
                                ['Closer', submission.closer || '—'],
                                ['Sale date', fmtDate(submission.saleDate)],
                                ['Submitted', fmtDate(submission.createdAt)],
                              ].map(([label, value]) => (
                                <div key={label} className="min-w-0">
                                  <dt className="text-xs text-muted">{label}</dt>
                                  <dd className="text-ink break-words">{value}</dd>
                                </div>
                              ))}
                            </dl>

                            {submission.status === 'pending' && (
                              <div className="mt-4 pt-4 border-t border-line space-y-3">
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" icon={Check} onClick={() => handleApprove(submission._id)}>Approve sale</Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={X}
                                    onClick={() => setShowRejectForm(showRejectForm === submission._id ? null : submission._id)}
                                  >
                                    Reject
                                  </Button>
                                </div>
                                {showRejectForm === submission._id && (
                                  <div className="max-w-md space-y-2">
                                    <Field label="Reason (optional)" htmlFor={`reject-${submission._id}`}>
                                      <Textarea
                                        id={`reject-${submission._id}`}
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        rows={2}
                                        className="resize-none"
                                      />
                                    </Field>
                                    <Button variant="danger" size="sm" onClick={() => handleDisapprove(submission._id)}>Confirm rejection</Button>
                                  </div>
                                )}
                              </div>
                            )}

                            {submission.status === 'approved' && (
                              <p className="mt-4 pt-4 border-t border-line text-sm text-present">
                                Approved by {submission.approvedBy?.username || 'admin'} on {fmtDate(submission.approvedAt)}
                              </p>
                            )}

                            {submission.status === 'disapproved' && (
                              <div className="mt-4 pt-4 border-t border-line text-sm">
                                <p className="text-absent">
                                  Rejected by {submission.disapprovedBy?.username || 'admin'} on {fmtDate(submission.disapprovedAt)}
                                </p>
                                {submission.rejectionReason && <p className="text-ink mt-1">Reason: {submission.rejectionReason}</p>}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Pagination
        page={currentPage}
        pageSize={ITEMS_PER_PAGE}
        total={filteredByDate.length}
        noun="sales"
        onPageChange={(p) => setCurrentPage(Math.min(totalPages, Math.max(1, p)))}
      />
    </div>
  );
};

export default PendingSalesReview;
