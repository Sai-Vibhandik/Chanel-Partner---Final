import { useState, useEffect } from 'react';
import api from '../../utils/api';

const ConversationList = ({ onSelectConversation, selectedPartnershipId, adminType }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchConversations();
  }, [adminType]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/chat/conversations', {
        params: { adminType }
      });
      setConversations(res.data.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv => {
    const partner = conv.partnership?.partner;
    if (!partner) return false;
    const name = `${partner.firstName} ${partner.lastName}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase()) ||
           partner.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Format last message time
  const formatLastMessageTime = (date) => {
    if (!date) return '';
    const messageDate = new Date(date);
    const now = new Date();
    const diff = now - messageDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-4 border-b">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search partners..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const partner = conv.partnership?.partner;
            const lastMessage = conv.lastMessage;
            const isSelected = selectedPartnershipId === conv.partnership?._id;
            const hasUnread = conv.unreadCount > 0;

            return (
              <div
                key={conv.partnership._id}
                onClick={() => onSelectConversation(conv.partnership._id, partner)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                    hasUnread ? 'bg-indigo-600' : 'bg-gray-400'
                  }`}>
                    {partner?.firstName?.charAt(0) || '?'}
                    {partner?.lastName?.charAt(0) || ''}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium truncate ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                        {partner?.firstName} {partner?.lastName}
                      </h3>
                      <span className={`text-xs ${hasUnread ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                        {formatLastMessageTime(lastMessage?.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-sm truncate ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        {lastMessage ? (
                          <>
                            {lastMessage.sender.type === 'admin' ? 'You: ' : ''}
                            {lastMessage.message?.substring(0, 40)}
                            {lastMessage.message?.length > 40 ? '...' : ''}
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

                    {/* Tier badge */}
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                      conv.partnership.tier === 'platinum' ? 'bg-purple-100 text-purple-800' :
                      conv.partnership.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                      conv.partnership.tier === 'silver' ? 'bg-gray-200 text-gray-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {conv.partnership.tier?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;