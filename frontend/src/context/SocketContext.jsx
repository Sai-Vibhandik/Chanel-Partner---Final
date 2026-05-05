import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotification, setToastNotification] = useState(null);
  const { user } = useAuth();

  // Fetch initial unread count from API
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      let endpoint = '/chat/unread-count';
      if (user.role === 'partner') {
        endpoint = '/chat/my-unread-count';
      }

      const response = await api.get(endpoint);
      const count = user.role === 'partner'
        ? response.data.data.total
        : response.data.data.unreadCount;

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error.message);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      setUnreadCount(0);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      // Fetch initial unread count when connected
      fetchUnreadCount();
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
    });

    // Handle incoming chat notifications
    newSocket.on('chat-notification', (data) => {
      console.log('New chat notification:', data);
      setUnreadCount(prev => prev + 1);

      // Show toast notification
      const senderName = data.adminName || data.partnerName || 'Someone';
      const messagePreview = data.message?.message?.substring(0, 50) || 'New message';
      setToastNotification({
        id: Date.now(),
        senderName,
        message: messagePreview,
        partnershipId: data.partnershipId,
        adminType: data.adminType
      });

      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification('New Message', {
          body: `${senderName}: ${messagePreview}...`,
          icon: '/favicon.ico'
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, fetchUnreadCount]);

  // Join a conversation room
  // Note: Socket.IO will queue events if not connected yet
  const joinConversation = useCallback((partnershipId, adminType) => {
    if (socket) {
      socket.emit('join-conversation', { partnershipId, adminType });
    }
  }, [socket]);

  // Leave a conversation room
  const leaveConversation = useCallback((partnershipId, adminType) => {
    if (socket) {
      socket.emit('leave-conversation', { partnershipId, adminType });
    }
  }, [socket]);

  // Send a message
  const sendMessage = useCallback((partnershipId, adminType, message, attachments = []) => {
    if (socket) {
      socket.emit('send-message', { partnershipId, adminType, message, attachments });
    }
  }, [socket]);

  // Mark messages as read
  const markAsRead = useCallback((partnershipId, adminType) => {
    if (socket) {
      socket.emit('mark-read', { partnershipId, adminType });
    }
  }, [socket]);

  // Start typing indicator
  const startTyping = useCallback((partnershipId, adminType) => {
    if (socket) {
      socket.emit('typing-start', { partnershipId, adminType });
    }
  }, [socket]);

  // Stop typing indicator
  const stopTyping = useCallback((partnershipId, adminType) => {
    if (socket) {
      socket.emit('typing-stop', { partnershipId, adminType });
    }
  }, [socket]);

  // Subscribe to new messages
  const onNewMessage = useCallback((callback) => {
    if (socket) {
      socket.on('new-message', callback);
      return () => socket.off('new-message', callback);
    }
  }, [socket]);

  // Subscribe to typing indicators
  const onTyping = useCallback((callback) => {
    if (socket) {
      socket.on('user-typing', callback);
      return () => socket.off('user-typing', callback);
    }
  }, [socket]);

  const onStopTyping = useCallback((callback) => {
    if (socket) {
      socket.on('user-stopped-typing', callback);
      return () => socket.off('user-stopped-typing', callback);
    }
  }, [socket]);

  // Subscribe to messages read event
  const onMessagesRead = useCallback((callback) => {
    if (socket) {
      socket.on('messages-read', callback);
      return () => socket.off('messages-read', callback);
    }
  }, [socket]);

  // Reset unread count (when opening chat)
  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Dismiss toast notification
  const dismissToast = useCallback(() => {
    setToastNotification(null);
  }, []);

  // Refresh unread count from server
  const refreshUnreadCount = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const value = {
    socket,
    isConnected,
    unreadCount,
    toastNotification,
    joinConversation,
    leaveConversation,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    onNewMessage,
    onTyping,
    onStopTyping,
    onMessagesRead,
    resetUnreadCount,
    dismissToast,
    refreshUnreadCount
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;