import { Router } from 'express';
import { getDashboardStats, getReportData } from '../controllers/report.controller';

const router = Router();

router.get('/dashboard', getDashboardStats);
router.get('/orders', getReportData);

export default router;
