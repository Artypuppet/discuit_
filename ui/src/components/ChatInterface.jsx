import React, { useEffect, useState } from 'react';
import Sidebar from './ChatSideBar';
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
    const dispatch = useDispatch();
    const user = useSelector((state) => state.main.user)
    const convs = useSelector((state) => state.main.convs)
    dispatch(convsAdded(convs))

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
