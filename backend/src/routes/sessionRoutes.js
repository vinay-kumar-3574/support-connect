import express from 'express';
import { 
  createSession, 
  joinSession, 
  getSessionDetails, 
  getSessionChat, 
  endSession, 
  getAgentSessions,
  getAllSessions
} from '../controllers/sessionController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Public routes (for customers joining)
router.get('/join/:token', joinSession);

// Protected routes (require valid JWT)
router.use(verifyToken);

// Admin only route
router.get('/all', requireRole('admin'), getAllSessions);

// Agent & Admin routes
router.post('/create', requireRole('agent', 'admin'), createSession);
router.get('/', requireRole('agent', 'admin'), getAgentSessions);
router.get('/:id', requireRole('agent', 'admin'), getSessionDetails);
router.get('/:id/chat', requireRole('agent', 'admin'), getSessionChat);
router.patch('/:id/end', requireRole('agent', 'admin'), endSession);

export default router;
