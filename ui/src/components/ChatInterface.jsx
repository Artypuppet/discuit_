import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import {
    MainContainer,
    ChatContainer,
    MessageList,
    Message,
    MessageInput
} from "@chatscope/chat-ui-kit-react";
import { useDispatch, useSelector } from 'react-redux';
import { convAdded, convsAdded, convMessageAdded } from '../slices/conversationsSlice';



const ChatInterface = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (selectedConversation) {
      fetch(`/api/conversations/${selectedConversation.id}/messages`)
        .then(response => response.json())
        .then(data => setMessages(data));

      const newSocket = new WebSocket('ws://your-websocket-server');
      newSocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setMessages(prevMessages => [...prevMessages, message]);
      };
      setSocket(newSocket);

      return () => newSocket.close();
    }
  }, [selectedConversation]);

  const sendMessage = (message) => {
    const newMessage = {
      content: message,
      conversationId: selectedConversation.id,
      sender: 'currentUser', // we need to replace this value witht the user id
      sentTime: new Date().toISOString()
    };
    socket.send(JSON.stringify(newMessage));
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar setSelectedConversation={setSelectedConversation} />
      {selectedConversation && (
        <MainContainer>
          <ChatContainer>
            <MessageList>
              {messages.map((msg, index) => (
                <Message key={index} model={{ message: msg.content, sentTime: msg.sentTime, sender: msg.sender }} />
              ))}
            </MessageList>
            <MessageInput placeholder="Type your message here..." onSend={sendMessage} />
          </ChatContainer>
        </MainContainer>
      )}
    </div>
  );
};

export default ChatInterface;
