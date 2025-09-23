import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, X, AlertCircle, CheckCircle, Clock, 
  Send, Eye, Filter, RefreshCw, User, Calendar,
  AlertTriangle, Flag, ArrowRight, MessageCircle
} from 'lucide-react';
import { messageAPI } from '../../utils/api';

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
  }, [isOpen, filters]);

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
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-7xl mx-auto max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Admin Message Center</h2>
              <p className="text-sm text-blue-200/80">
                Employee messages and support requests
                {stats && (
                  <span className="ml-2 text-orange-300">
                    ({stats.urgentMessages} urgent)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Messages List */}
          <div className="w-1/2 border-r border-white/10 flex flex-col">
            
            {/* Filters */}
            <div className="p-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3 mb-3">
                <Filter className="w-4 h-4 text-blue-300" />
                <span className="text-sm font-medium text-white">Filters</span>
                <button
                  onClick={fetchMessages}
                  disabled={loading}
                  className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 text-blue-300 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                >
                  <option value="" className="bg-gray-800">All Status</option>
                  <option value="unread" className="bg-gray-800">Unread</option>
                  <option value="read" className="bg-gray-800">Read</option>
                  <option value="responded" className="bg-gray-800">Responded</option>
                  <option value="resolved" className="bg-gray-800">Resolved</option>
                </select>
                
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                >
                  <option value="" className="bg-gray-800">All Categories</option>
                  <option value="general" className="bg-gray-800">General</option>
                  <option value="technical" className="bg-gray-800">Technical</option>
                  <option value="hr" className="bg-gray-800">HR</option>
                  <option value="payroll" className="bg-gray-800">Payroll</option>
                  <option value="attendance" className="bg-gray-800">Attendance</option>
                </select>
                
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({...filters, priority: e.target.value})}
                  className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                >
                  <option value="" className="bg-gray-800">All Priority</option>
                  <option value="urgent" className="bg-gray-800">Urgent</option>
                  <option value="high" className="bg-gray-800">High</option>
                  <option value="medium" className="bg-gray-800">Medium</option>
                  <option value="low" className="bg-gray-800">Low</option>
                </select>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto">
              {error && (
                <div className="m-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="m-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm">
                  {success}
                </div>
              )}

              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-blue-300">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      onClick={() => {
                        setSelectedMessage(message);
                        handleMarkAsRead(message._id);
                        setError('');
                        setSuccess('');
                      }}
                      className={`p-4 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${
                        selectedMessage?._id === message._id ? 'bg-blue-500/10 border-blue-500/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {message.isUrgent && (
                              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            )}
                            <h4 className="text-white font-medium text-sm truncate">
                              {message.subject}
                            </h4>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                            <User className="w-3 h-3" />
                            <span>
                              {message.senderDetails 
                                ? `${message.senderDetails.firstName} ${message.senderDetails.lastName} (${message.senderDetails.employeeId})`
                                : (message.from?.username || 'Unknown User')
                              }
                            </span>
                          </div>
                          
                          <p className="text-gray-300 text-xs" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {message.message}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1 ml-2">
                          <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(message.priority)}`}>
                            {message.priority}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(message.status)}`}>
                            {message.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(message.createdAt)}
                        </span>
                        <span className="capitalize">{message.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Message Detail */}
          <div className="w-1/2 flex flex-col">
            {selectedMessage ? (
              <>
                {/* Message Header */}
                <div className="p-6 border-b border-white/10 bg-white/5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {selectedMessage.subject}
                      </h3>
                      <div className="text-sm text-gray-300 space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>
                            {selectedMessage.senderDetails 
                              ? `${selectedMessage.senderDetails.firstName} ${selectedMessage.senderDetails.lastName}`
                              : (selectedMessage.from?.username || 'Unknown User')
                            }
                          </span>
                        </div>
                        {selectedMessage.senderDetails && (
                          <>
                            <div>ID: {selectedMessage.senderDetails.employeeId}</div>
                            <div>Department: {selectedMessage.senderDetails.department}</div>
                            <div>Position: {selectedMessage.senderDetails.position}</div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded text-sm border ${getPriorityColor(selectedMessage.priority)}`}>
                          {selectedMessage.priority}
                        </span>
                        <span className={`px-3 py-1 rounded text-sm border ${getStatusColor(selectedMessage.status)}`}>
                          {selectedMessage.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(selectedMessage.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Message:</h4>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <p className="text-white whitespace-pre-wrap">{selectedMessage.message}</p>
                    </div>
                  </div>

                  {/* Existing Response */}
                  {selectedMessage.adminResponse && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Your Response:</h4>
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <p className="text-white whitespace-pre-wrap">{selectedMessage.adminResponse.message}</p>
                        <div className="text-xs text-gray-400 mt-2">
                          Responded on {formatDate(selectedMessage.adminResponse.respondedAt)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Response Form */}
                  {selectedMessage.status !== 'resolved' && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">
                        {selectedMessage.adminResponse ? 'Add Follow-up Response:' : 'Send Response:'}
                      </h4>
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Type your response here..."
                        rows={4}
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-6 border-t border-white/10 bg-white/5">
                  <div className="flex justify-between">
                    <div>
                      {selectedMessage.status !== 'resolved' && (
                        <button
                          onClick={() => handleResolve(selectedMessage._id)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark as Resolved
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      {selectedMessage.status !== 'resolved' && responseText.trim() && (
                        <button
                          onClick={() => handleRespond(selectedMessage._id)}
                          disabled={sendingResponse}
                          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                          {sendingResponse ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Send Response
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a message to view details</p>
                  <p className="text-sm">Choose a message from the list to respond</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMessageCenter;