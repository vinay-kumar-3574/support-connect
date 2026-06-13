import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

// Route imports
import authRoutes from './routes/authRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import livekitRoutes from './routes/livekitRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';

// Socket imports
import { setupSocketHandlers } from './socket/index.js';

const app = express();
const PORT = process.env.PORT || 8000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Initialize HTTP server and Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// Middleware
app.use(cors({ 
  origin: (origin, callback) => callback(null, true), 
  credentials: true 
}));
app.use(express.json());

// Make io accessible in routes (e.g. for emitting session:ended from REST)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/livekit', livekitRoutes);
app.use('/api/metrics', metricsRoutes);

// Setup Sockets
setupSocketHandlers(io, app);

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================`);
  console.log(`🚀 Support Connect Backend is running!`);
  console.log(`📡 Listening on: http://0.0.0.0:${PORT}`);
  console.log(`🌐 Allowed CORS Origin: ${FRONTEND_URL}`);
  console.log(`=======================================`);
});
