import React, { useEffect, useState } from 'react';
import { ConversationList, Conversation } from "@chatscope/chat-ui-kit-react";

const Sidebar = ({ setSelectedConversation }) => {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    fetch('/api/conversations')
      .then(response => response.json())
      .then(data => setConversations(data));
  }, []);

  return (
    <div style={{ width: "300px", backgroundColor: "#2f3136", color: "white" }}>
      <ConversationList>
        {conversations.map(convo => (
          <Conversation 
            key={convo.id} 
            name={convo.name} 
            info={convo.lastMessage} 
            onClick={() => setSelectedConversation(convo)}
          />
        ))}
      </ConversationList>
    </div>
  );
};

export default Sidebar;

