import express from 'express';
import { getMetrics } from '../controllers/metricsController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, requireRole('agent'), getMetrics);

export default router;
