import React, { useState, useEffect } from 'react';
import { 
  Send, MessageCircle, X, AlertCircle, CheckCircle, 
  Clock, MessageSquare, Filter, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { messageAPI } from '../../utils/api';

const MessageCenter = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('send'); // 'send' or 'history'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Form state for sending messages
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
    priority: 'medium',
    category: 'general',
    targetAdmins: [], // Array of admin IDs
    sendToAllAdmins: true // Toggle for all admins vs specific admins
  });

  // Fetch available admins
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

  // Fetch message history
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
      setError('Subject and message are required');
      return;
    }

    // Validate admin selection if not sending to all
    if (!messageForm.sendToAllAdmins && messageForm.targetAdmins.length === 0) {
      setError('Please select at least one admin or choose "Send to All Admins"');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const messageData = {
        subject: messageForm.subject.trim(),
        message: messageForm.message.trim(),
        priority: messageForm.priority,
        category: messageForm.category
      };

      // Add targetAdmins only if not sending to all admins
      if (!messageForm.sendToAllAdmins) {
        messageData.targetAdmins = messageForm.targetAdmins;
      }
      
      const response = await messageAPI.sendMessage(messageData);

      if (response.success) {
        const targetText = messageForm.sendToAllAdmins 
          ? 'all admins' 
          : messageForm.targetAdmins.length === 1 
            ? '1 admin' 
            : `${messageForm.targetAdmins.length} admins`;
        setSuccess(`Message sent successfully to ${targetText}!`);
        
        setMessageForm({
          subject: '',
          message: '',
          priority: 'medium',
          category: 'general',
          targetAdmins: [],
          sendToAllAdmins: true
        });
        
        // Refresh history if on history tab
        if (activeTab === 'history') {
          fetchMessages();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setMessageForm(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError('');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'unread': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'read': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      case 'responded': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'resolved': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <MessageCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Message Center</h2>
              <p className="text-sm text-blue-200/80">Contact admins for support</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'send'
                ? 'text-blue-300 border-b-2 border-blue-400 bg-blue-500/5'
                : 'text-blue-200/70 hover:text-blue-300 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              Send Message
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-blue-300 border-b-2 border-blue-400 bg-blue-500/5'
                : 'text-blue-200/70 hover:text-blue-300 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Message History
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Send Message Tab */}
          {activeTab === 'send' && (
            <form onSubmit={handleSendMessage} className="space-y-6">
              
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={messageForm.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  placeholder="Brief description of your issue"
                  maxLength={200}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  {messageForm.subject.length}/200 characters
                </p>
              </div>

              {/* Priority and Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={messageForm.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="low" className="bg-gray-800">Low</option>
                    <option value="medium" className="bg-gray-800">Medium</option>
                    <option value="high" className="bg-gray-800">High</option>
                    <option value="urgent" className="bg-gray-800">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={messageForm.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="general" className="bg-gray-800">General</option>
                    <option value="technical" className="bg-gray-800">Technical Support</option>
                    <option value="hr" className="bg-gray-800">HR Related</option>
                    <option value="payroll" className="bg-gray-800">Payroll/Salary</option>
                    <option value="attendance" className="bg-gray-800">Attendance</option>
                  </select>
                </div>
              </div>

              {/* Admin Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Send To
                </label>
                
                {/* Send to All Toggle */}
                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={messageForm.sendToAllAdmins}
                      onChange={(e) => handleInputChange('sendToAllAdmins', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500/50"
                    />
                    <span className="text-sm text-gray-300">Send to all admins</span>
                  </label>
                </div>

                {/* Specific Admin Selection */}
                {!messageForm.sendToAllAdmins && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 mb-2">Select specific admins:</p>
                    {loadingAdmins ? (
                      <div className="text-center py-4">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                      </div>
                    ) : availableAdmins.length === 0 ? (
                      <p className="text-sm text-gray-400">No admins available</p>
                    ) : (
                      <div className="max-h-32 overflow-y-auto border border-white/20 rounded-lg bg-white/5 p-2">
                        {availableAdmins.map((admin) => (
                          <label key={admin._id} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={messageForm.targetAdmins.includes(admin._id)}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                const newTargetAdmins = isChecked
                                  ? [...messageForm.targetAdmins, admin._id]
                                  : messageForm.targetAdmins.filter(id => id !== admin._id);
                                handleInputChange('targetAdmins', newTargetAdmins);
                              }}
                              className="w-3 h-3 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500/50"
                            />
                            <span className="text-sm text-gray-300">{admin.username}</span>
                            {admin.email && (
                              <span className="text-xs text-gray-500">({admin.email})</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {!messageForm.sendToAllAdmins && messageForm.targetAdmins.length > 0 && (
                      <p className="text-xs text-blue-300 mt-2">
                        {messageForm.targetAdmins.length} admin{messageForm.targetAdmins.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message *
                </label>
                <textarea
                  value={messageForm.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  placeholder="Describe your issue in detail..."
                  rows={6}
                  maxLength={1000}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  {messageForm.message.length}/1000 characters
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !messageForm.subject.trim() || !messageForm.message.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {messageForm.sendToAllAdmins 
                        ? 'Send to All Admins'
                        : messageForm.targetAdmins.length === 0
                          ? 'Send to Admins'
                          : messageForm.targetAdmins.length === 1
                            ? 'Send to 1 Admin'
                            : `Send to ${messageForm.targetAdmins.length} Admins`
                      }
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Message History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              
              {/* Refresh Button */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Your Messages</h3>
                <button
                  onClick={fetchMessages}
                  disabled={loadingHistory}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-blue-300 transition-colors flex items-center gap-2 text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Messages List */}
              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-blue-300">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages found</p>
                  <p className="text-sm">Send your first message to admins!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      className="bg-white/5 border border-white/10 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1">
                            {message.subject}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="w-3 h-3" />
                            {formatDate(message.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(message.priority)}`}>
                            {message.priority}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(message.status)}`}>
                            {message.status}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-3">
                        {message.message}
                      </p>
                      
                      {message.adminResponse && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-green-400" />
                            </div>
                            <span className="text-sm text-green-400 font-medium">Admin Response</span>
                            <span className="text-xs text-gray-500">
                              {formatDate(message.adminResponse.respondedAt)}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                            {message.adminResponse.message}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageCenter;