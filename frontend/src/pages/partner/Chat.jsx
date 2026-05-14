import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import ChatWindow from '../../components/chat/ChatWindow';
import api from '../../utils/api';

const PartnerChat = () => {
  const { user } = useAuth();
  const config = sidebarConfig.partner;
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const { onNewMessage, decrementUnreadCount, socket } = useSocket();

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/chat/my-conversations');
      setConversations(res.data.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Listen for new messages to update conversation list
  useEffect(() => {
    const unsubscribe = onNewMessage?.((data) => {
      // Check if the current user sent this message
      const isOwnMessage = data.message?.sender?.userId?._id === user?._id ||
                          data.message?.sender?.userId === user?._id;

      // Only update if not currently viewing this conversation
      const isViewingConversation = selectedConversation?.partnership?._id === data.message?.partnershipId &&
                                    selectedConversation?.adminType === data.message?.adminType;

      if (!isViewingConversation) {
        // Update the conversation list to show new message
        setConversations(prev => {
          const updatedConversations = prev.map(conv => {
            if (conv.partnership?._id === data.message?.partnershipId && conv.adminType === data.message?.adminType) {
              return {
                ...conv,
                lastMessage: data.message,
                // Only increment unread if message is from someone else
                unreadCount: isOwnMessage ? conv.unreadCount : (conv.unreadCount || 0) + 1
              };
            }
            return conv;
          });
          // Sort by last message date (most recent first)
          return updatedConversations.sort((a, b) => {
            const aDate = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : new Date(0);
            const bDate = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : new Date(0);
            return bDate - aDate;
          });
        });
      } else {
        // Update the conversation list with new message but don't increment unread
        setConversations(prev => {
          const updatedConversations = prev.map(conv => {
            if (conv.partnership?._id === data.message?.partnershipId && conv.adminType === data.message?.adminType) {
              return {
                ...conv,
                lastMessage: data.message
              };
            }
            return conv;
          });
          return updatedConversations.sort((a, b) => {
            const aDate = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : new Date(0);
            const bDate = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : new Date(0);
            return bDate - aDate;
          });
        });
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [onNewMessage, selectedConversation, user?._id]);

  // Listen for chat notifications (when not in the conversation)
  useEffect(() => {
    if (!socket) return;

    const handleChatNotification = (data) => {
      // chat-notification is only sent to the OTHER party, so we don't need to check isOwnMessage
      // But we should still check if we're currently viewing this conversation
      const isViewingConversation = selectedConversation?.partnership?._id === data.partnershipId &&
                                    selectedConversation?.adminType === data.adminType;

      if (!isViewingConversation) {
        // Update the conversation list to show new message and increment unread
        setConversations(prev => {
          const updatedConversations = prev.map(conv => {
            if (conv.partnership?._id === data.partnershipId && conv.adminType === data.adminType) {
              return {
                ...conv,
                lastMessage: data.message,
                unreadCount: (conv.unreadCount || 0) + 1
              };
            }
            return conv;
          });
          // Sort by last message date (most recent first)
          return updatedConversations.sort((a, b) => {
            const aDate = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : new Date(0);
            const bDate = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : new Date(0);
            return bDate - aDate;
          });
        });
      }
    };

    socket.on('chat-notification', handleChatNotification);
    return () => {
      socket.off('chat-notification', handleChatNotification);
    };
  }, [socket, selectedConversation]);

  // Handle selecting a conversation - clear unread count immediately
  const handleSelectConversation = useCallback((conv) => {
    // Get unread count before clearing
    const unreadCount = conv.unreadCount || 0;

    // Immediately clear unread in the conversation list
    setConversations(prev => prev.map(c => {
      if (c.partnership?._id === conv.partnership?._id && c.adminType === conv.adminType) {
        return { ...c, unreadCount: 0 };
      }
      return c;
    }));

    // Decrement the total unread count in sidebar
    if (unreadCount > 0) {
      decrementUnreadCount(unreadCount);
    }

    setSelectedConversation(conv);
  }, [decrementUnreadCount]);

  // Handle query params for direct navigation
  useEffect(() => {
    const partnershipId = searchParams.get('partnershipId');
    const adminType = searchParams.get('adminType');

    if (partnershipId && adminType && conversations.length > 0) {
      // Find and select the conversation
      const conversation = conversations.find(
        conv => conv.partnership?._id === partnershipId && conv.adminType === adminType
      );
      if (conversation) {
        setSelectedConversation(conversation);
        // Clear the query params
        setSearchParams({});
      }
    }
  }, [searchParams, conversations]);

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  // Group conversations by company
  const groupedByCompany = conversations.reduce((groups, conv) => {
    const companyId = conv.partnership?.company?._id;
    if (!groups[companyId]) {
      groups[companyId] = {
        company: conv.partnership?.company,
        conversations: []
      };
    }
    groups[companyId].conversations.push(conv);
    return groups;
  }, {});

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title="Chat"
      subtitle="Chat with company admins"
      color={config.color}
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-200px)] flex overflow-hidden">
        {/* Conversation List */}
        <div className={`w-full md:w-80 border-r flex-shrink-0 h-full ${
          selectedConversation ? 'hidden md:block' : 'block'
        }`}>
          <div className="h-full overflow-y-auto flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No conversations available</p>
                <p className="text-sm mt-1">You need an active partnership to chat</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {Object.entries(groupedByCompany).map(([companyId, group]) => (
                  <div key={companyId} className="border-b">
                    {/* Company Header */}
                    <div className="px-4 py-2 bg-gray-50 border-b">
                      <h4 className="font-medium text-gray-700">
                        {group.company?.name || 'Unknown Company'}
                      </h4>
                    </div>

                    {/* Conversations for this company */}
                    {group.conversations.map((conv) => {
                      const isSelected = selectedConversation?.partnership?._id === conv.partnership?._id &&
                                        selectedConversation?.adminType === conv.adminType;
                      const hasUnread = conv.unreadCount > 0;

                      return (
                        <div
                          key={`${conv.partnership._id}-${conv.adminType}`}
                          onClick={() => handleSelectConversation(conv)}
                          className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                              conv.adminType === 'company_superadmin' ? 'bg-indigo-600' : 'bg-teal-600'
                            }`}>
                              {conv.adminType === 'company_superadmin' ? 'SA' : 'PM'}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className={`font-medium truncate ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {conv.label}
                                </h3>
                                {conv.lastMessage && (
                                  <span className={`text-xs ${hasUnread ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                                    {new Date(conv.lastMessage.createdAt).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between mt-1">
                                <p className={`text-sm truncate ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                  {conv.lastMessage ? (
                                    <>
                                      {conv.lastMessage.sender.type === 'partner' ? 'You: ' : ''}
                                      {conv.lastMessage.message?.substring(0, 40)}
                                      {conv.lastMessage.message?.length > 40 ? '...' : ''}
                                    </>
                                  ) : (
                                    'No messages yet'
                                  )}
                                </p>

                                {hasUnread && (
                                  <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col ${
          selectedConversation ? 'flex' : 'hidden md:flex'
        }`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="border-b p-4 flex items-center gap-3 bg-white">
                <button
                  onClick={handleBackToList}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                  selectedConversation.adminType === 'company_superadmin' ? 'bg-indigo-600' : 'bg-teal-600'
                }`}>
                  {selectedConversation.adminType === 'company_superadmin' ? 'SA' : 'PM'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedConversation.label}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.partnership?.company?.name}
                  </p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-hidden">
                <ChatWindow
                  partnershipId={selectedConversation.partnership._id}
                  adminType={selectedConversation.adminType}
                  currentUser={user}
                  otherUserName={selectedConversation.label}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose who you want to chat with</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PartnerChat;