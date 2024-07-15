import React from 'react';
import Sidebar from './ChatSideBar';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput
} from "@chatscope/chat-ui-kit-react";
import styles from "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";

const ChatInterface = () => {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <MainContainer>
        <ChatContainer>
          <MessageList>
            <Message model={{ message: "Hello, how can I help you?", sentTime: "just now", sender: "Support" }} />
            <Message model={{ message: "I need assistance with my account.", sentTime: "just now", sender: "User" }} />
          </MessageList>
          <MessageInput placeholder="Type your message here..." />
        </ChatContainer>
      </MainContainer>
    </div>
  );
};

export default ChatInterface;
