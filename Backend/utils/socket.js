import { Server } from 'socket.io';

let io = null;

export const initializeSockets = (server, options = {}) => {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: options.origin || '*',
      methods: ['GET', 'POST'],
      credentials: options.credentials || true,
    },
    allowEIO3: true,
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

export const emitAttendanceUpdate = (payload) => {
  if (!io) {
    console.warn('Socket.IO not initialized - attendance event not emitted');
    return;
  }

  io.emit('attendance:update', payload);
  if (payload?.type) {
    io.emit(`attendance:${payload.type}`, payload);
  }
};

export const emitSalesSubmissionUpdate = (payload) => {
  if (!io) {
    console.warn('Socket.IO not initialized - sales submission event not emitted');
    return;
  }

  io.emit('salesSubmission:update', payload);
  if (payload?.type) {
    io.emit(`salesSubmission:${payload.type}`, payload);
  }
};
