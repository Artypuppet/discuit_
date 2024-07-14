
import React from 'react';
import { ConversationList, Conversation } from "@chatscope/chat-ui-kit-react";

const Sidebar = () => {
  return (
    <div style={{ width: "300px", backgroundColor: "#2f3136", color: "white" }}>
      <ConversationList>
        <Conversation name="Support" info="Last message info" />
        <Conversation name="User1" info="Last message info" />
        {/* place holder */}
      </ConversationList>
    </div>
  );
};

export default Sidebar;
