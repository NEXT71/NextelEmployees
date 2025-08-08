import express from 'express'
const authRouter = express.Router();
import { register, login, getMe, logout} from '../controllers/auth.controller.js';
import auth from '../middlewares/auth.js';

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', auth, getMe);
authRouter.post('/logout', auth, logout);

export default authRouter