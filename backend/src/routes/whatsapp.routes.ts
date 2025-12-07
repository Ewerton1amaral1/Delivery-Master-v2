import { Router } from 'express';
import { getStatus, getChats, getMessages, sendMessage } from '../controllers/whatsapp.controller';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/status', getStatus);
router.get('/chats', getChats);
router.get('/chats/:id/messages', getMessages);
router.post('/chats/:id/messages', sendMessage);

export default router;
