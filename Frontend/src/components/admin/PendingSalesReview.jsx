import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, AlertCircle, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';

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
  return 'Unknown Agent';
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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
      console.log('📤 Fetching from URL:', queryUrl);
      console.log('🔐 Token:', token ? '✓ Present' : '✗ Missing');
      
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
    const submissionDate = new Date(submission.saleDate).toISOString().split('T')[0];
    return submissionDate === selectedDate;
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

  return (
    <div className="bg-gradient-to-br from-blue-900/95 to-purple-900/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-orange-400" />
          <h2 className="text-2xl font-bold text-white">Pending Sales Review</h2>
          <span className="ml-2 px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-300 text-sm font-semibold">
            {filteredByDate.filter(s => s.status === 'pending').length} Pending
          </span>
        </div>
        <button
          onClick={checkDatabaseStatus}
          className="px-3 py-1 text-xs bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 rounded text-blue-300 transition"
          title="Check database for total sales records"
        >
          🔍 Database Status
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-600/50 flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-400 font-semibold">Error Loading Sales</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
              {dbStatus && (
                <p className="text-blue-300 text-xs mt-2">
                  💾 Database shows {dbStatus.database?.totalRecords || 0} total records
                </p>
              )}
            </div>
          </div>
          <button
            onClick={fetchSubmissions}
            className="ml-4 px-3 py-1 bg-red-600/50 hover:bg-red-600 rounded text-white text-sm transition flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Database Status Info */}
      {dbStatus && (
        <div className="mb-6 p-3 rounded-lg bg-blue-900/30 border border-blue-600/30 text-xs text-blue-300">
          <div className="font-semibold mb-2">📊 Database Status:</div>
          <ul className="space-y-1">
            <li>Total Records: {dbStatus.database?.totalRecords || 0}</li>
            <li>By Status: {JSON.stringify(dbStatus.database?.byStatus || {})}</li>
            <li>Has Problematic Indexes: {dbStatus.database?.hasUniqueIndexes?.length > 0 ? '⚠️ Yes' : '✅ No'}</li>
          </ul>
        </div>
      )}

      {/* Date Filter */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1 max-w-xs">
          <label className="block text-sm text-blue-300 font-medium mb-2">Filter by Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <div className="text-sm text-blue-300 pt-6">
          Showing {filteredByDate.length} submissions for {new Date(selectedDate).toLocaleDateString()}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['pending', 'approved', 'disapproved'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            {status} ({filteredByDate.filter(s => s.status === status).length})
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-300">
              {selectedIds.size} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkApprove}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Bulk Approve
              </button>
              <button
                onClick={handleBulkDisapprove}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Bulk Disapprove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-300 animate-spin" />
        </div>
      )}

      {/* Submissions List */}
      {!loading && filteredByDate.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-blue-200 text-lg">No submissions to review for this date</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {/* Select All */}
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <input
                type="checkbox"
                checked={selectedIds.size === paginatedSubmissions.length && paginatedSubmissions.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded border-white/30 text-blue-600"
              />
              <span className="text-white font-medium">Select All on this page ({paginatedSubmissions.length})</span>
            </div>

            {/* Submissions */}
            {paginatedSubmissions.map(submission => (
            <div
              key={submission._id}
              className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
            >
              {/* Row */}
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all">
                {/* Left side */}
                <div className="flex items-center gap-4 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(submission._id)}
                    onChange={() => toggleSelect(submission._id)}
                    className="w-5 h-5 rounded border-white/30 text-blue-600"
                    onClick={e => e.stopPropagation()}
                  />
                  <div
                    className="flex-1"
                    onClick={() =>
                      setExpandedId(expandedId === submission._id ? null : submission._id)
                    }
                  >
                    <p className="text-white font-medium text-sm">
                      {getAgentName(submission)} - {submission.customer.firstName} {submission.customer.lastName}
                    </p>
                    <p className="text-blue-300 text-xs">
                      {submission.customer.phone} • {submission.dids}
                    </p>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-blue-200">
                    {new Date(submission.createdAt).toLocaleDateString()}
                  </span>
                  {expandedId === submission._id ? (
                    <ChevronUp className="w-5 h-5 text-blue-300" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-blue-300" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === submission._id && (
                <div className="bg-white/5 border-t border-white/10 p-4 space-y-4">
                  {/* Customer Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-blue-300 font-medium mb-1">Full Name</p>
                      <p className="text-white font-semibold">
                        {submission.customer.firstName} {submission.customer.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-300 font-medium mb-1">Phone</p>
                      <p className="text-white font-semibold">{submission.customer.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-300 font-medium mb-1">State</p>
                      <p className="text-white font-semibold">{submission.customer.state}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-300 font-medium mb-1">Zip Code</p>
                      <p className="text-white font-semibold">{submission.customer.zipCode}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-blue-300 font-medium mb-1">DIDs</p>
                      <p className="text-white font-semibold">{submission.dids}</p>
                    </div>
                  </div>

                  {/* Sale Details */}
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-xs text-blue-300 font-medium mb-2">Sale Details</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-blue-200">Closer</p>
                        <p className="text-white font-semibold">{submission.closer}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-200">Sale Date</p>
                        <p className="text-white font-semibold">
                          {new Date(submission.saleDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-200">Submitted</p>
                        <p className="text-white font-semibold">
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {submission.status === 'pending' && (
                    <div className="border-t border-white/10 pt-4 space-y-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(submission._id)}
                          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Approve Sale
                        </button>
                        <button
                          onClick={() => setShowRejectForm(showRejectForm === submission._id ? null : submission._id)}
                          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Disapprove
                        </button>
                      </div>

                      {/* Rejection Reason Form */}
                      {showRejectForm === submission._id && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-2">
                          <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Reason for disapproval (optional)"
                            className="w-full bg-white/10 text-white text-xs rounded border border-white/20 p-2 placeholder-blue-300/50"
                            rows="2"
                          />
                          <button
                            onClick={() => {
                              handleDisapprove(submission._id);
                            }}
                            className="w-full px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-all"
                          >
                            Confirm Disapproval
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {submission.status === 'approved' && (
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-xs text-green-300">
                        ✓ Approved by {submission.approvedBy?.firstName || 'Admin'} on{' '}
                        {new Date(submission.approvedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {submission.status === 'disapproved' && (
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-xs text-red-300 mb-1">
                        ✗ Disapproved by {submission.disapprovedBy?.firstName || 'Admin'} on{' '}
                        {new Date(submission.disapprovedAt).toLocaleDateString()}
                      </p>
                      {submission.rejectionReason && (
                        <p className="text-xs text-red-200">Reason: {submission.rejectionReason}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ← Previous
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isEllipsis = 
                    (pageNum > currentPage + 2 && pageNum < totalPages - 1) ||
                    (pageNum < currentPage - 2 && pageNum > 2);
                  
                  if (isEllipsis) {
                    return <span key={pageNum} className="px-2 py-2 text-blue-300">...</span>;
                  }
                  
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/10 text-blue-300 hover:bg-white/20'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>

              <span className="ml-4 text-blue-300 text-sm font-medium">
                Page {currentPage} of {totalPages} • {filteredByDate.length} total submissions
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PendingSalesReview;
