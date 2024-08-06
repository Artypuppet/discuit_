import React, { useEffect, useState } from 'react';
import {
  ConversationList,
  Conversation,
  ConversationHeader,
  SideBar,
} from '@chatscope/chat-ui-kit-react';

const ChatSidebar = ({
  setSelectedConversation,
  conversations,
  user,
  newConv,
  setNewConv,
  messages,
}) => {
  // this function removes any newConv that doesn't have any messages
  const removeNewConv = (convo) => {
    if (newConv && messages.length == 0) {
      for (let i = 0; i < conversations.length; i++) {
        if (newConv.user1Id == conversations[i] && newConv.user2Id == conversations[i].user2Id) {
          conversations.splice(i, 1);
          setNewConv(null);
          break;
        }
      }
    }
    setSelectedConversation(convo);
  };
  return (
    <div style={{ width: '300px', backgroundColor: '#2f3136' }}>
      <ConversationHeader>
        <ConversationHeader.Content>{user.username}</ConversationHeader.Content>
      </ConversationHeader>
      <ConversationList>
        {conversations.map((convo, index) => (
          <Conversation
            key={index}
            name={`${user.id == convo.user1Id ? convo.username2 : convo.username1}`}
            lastActivityTime={convo.startedAt.toLocaleTimeString()}
            onClick={() => removeNewConv(convo)}
          ></Conversation>
        ))}
      </ConversationList>
    </div>
  );
};

export default ChatSidebar;
