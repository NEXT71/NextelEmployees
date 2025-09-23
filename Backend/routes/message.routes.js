import express from 'express';
import {
  sendMessage,
  getMyMessages,
  getAdminMessages,
  respondToMessage,
  markAsRead,
  getMessageStats,
  resolveMessage,
  getAvailableAdmins
} from '../controllers/message.controller.js';
import auth from '../middlewares/auth.js';
import roles from '../middlewares/roles.js';

const messageRouter = express.Router();

// Employee routes
messageRouter.post('/send', auth, sendMessage);
messageRouter.get('/my-messages', auth, getMyMessages);
messageRouter.patch('/:messageId/read', auth, markAsRead);
messageRouter.get('/available-admins', auth, getAvailableAdmins);

// Admin routes
messageRouter.get('/admin/all', auth, roles('admin'), getAdminMessages);
messageRouter.post('/:messageId/respond', auth, roles('admin'), respondToMessage);
messageRouter.patch('/:messageId/resolve', auth, roles('admin'), resolveMessage);
messageRouter.get('/admin/stats', auth, roles('admin'), getMessageStats);

export default messageRouter;