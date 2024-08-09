import { useDispatch, useSelector } from 'react-redux';
import React, { useEffect, useRef, useState } from 'react';
import { chatOpenToggled } from '../slices/mainSlice';
import { mfetch } from '../helper';
import { ButtonClose } from './Button';
import {
  convAdded,
  newConvAdded,
  removeConv,
  updateHasNewMessage,
} from '../slices/conversationsSlice';
import { useWebSocket } from '../WebSocketContext';
import { isEmpty, mfetchjson } from '../helper';

const Chat = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.main.user);
  const conversations = useSelector((state) => state.convs.convsList);
  const socket = useWebSocket();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const newConv = useSelector((state) => {
    console.log(state);
    return state.convs.newConv;
  });

  useEffect(() => {
    (async function () {
      if (selectedConversation && isEmpty(newConv)) {
        try {
          const messages = await mfetchjson(
            `/api/users/${user.username}/convs/${selectedConversation.id}`
          );
          console.log(messages);
          setMessages(messages);
        } catch (error) {
          console.log(error);
          setMessages([]);
        }
      }
    })();
  }, [selectedConversation]);

  // set the selected conversation as the newConv.
  useEffect(() => {
    if (!isEmpty(newConv)) {
      setSelectedConversation(newConv);
      dispatch(convAdded(newConv));
    }
  }, []);

  socket.onmessage = (event) => {
    const newMessage = JSON.parse(event.data);
    console.log(newMessage);
    if (newMessage.type === 'New Conv') {
      dispatch(convAdded(newMessage.conv));
    } else if (newMessage.type === 'New Msg') {
      if (selectedConversation && newMessage.msg.convId === selectedConversation.id) {
        setMessages((prevMessages) => [...prevMessages, newMessage.msg]);
      } else {
        dispatch(updateHasNewMessage(newMessage.msg));
      }
    }
  };

  const sendMessage = async (message) => {
    // Since we remove the newConv if the user doesn't send a message, we can be sure that
    // if the newConv is not null then the message sent has to belong to the newConv.
    if (!isEmpty(newConv)) {
      const postObj = {
        method: 'POST', // Specify the request method as POST
        headers: {
          'Content-Type': 'application/json', // Specify the content type
        },
        body: JSON.stringify({ starterId: newConv.starterId, targetId: newConv.targetId }), // Convert the data to a JSON string
      };
      const resp = await mfetch(`api/users/${user.username}/convs`, postObj);
      const conv = await resp.json(); // get the body which represents the new conv.

      dispatch(removeConv(newConv));
      // update our conversations list
      dispatch(convAdded(conv));
      // setting selected conv to returned conv object.
      setSelectedConversation(conv);
      // set the newConv to null as this conv is in our database.
      // done at last to avoid making a fetch call to get an empty list of conversations.
      dispatch(newConvAdded({}));
      const newMessage = {
        convId: conv.id,
        senderId: user.id,
        receiverId: user.id === conv.user1Id ? conv.user2Id : conv.user1Id,
        body: message,
      };
      socket.send(JSON.stringify(newMessage));
      setMessages([...messages, newMessage]);
    } else {
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
      setMessages([...messages, newMessage]);
    }
  };

  const handleSend = async () => {
    // Done asynchronously.
    sendMessage(message);

    // resetting the message;
    setMessage('');
  };
  // used to scroll down to the newest message.
  const msgsRef = useRef(null);
  useEffect(() => {
    if (messages) {
      msgsRef.current.scrollTo(0, msgsRef.current.scrollHeight);
    }
  }, [messages]);

  const textareaRef = useRef(null);

  // used to handle the change in text
  const handleChange = (event) => {
    setMessage(event.target.value);
  };

  // used to handle the change in conversation.
  // it resets hasNewMessage field to false since the now the user has viewed all the
  // new features.
  const changeConversation = (selectedConv) => {
    selectedConv.hasNewMessage = false;
    setSelectedConversation(selectedConv);
  };

  return (
    <div className="chat-main">
      <div className="chat-main-title">
        <div className="chat-main-title-text">Chat</div>
        <ButtonClose onClick={() => dispatch(chatOpenToggled())} />
      </div>
      <div className="chat-main-content">
        <div className="chat-main-contacts">
          {conversations.map((convo, index) => (
            <button
              className={
                selectedConversation && convo.id === selectedConversation.id
                  ? 'chat-main-contact-selected'
                  : 'chat-main-contact-unselected'
              }
              key={index}
              onClick={() => changeConversation(convo)}
            >
              <span>{user.id == convo.user1Id ? convo.username2 : convo.username1}</span>
              {convo.hasNewMessage && <span className="chat-notification-dot"></span>}
            </button>
          ))}
        </div>
        <div className="chat-main-chat">
          <div ref={msgsRef} className="chat-main-msgs">
            {selectedConversation &&
              messages.map((message, index) => (
                <div
                  className={user.id == message.senderId ? 'chat-msg chat-msg-reply' : 'chat-msg'}
                  key={index}
                >
                  {message.body}
                </div>
              ))}
          </div>
          <div className="chat-main-reply">
            {selectedConversation && (
              <>
                <textarea
                  ref={textareaRef}
                  rows="1"
                  value={message}
                  onChange={handleChange}
                ></textarea>
                <button className="button-main" disabled={!message.trim()} onClick={handleSend}>
                  Send
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
