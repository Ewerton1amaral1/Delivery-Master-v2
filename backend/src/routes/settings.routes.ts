import { Router } from 'express';
import { getStore, updateStore } from '../controllers/settings.controller';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getStore);
router.put('/', updateStore);

export default router;
