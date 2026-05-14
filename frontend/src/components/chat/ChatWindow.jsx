import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import api from '../../utils/api';

const ChatWindow = ({ partnershipId, adminType, currentUser, otherUserName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const isMounted = useRef(true);

  const {
    joinConversation,
    leaveConversation,
    markAsRead,
    startTyping,
    stopTyping,
    onNewMessage,
    onTyping,
    onStopTyping
  } = useSocket();

  // Mark messages as read via REST API (more reliable than socket)
  const markMessagesAsRead = useCallback(async () => {
    try {
      await api.put(`/chat/conversations/${partnershipId}/${adminType}/read`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [partnershipId, adminType]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!partnershipId || !adminType) {
      console.log('ChatWindow: Missing partnershipId or adminType');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('ChatWindow: Fetching messages for', partnershipId, adminType);
      const res = await api.get(`/chat/conversations/${partnershipId}/${adminType}`);
      console.log('ChatWindow: Messages response', res.data);
      if (isMounted.current) {
        setMessages(res.data.data?.messages || []);
      }
    } catch (error) {
      console.error('ChatWindow: Error fetching messages:', error);
      if (isMounted.current) {
        setError('Failed to load messages');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [partnershipId, adminType]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Join conversation when socket is connected
  useEffect(() => {
    if (partnershipId && adminType) {
      // Join the conversation room (socket will queue if not connected)
      joinConversation(partnershipId, adminType);
      // Mark messages as read via socket (for real-time)
      markAsRead(partnershipId, adminType);
      // Also mark via REST API (for reliability)
      markMessagesAsRead();

      return () => {
        leaveConversation(partnershipId, adminType);
      };
    }
  }, [partnershipId, adminType, joinConversation, leaveConversation, markAsRead, markMessagesAsRead]);

  // Fetch messages when partnershipId or adminType changes
  useEffect(() => {
    if (partnershipId && adminType) {
      fetchMessages();
    }
  }, [partnershipId, adminType, fetchMessages]);

  // Subscribe to socket events
  useEffect(() => {
    if (!partnershipId || !adminType) return;

    // New message handler
    let unsubscribeNewMessage = null;
    let unsubscribeTyping = null;
    let unsubscribeStopTyping = null;

    // Subscribe to new messages
    const unsubMsg = onNewMessage((data) => {
      if (data.message.partnershipId === partnershipId && data.message.adminType === adminType) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m._id === data.message._id)) {
            return prev;
          }
          return [...prev, data.message];
        });
        // Mark messages as read when receiving in open conversation
        markAsRead(partnershipId, adminType);
        markMessagesAsRead();
      }
    });
    if (typeof unsubMsg === 'function') unsubscribeNewMessage = unsubMsg;

    // Typing handler
    const unsubTyping = onTyping((data) => {
      if (data.partnershipId === partnershipId && data.adminType === adminType) {
        setTypingUser(data.userName);
        // Clear typing after 3 seconds
        setTimeout(() => setTypingUser(null), 3000);
      }
    });
    if (typeof unsubTyping === 'function') unsubscribeTyping = unsubTyping;

    const unsubStopTyping = onStopTyping((data) => {
      if (data.partnershipId === partnershipId && data.adminType === adminType) {
        setTypingUser(null);
      }
    });
    if (typeof unsubStopTyping === 'function') unsubscribeStopTyping = unsubStopTyping;

    return () => {
      if (unsubscribeNewMessage) unsubscribeNewMessage();
      if (unsubscribeTyping) unsubscribeTyping();
      if (unsubscribeStopTyping) unsubscribeStopTyping();
    };
  }, [partnershipId, adminType, onNewMessage, onTyping, onStopTyping, markAsRead, markMessagesAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing indicator
  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    // Emit typing start
    startTyping(partnershipId, adminType);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(partnershipId, adminType);
    }, 2000);
  };

  // Handle file selection
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploadingFile(true);

    try {
      const uploadedFiles = [];

      for (const file of files) {
        // Determine file type for display
        let fileType = 'document';
        if (file.type.startsWith('image/')) {
          fileType = 'image';
        } else if (file.type.startsWith('video/')) {
          fileType = 'video';
        }

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload to chat endpoint
        const res = await api.post('/upload/chat', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        uploadedFiles.push({
          name: file.name,
          url: res.data.data?.url || res.data.url,
          type: fileType,
          size: file.size
        });
      }

      setAttachments(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0) || sending) return;

    setSending(true);
    stopTyping(partnershipId, adminType);

    try {
      // Send via REST API
      const res = await api.post(`/chat/conversations/${partnershipId}/${adminType}/send`, {
        message: newMessage.trim(),
        attachments: attachments
      });

      // Add message to local state if not added via socket
      setMessages(prev => {
        if (prev.some(m => m._id === res.data.data.message._id)) {
          return prev;
        }
        return [...prev, res.data.data.message];
      });

      setNewMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Format time
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date
  const formatDate = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500 text-sm">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <button
            onClick={fetchMessages}
            className="text-indigo-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>No messages yet</p>
              <p className="text-sm mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Divider */}
            <div className="flex items-center justify-center my-4">
              <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                {date}
              </span>
            </div>

            {/* Messages for this date */}
            {dateMessages.map((message, index) => {
              const senderId = message.sender?.userId?._id;
              const currentUserId = currentUser?._id;
              const isOwn = senderId && currentUserId && (
                senderId === currentUserId ||
                senderId.toString() === currentUserId.toString()
              );

              return (
                <div
                  key={message._id || index}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
                >
                  <div className={`max-w-[70%] ${isOwn ? 'order-1' : ''}`}>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwn
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-900 shadow-sm'
                      }`}
                    >
                      {/* Sender name (for group chats) */}
                      {!isOwn && (
                        <p className="text-xs font-medium text-indigo-600 mb-1">
                          {message.sender?.userId?.firstName || 'User'}
                        </p>
                      )}

                      {/* Message content */}
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>

                      {/* Attachments */}
                      {message.attachments?.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment, i) => (
                            <div key={i}>
                              {attachment.type === 'image' ? (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={attachment.url}
                                    alt={attachment.name}
                                    className="max-w-full rounded-lg max-h-48 object-cover"
                                  />
                                </a>
                              ) : attachment.type === 'video' ? (
                                <video
                                  src={attachment.url}
                                  controls
                                  className="max-w-full rounded-lg max-h-48"
                                />
                              ) : (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-1 text-xs underline ${isOwn ? 'text-indigo-200' : 'text-indigo-600'}`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  {attachment.name}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Time and read status */}
                      <p className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {formatTime(message.createdAt)}
                        {isOwn && message.readAt && (
                          <span className="ml-1">✓✓</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))
        )}

        {/* Typing indicator */}
        {typingUser && (
          <div className="flex justify-start mb-2">
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
              <p className="text-xs text-gray-500 italic">
                {typingUser} is typing...
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <div className="border-t bg-gray-50 p-3">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="relative bg-white rounded-lg border p-2 flex items-center gap-2">
                {attachment.type === 'image' ? (
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{attachment.name}</p>
                  <p className="text-xs text-gray-500">
                    {attachment.size < 1024 * 1024
                      ? `${Math.round(attachment.size / 1024)} KB`
                      : `${Math.round(attachment.size / (1024 * 1024))} MB`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="border-t bg-white p-4">
        <div className="flex items-center gap-3">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
          />

          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile || sending}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Attach file"
          >
            {uploadingFile ? (
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>

          {/* Text input */}
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={sending}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={(!newMessage.trim() && attachments.length === 0) || sending}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;