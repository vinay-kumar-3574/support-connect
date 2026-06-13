import express from 'express';
import { generateLivekitToken } from '../controllers/livekitController.js';

const router = express.Router();

// This endpoint is used by both agents and customers to get a LiveKit WebRTC token
router.post('/token', generateLivekitToken);

export default router;
