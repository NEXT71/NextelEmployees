import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, AlertCircle, Loader, ChevronDown, ChevronUp } from 'lucide-react';

const PendingSalesReview = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(null);

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/sales-submissions?status=${filter}&limit=100`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch submissions');

      const data = await response.json();
      setSubmissions(data.data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      alert('Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Single approve
  const handleApprove = async (id) => {
    try {
      const response = await fetch(`/api/sales-submissions/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to approve');

      alert('Submission approved successfully');
      setSubmissions(submissions.filter(s => s._id !== id));
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to approve submission');
    }
  };

  // Single disapprove
  const handleDisapprove = async (id) => {
    try {
      const response = await fetch(`/api/sales-submissions/${id}/disapprove`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectionReason: rejectReason
        })
      });

      if (!response.ok) throw new Error('Failed to disapprove');

      alert('Submission disapproved');
      setShowRejectForm(null);
      setRejectReason('');
      setSubmissions(submissions.filter(s => s._id !== id));
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
      const response = await fetch('/api/sales-submissions/bulk/approve', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionIds: Array.from(selectedIds)
        })
      });

      if (!response.ok) throw new Error('Failed to bulk approve');

      const data = await response.json();
      alert(`Successfully approved ${data.data.summary.approved} submissions`);
      setSelectedIds(new Set());
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
      const response = await fetch('/api/sales-submissions/bulk/disapprove', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
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
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissions.map(s => s._id)));
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
            {submissions.filter(s => s.status === 'pending').length} Pending
          </span>
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
            {status} ({submissions.filter(s => s.status === status).length})
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
      {!loading && submissions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-blue-200 text-lg">No submissions to review</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
            <input
              type="checkbox"
              checked={selectedIds.size === submissions.length && submissions.length > 0}
              onChange={toggleSelectAll}
              className="w-5 h-5 rounded border-white/30 text-blue-600"
            />
            <span className="text-white font-medium">Select All on this page</span>
          </div>

          {/* Submissions */}
          {submissions.map(submission => (
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
                      {submission.agentName} - {submission.customer.firstName} {submission.customer.lastName}
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
      )}
    </div>
  );
};

export default PendingSalesReview;
