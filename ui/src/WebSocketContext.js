// WebSocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children, isLoggedIn }) => {
  const [socket, setSocket] = useState(null);
  const [created, setCreated] = useState(false);
  const user = useSelector((state) => state.main.user);
  useEffect(() => {
    if (isLoggedIn && !created) {
      const ws = new WebSocket(`/api/users/${user.username}/conn`);
      setSocket(ws);
      setCreated(true);

      ws.onopen = () => {
        console.log('WebSocket connection opened');
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };

      ws.onerror = (error) => {
        console.error('WebSocket error', error);
      };
    }
  }, [isLoggedIn, user]);

  return <WebSocketContext.Provider value={socket}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};
