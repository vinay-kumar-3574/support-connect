import { supabase, supabaseAuth } from '../config/supabase.js';
import { roomService } from '../config/livekit.js';
import jwt from 'jsonwebtoken';

export const setupSocketHandlers = (io, app) => {
  // We store a map of socket.id -> { sessionId, participantId, userName }
  const activeSocketsMap = new Map();
  app.locals.activeSocketsMap = activeSocketsMap;

  // We use this map to store disconnect timers for the 30s grace period
  const disconnectTimers = new Map();

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      
      // If customer (no token), just pass them through
      if (!token) {
        return next();
      }

      // If token provided (agent), verify it
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
      if (error || !user) {
        return next(new Error('Authentication error: Invalid token'));
      }

      socket.user = { ...user, role: 'agent' };
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('session:join', async (payload) => {
      try {
        const { sessionId, userName, role } = payload;
        
        if (!sessionId || !userName || !role) {
          return socket.emit('error', 'Missing sessionId, userName, or role');
        }

        // Check if there was a pending disconnect timer for this user/session
        // and cancel it if they reconnected within 30s
        const timerKey = `${sessionId}-${userName}`;
        if (disconnectTimers.has(timerKey)) {
          clearTimeout(disconnectTimers.get(timerKey));
          disconnectTimers.delete(timerKey);
        }

        socket.join(sessionId);

        // Insert participant record
        const { data: participant, error } = await supabase
          .from('participants')
          .insert({
            session_id: sessionId,
            name: userName,
            role: role,
            socket_id: socket.id,
          });

        if (error) {
          console.error("Failed to insert participant", error);
        }

        activeSocketsMap.set(socket.id, { sessionId, userName, role });

        // Notify others
        socket.to(sessionId).emit('participant:joined', { userName, role });

      } catch (err) {
        console.error('session:join error:', err);
        socket.emit('error', 'Internal server error joining session');
      }
    });

    socket.on('chat:message', async (payload) => {
      try {
        const { sessionId, message, senderName } = payload;
        
        if (!sessionId || !message || !senderName) return;

        // Broadcast immediately
        const timestamp = new Date().toISOString();
        socket.to(sessionId).emit('chat:message', {
          senderName,
          content: message,
          sent_at: timestamp
        });

        // Persist to DB
        await supabase.from('messages').insert({
          session_id: sessionId,
          sender_name: senderName,
          content: message,
          sent_at: timestamp
        });

      } catch (err) {
        console.error('chat:message error:', err);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('session:end', async (payload) => {
      try {
        if (!socket.user || socket.user.role !== 'agent') {
          return socket.emit('error', 'Only agents can end a session');
        }

        const { sessionId } = payload;
        if (!sessionId) return;

        const { data: session } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (session && session.status !== 'ended') {
          const startedAt = new Date(session.started_at).getTime();
          const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);

          await supabase.from('sessions').update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            duration_seconds: durationSeconds
          }).eq('id', sessionId);

          try {
            await roomService.deleteRoom(session.livekit_room_name);
          } catch (lkErr) {}

          io.to(sessionId).emit('session:ended', { session_id: sessionId });
        }
      } catch (err) {
        console.error('session:end error:', err);
        socket.emit('error', 'Failed to end session');
      }
    });

    socket.on('recording:start', async (payload) => {
      try {
        if (!socket.user || socket.user.role !== 'agent') return;
        const { sessionId } = payload;
        
        const { data: session } = await supabase.from('sessions').select('livekit_room_name').eq('id', sessionId).single();
        if (!session) return;

        let egressId = null;
        try {
          const info = await egressClient.startRoomCompositeEgress(
            session.livekit_room_name,
            { file: { filepath: `recordings/${session.livekit_room_name}-{time}.mp4` } },
            { layout: 'speaker' }
          );
          egressId = info.egressId;
        } catch (egressErr) {
          console.error("LiveKit Egress Failed:", egressErr.message);
        }

        await supabase.from('recordings').insert({
          session_id: sessionId,
          status: egressId ? 'processing' : 'ready', // if it failed, we just say ready to avoid being stuck
          started_at: new Date().toISOString(),
          file_url: egressId || 's3-not-configured.mp4'
        });

        io.to(sessionId).emit('recording:status', { status: 'recording', sessionId });
      } catch (err) {
        console.error('recording:start error:', err);
        socket.emit('error', 'Failed to start recording');
      }
    });

    socket.on('recording:stop', async (payload) => {
      try {
        if (!socket.user || socket.user.role !== 'agent') return;
        const { sessionId } = payload;

        const { data: recording } = await supabase.from('recordings')
          .select('*')
          .eq('session_id', sessionId)
          .is('ended_at', null)
          .single();

        if (recording && recording.file_url !== 's3-not-configured.mp4') {
          try {
            await egressClient.stopEgress(recording.file_url);
          } catch(err) {
            console.error("Stop egress failed:", err.message);
          }
        }

        await supabase.from('recordings').update({
          ended_at: new Date().toISOString(),
          status: 'ready'
        }).eq('session_id', sessionId).is('ended_at', null);

        io.to(sessionId).emit('recording:status', { status: 'stopped', sessionId });
      } catch (err) {
        console.error('recording:stop error:', err);
        socket.emit('error', 'Failed to stop recording');
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      const socketData = activeSocketsMap.get(socket.id);
      if (socketData) {
        const { sessionId, userName } = socketData;
        activeSocketsMap.delete(socket.id);

        // Start 30s grace timer
        const timerKey = `${sessionId}-${userName}`;
        const timerId = setTimeout(async () => {
          try {
            // Timer expired, participant has truly left
            await supabase.from('participants').update({
              left_at: new Date().toISOString()
            }).eq('session_id', sessionId).eq('name', userName).is('left_at', null);

            io.to(sessionId).emit('participant:left', { userName });
          } catch (err) {
            console.error('Disconnect timer error:', err);
          }
          disconnectTimers.delete(timerKey);
        }, 30000);

        disconnectTimers.set(timerKey, timerId);
      }
    });
  });
};
