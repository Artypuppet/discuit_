import React, { useState, useEffect } from 'react';
import ChatSidebar from './ChatSideBar';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
} from '@chatscope/chat-ui-kit-react';
import { useDispatch, useSelector } from 'react-redux';
import { convAdded, convsAdded, convMessageAdded } from '../slices/conversationsSlice';
import { useWebSocket } from '../WebSocketContext';
import { useLocation } from 'react-router-dom';

const ChatInterface = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector((state) => state.main.user);
  const conversations = useSelector((state) => state.convs.convsList);
  const socket = useWebSocket();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newConv, setNewConv] = useState(location.state || null);

  useEffect(() => {
    (async function () {
      if (selectedConversation && !newConv) {
        const resp = await fetch(`/api/conversations/${selectedConversation.id}`);
        const messages = await resp.json();
        console.log(messages);
        setMessages(messages);
      }
    })();
  }, [selectedConversation]);

  // set the selected conversation as the newConv.
  useEffect(() => {
    if (newConv) {
      setSelectedConversation(newConv);
      dispatch(convAdded(newConv));
    }
  }, []);

  socket.onmessage = (event) => {
    const newMessage = event.data;
    console.log(newMessage);
    if (newMessage.type == 'New Conv') {
      dispatch(convAdded(newMessage.conv));
    } else if (newMessage.type == 'New Msg') {
      setMessages((prevMessages) => [...prevMessages, newMessage.msg]);
    }
  };

  const sendMessage = async (message) => {
    // Since we remove the newConv if the user doesn't send a message, we can be sure that
    // if the newConv is not null then the message sent has to belong to the newConv.
    if (newConv) {
      const postObj = {
        method: 'POST', // Specify the request method as POST
        headers: {
          'Content-Type': 'application/json', // Specify the content type
        },
        body: JSON.stringify({ starterId: newConv.starterId, targetId: newConv.targetId }), // Convert the data to a JSON string
      };
      const resp = await fetch(`api/users/${user.username}/convs`, postObj);
      const conv = await resp.json(); // get the body which represents the new conv.

      // remove the old newConv object.
      for (let i = 0; i < conversations.length; i++) {
        if (newConv.user1Id == conversations[i] && newConv.user2Id == conversations[i].user2Id) {
          conversations.splice(i, 1);
          break;
        }
      }
      // update our conversations list
      dispatch(convAdded(conv));
      // setting selected conv to returned conv object.
      setSelectedConversation(conv);
      // set the newConv to null as this conv is in our database.
      // done at last to avoid making a fetch call to get an empty list of conversations.
      setNewConv(null);
    }

    const newMessage = {
      convId: selectedConversation.id,
      senderId: user.id,
      receiverId:
        user.id == selectedConversation.user1Id
          ? selectedConversation.user2Id
          : selectedConversation.user1Id,
      body: message,
    };
    socket.send(JSON.stringify(newMessage));
  };

  return (
    <div className="flex-container">
      <ChatSidebar
        className="chat-sidebar"
        setSelectedConversation={setSelectedConversation}
        conversations={conversations}
        user={user}
        newConv={newConv}
        messages={messages}
        setNewConv={setNewConv}
      />
      {selectedConversation ? (
        <MainContainer className="main-container">
          <ChatContainer className="chat-container">
            <MessageList className="message-list">
              {messages.map((msg, index) => (
                <Message
                  key={index}
                  model={{
                    message: msg.body,
                    sentTime: msg.sentAt,
                    sender:
                      msg.senderId == selectedConversation.user1Id
                        ? selectedConversation.username1
                        : selectedConversation.username2,
                    direction: msg.senderId == user.id ? 1 : 0,
                  }}
                />
              ))}
            </MessageList>
            <MessageInput
              className="message-input"
              placeholder="Type your message here..."
              onSend={sendMessage}
            />
          </ChatContainer>
        </MainContainer>
      ) : (
        <div>Select a conversation to see messages.</div>
      )}
    </div>
  );
};

export default ChatInterface;
