import { useState, useEffect } from 'react';
import { Check, Send, RefreshCw, ArrowLeft } from 'lucide-react';
import { messageAPI } from '../../utils/api';
import Dialog from '../ui/Dialog';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { Field, Select, Textarea } from '../ui/Field';

const priorityTone = { urgent: 'absent', high: 'late' };
const statusTone = { unread: 'shift', read: 'neutral', responded: 'present', resolved: 'neutral' };
const statusLabel = { unread: 'New', read: 'Read', responded: 'Replied', resolved: 'Resolved' };

const senderName = (message, withId = false) => {
  const d = message.senderDetails;
  if (d) return `${d.firstName} ${d.lastName}${withId && d.employeeId ? ` (${d.employeeId})` : ''}`;
  return message.from?.username || 'Unknown user';
};

const formatDate = (dateString) =>
  new Date(dateString).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

const AdminMessageCenter = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [stats, setStats] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: ''
  });

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await messageAPI.getAdminMessages(filters);
      setMessages(response.data || []);
      
      // Fetch stats
      const statsResponse = await messageAPI.getMessageStats();
      setStats(statsResponse.data);
      
    } catch (err) {
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (messageId) => {
    if (!responseText.trim()) {
      setError('Response message is required');
      return;
    }

    try {
      setSendingResponse(true);
      setError('');
      
      const response = await messageAPI.respondToMessage(messageId, responseText.trim());
      
      if (response.success) {
        setSuccess('Response sent successfully!');
        setResponseText('');
        setSelectedMessage(null);
        fetchMessages(); // Refresh messages
      }
    } catch (err) {
      setError(err.message || 'Failed to send response');
    } finally {
      setSendingResponse(false);
    }
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      await messageAPI.markAsRead(messageId);
      fetchMessages(); // Refresh to update status
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleResolve = async (messageId) => {
    try {
      await messageAPI.resolveMessage(messageId);
      setSuccess('Message marked as resolved');
      setSelectedMessage(null);
      fetchMessages(); // Refresh messages
    } catch (err) {
      setError(err.message || 'Failed to resolve message');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filters]);

  if (!isOpen) return null;

  const open = (message) => {
    setSelectedMessage(message);
    handleMarkAsRead(message._id);
    setError('');
    setSuccess('');
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="max-w-6xl"
      title="Messages"
      description={
        stats?.urgentMessages
          ? `Questions and requests from employees. ${stats.urgentMessages} marked urgent.`
          : 'Questions and requests from employees.'
      }
    >
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-0 md:gap-6 -mx-5 sm:-mx-6 -my-5 md:h-[68vh]">
        {/* List */}
        <div className={`flex flex-col min-h-0 md:border-r md:border-line ${selectedMessage ? 'hidden md:flex' : 'flex'}`}>
          <div className="px-5 sm:px-6 py-3 border-b border-line">
            <div className="grid grid-cols-3 gap-2">
              <Select aria-label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="h-9 text-xs">
                <option value="">Any status</option>
                <option value="unread">New</option>
                <option value="read">Read</option>
                <option value="responded">Replied</option>
                <option value="resolved">Resolved</option>
              </Select>
              <Select aria-label="Topic" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="h-9 text-xs">
                <option value="">Any topic</option>
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="hr">HR</option>
                <option value="payroll">Pay and salary</option>
                <option value="attendance">Attendance</option>
              </Select>
              <Select aria-label="Priority" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="h-9 text-xs">
                <option value="">Any priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {error && !selectedMessage && <Alert className="m-4">{error}</Alert>}
            {success && !selectedMessage && <Alert tone="success" className="m-4">{success}</Alert>}

            {loading ? (
              <p className="px-6 py-8 text-sm text-muted">Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted">No messages match these filters.</p>
            ) : (
              <ul className="divide-y divide-line">
                {messages.map((message) => {
                  const active = selectedMessage?._id === message._id;
                  const unread = message.status === 'unread';
                  return (
                    <li key={message._id}>
                      <button
                        type="button"
                        onClick={() => open(message)}
                        aria-current={active ? 'true' : undefined}
                        className={`w-full text-left px-5 sm:px-6 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shift ${
                          active ? 'bg-shift-soft' : 'hover:bg-paper'
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <p className={`text-sm truncate ${unread ? 'font-semibold text-ink' : 'text-ink'}`}>{senderName(message)}</p>
                          <span className="text-xs text-muted whitespace-nowrap">{formatDate(message.createdAt)}</span>
                        </div>
                        <p className={`text-sm truncate ${unread ? 'text-ink' : 'text-ink-soft'}`}>{message.subject}</p>
                        <p className="text-xs text-muted truncate mt-0.5">{message.message}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge tone={statusTone[message.status] || 'neutral'}>{statusLabel[message.status] || message.status}</Badge>
                          {priorityTone[message.priority] && (
                            <Badge tone={priorityTone[message.priority]}>{message.priority === 'urgent' ? 'Urgent' : 'High'}</Badge>
                          )}
                          <span className="text-xs text-muted capitalize self-center">{message.category}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-5 sm:px-6 py-2 border-t border-line">
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchMessages} disabled={loading}>Refresh</Button>
          </div>
        </div>

        {/* Conversation */}
        <div className={`flex-col min-h-0 ${selectedMessage ? 'flex' : 'hidden md:flex'}`}>
          {selectedMessage ? (
            <>
              <div className="px-5 sm:px-6 md:pl-0 py-4 border-b border-line">
                <button
                  type="button"
                  onClick={() => setSelectedMessage(null)}
                  className="md:hidden mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
                >
                  <ArrowLeft className="w-4 h-4" /> All messages
                </button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-ink">{selectedMessage.subject}</h3>
                    <p className="text-sm text-muted">
                      {senderName(selectedMessage, true)}
                      {selectedMessage.senderDetails?.department && `, ${selectedMessage.senderDetails.department}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={statusTone[selectedMessage.status] || 'neutral'}>
                      {statusLabel[selectedMessage.status] || selectedMessage.status}
                    </Badge>
                    {priorityTone[selectedMessage.priority] && (
                      <Badge tone={priorityTone[selectedMessage.priority]}>
                        {selectedMessage.priority === 'urgent' ? 'Urgent' : 'High priority'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 sm:px-6 md:pl-0 py-4 space-y-4">
                {error && <Alert>{error}</Alert>}
                {success && <Alert tone="success">{success}</Alert>}

                <div>
                  <p className="text-xs text-muted mb-1">{formatDate(selectedMessage.createdAt)}</p>
                  <p className="text-sm text-ink whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>

                {selectedMessage.adminResponse && (
                  <div className="rounded-lg bg-paper border-l-2 border-present px-3 py-2.5">
                    <p className="text-xs text-muted">Your reply, {formatDate(selectedMessage.adminResponse.respondedAt)}</p>
                    <p className="mt-1 text-sm text-ink whitespace-pre-wrap">{selectedMessage.adminResponse.message}</p>
                  </div>
                )}

                {selectedMessage.status !== 'resolved' && (
                  <Field label={selectedMessage.adminResponse ? 'Follow-up reply' : 'Reply'} htmlFor="admin-reply">
                    <Textarea
                      id="admin-reply"
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="The employee sees this under their sent messages."
                      rows={4}
                    />
                  </Field>
                )}
              </div>

              {selectedMessage.status !== 'resolved' && (
                <div className="px-5 sm:px-6 md:pl-0 py-3 border-t border-line flex flex-wrap justify-between gap-2">
                  <Button variant="secondary" size="sm" icon={Check} onClick={() => handleResolve(selectedMessage._id)}>
                    Mark resolved
                  </Button>
                  <Button size="sm" icon={Send} onClick={() => handleRespond(selectedMessage._id)} disabled={sendingResponse || !responseText.trim()}>
                    {sendingResponse ? 'Sending…' : 'Send reply'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center px-6">
              <p className="text-sm text-muted text-center">Pick a message on the left to read and reply.</p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default AdminMessageCenter;
