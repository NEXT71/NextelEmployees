import { useState, useEffect } from 'react';
import { Send, RefreshCw } from 'lucide-react';
import { messageAPI } from '../../utils/api';
import Dialog from '../ui/Dialog';
import { Tabs } from '../ui/Tabs';
import { Field, Input, Select, Textarea } from '../ui/Field';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Alert from '../ui/Alert';

const emptyForm = {
  subject: '',
  message: '',
  priority: 'medium',
  category: 'general',
  targetAdmins: [], // Array of admin IDs
  sendToAllAdmins: true, // Toggle for all admins vs specific admins
};

const priorityTone = { urgent: 'absent', high: 'late', medium: 'neutral', low: 'neutral' };
const statusTone = { unread: 'shift', read: 'neutral', responded: 'present', resolved: 'present' };
const statusLabel = { unread: 'Sent', read: 'Read', responded: 'Replied', resolved: 'Resolved' };

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const MessageCenter = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('send'); // 'send' or 'history'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [messageForm, setMessageForm] = useState(emptyForm);

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const response = await messageAPI.getAvailableAdmins();
      setAvailableAdmins(response.data || []);
    } catch (err) {
      console.error('Error fetching admins:', err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoadingHistory(true);
      const response = await messageAPI.getMyMessages();
      setMessages(response.data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'history') {
        fetchMessages();
      } else if (activeTab === 'send') {
        fetchAdmins();
      }
    }
  }, [isOpen, activeTab]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageForm.subject.trim() || !messageForm.message.trim()) {
      setError('Add a subject and a message.');
      return;
    }
    if (!messageForm.sendToAllAdmins && messageForm.targetAdmins.length === 0) {
      setError('Pick at least one admin, or send to all admins.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const messageData = {
        subject: messageForm.subject.trim(),
        message: messageForm.message.trim(),
        priority: messageForm.priority,
        category: messageForm.category,
      };
      if (!messageForm.sendToAllAdmins) {
        messageData.targetAdmins = messageForm.targetAdmins;
      }

      const response = await messageAPI.sendMessage(messageData);
      if (response.success) {
        const count = messageForm.targetAdmins.length;
        const targetText = messageForm.sendToAllAdmins ? 'all admins' : count === 1 ? '1 admin' : `${count} admins`;
        setSuccess(`Message sent to ${targetText}. Replies show up under Sent messages.`);
        setMessageForm(emptyForm);
      }
    } catch (err) {
      setError(err.message || 'Message not sent. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setMessageForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const toggleAdmin = (id, checked) =>
    handleInputChange(
      'targetAdmins',
      checked ? [...messageForm.targetAdmins, id] : messageForm.targetAdmins.filter((a) => a !== id)
    );

  const canSend = messageForm.subject.trim() && messageForm.message.trim();

  return (
    <Dialog open={isOpen} onClose={onClose} title="Messages" description="Ask an admin about pay, attendance or anything else.">
      <Tabs
        className="-mt-2 mb-5"
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'send', label: 'New message' },
          { key: 'history', label: 'Sent messages' },
        ]}
      />

      {error && <Alert className="mb-4">{error}</Alert>}
      {success && <Alert tone="success" className="mb-4">{success}</Alert>}

      {activeTab === 'send' && (
        <form onSubmit={handleSendMessage} className="space-y-5">
          <Field label="Subject" htmlFor="msg-subject" hint={`${messageForm.subject.length}/200`}>
            <Input
              id="msg-subject"
              value={messageForm.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="e.g. Fine on 2 Nov looks wrong"
              maxLength={200}
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Topic" htmlFor="msg-category">
              <Select id="msg-category" value={messageForm.category} onChange={(e) => handleInputChange('category', e.target.value)}>
                <option value="general">General</option>
                <option value="technical">Technical support</option>
                <option value="hr">HR</option>
                <option value="payroll">Pay and salary</option>
                <option value="attendance">Attendance</option>
              </Select>
            </Field>
            <Field label="Priority" htmlFor="msg-priority">
              <Select id="msg-priority" value={messageForm.priority} onChange={(e) => handleInputChange('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </Field>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-ink mb-2">Send to</legend>
            <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={messageForm.sendToAllAdmins}
                onChange={(e) => handleInputChange('sendToAllAdmins', e.target.checked)}
                className="w-4 h-4 rounded border-line accent-ink"
              />
              All admins
            </label>

            {!messageForm.sendToAllAdmins && (
              <div className="mt-3">
                {loadingAdmins ? (
                  <p className="text-sm text-muted">Loading admins…</p>
                ) : availableAdmins.length === 0 ? (
                  <p className="text-sm text-muted">No admins are available right now.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-line divide-y divide-line">
                    {availableAdmins.map((admin) => (
                      <label key={admin._id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-paper">
                        <input
                          type="checkbox"
                          checked={messageForm.targetAdmins.includes(admin._id)}
                          onChange={(e) => toggleAdmin(admin._id, e.target.checked)}
                          className="w-4 h-4 rounded border-line accent-ink"
                        />
                        <span className="text-ink">{admin.username}</span>
                        {admin.email && <span className="text-muted truncate">{admin.email}</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </fieldset>

          <Field label="Message" htmlFor="msg-body" hint={`${messageForm.message.length}/1000`}>
            <Textarea
              id="msg-body"
              value={messageForm.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Include dates and amounts so an admin can check quickly."
              rows={5}
              maxLength={1000}
              required
            />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" icon={Send} disabled={loading || !canSend}>
              {loading ? 'Sending…' : 'Send message'}
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'history' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchMessages} disabled={loadingHistory}>
              Refresh
            </Button>
          </div>

          {loadingHistory ? (
            <p className="py-8 text-sm text-muted">Loading messages…</p>
          ) : messages.length === 0 ? (
            <div className="py-8 text-sm">
              <p className="text-ink font-medium">No messages yet</p>
              <p className="text-muted mt-1">Messages you send to admins, and their replies, appear here.</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => setActiveTab('send')}>
                Write a message
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {messages.map((message) => (
                <li key={message._id} className="rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-ink">{message.subject}</h3>
                      <p className="text-xs text-muted mt-0.5">{formatDate(message.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(message.priority === 'high' || message.priority === 'urgent') && (
                        <Badge tone={priorityTone[message.priority]}>
                          {message.priority === 'urgent' ? 'Urgent' : 'High priority'}
                        </Badge>
                      )}
                      <Badge tone={statusTone[message.status] || 'neutral'}>{statusLabel[message.status] || message.status}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft whitespace-pre-line">{message.message}</p>

                  {message.adminResponse && (
                    <div className="mt-3 rounded-lg bg-paper border-l-2 border-present px-3 py-2.5">
                      <p className="text-xs text-muted">
                        Reply from admin, {formatDate(message.adminResponse.respondedAt)}
                      </p>
                      <p className="mt-1 text-sm text-ink whitespace-pre-line">{message.adminResponse.message}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  );
};

export default MessageCenter;
