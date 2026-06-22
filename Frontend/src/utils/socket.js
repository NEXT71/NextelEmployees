import { io } from 'socket.io-client';

let socket = null;

const getSocketUrl = () => {
  if (process.env.REACT_APP_SOCKET_URL) {
    return process.env.REACT_APP_SOCKET_URL;
  }

  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '');
  }

  return window.location.origin;
};

export const initSocket = () => {
  if (socket) return socket;

  const socketUrl = getSocketUrl();
  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.warn('Socket connect error:', error.message || error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
};

export const subscribeSocket = (event, handler) => {
  const s = initSocket();
  s.on(event, handler);
  return () => s.off(event, handler);
};

export const unsubscribeSocket = (event, handler) => {
  if (!socket) return;
  socket.off(event, handler);
};
