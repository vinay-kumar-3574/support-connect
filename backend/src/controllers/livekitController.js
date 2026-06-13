import { AccessToken } from 'livekit-server-sdk';
import { supabase } from '../config/supabase.js';

export const generateLivekitToken = async (req, res) => {
  try {
    const { sessionId, userName, role } = req.body;

    if (!sessionId || !userName || !role) {
      return res.status(400).json({ success: false, error: 'sessionId, userName, and role are required' });
    }

    // Verify session is valid
    const { data: session, error } = await supabase
      .from('sessions')
      .select('status, livekit_room_name')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status === 'ended') {
      return res.status(410).json({ success: false, error: 'This session has already ended' });
    }

    const roomName = session.livekit_room_name;

    // Generate LiveKit token
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ success: false, error: 'LiveKit server configuration missing' });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userName,
      name: userName,
      // 4 hours expiry
      ttl: 4 * 60 * 60,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    res.status(200).json({
      success: true,
      data: {
        token,
        livekit_host: process.env.LIVEKIT_HOST,
      }
    });

  } catch (err) {
    console.error('Generate LiveKit Token Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error generating LiveKit token' });
  }
};
