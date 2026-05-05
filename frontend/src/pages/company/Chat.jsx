import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';

const CompanyChat = () => {
  const { user } = useAuth();
  const config = sidebarConfig.company_superadmin;
  const [selectedPartnership, setSelectedPartnership] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);

  const handleSelectConversation = (partnershipId, partner) => {
    setSelectedPartnership(partnershipId);
    setSelectedPartner(partner);
  };

  const handleBackToList = () => {
    setSelectedPartnership(null);
    setSelectedPartner(null);
  };

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title="Chat"
      subtitle="Chat with your channel partners"
      color={config.color}
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-200px)] flex overflow-hidden">
        {/* Conversation List */}
        <div className={`w-full md:w-80 border-r flex-shrink-0 h-full ${
          selectedPartnership ? 'hidden md:block' : 'block'
        }`}>
          <ConversationList
            onSelectConversation={handleSelectConversation}
            selectedPartnershipId={selectedPartnership}
            adminType="company_superadmin"
          />
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col ${
          selectedPartnership ? 'flex' : 'hidden md:flex'
        }`}>
          {selectedPartnership && selectedPartner ? (
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
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedPartner.firstName?.charAt(0)}
                  {selectedPartner.lastName?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedPartner.firstName} {selectedPartner.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedPartner.email}</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-hidden">
                <ChatWindow
                  partnershipId={selectedPartnership}
                  adminType="company_superadmin"
                  currentUser={user}
                  otherUserName={`${selectedPartner.firstName} ${selectedPartner.lastName}`}
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
                <p className="text-sm mt-1">Choose a partner to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CompanyChat;