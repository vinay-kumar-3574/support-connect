import { nanoid } from 'nanoid';
import { supabase } from '../config/supabase.js';
import { roomService } from '../config/livekit.js';

export const createSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const inviteToken = nanoid(12);

    // Create a new session in DB, let Postgres generate the UUID
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        created_by: userId,
        invite_token: inviteToken,
        status: 'active',
        // We will just use the DB-generated session ID as the room name later,
        // but we need the ID first. So we insert and return the row.
        // Wait, the schema says livekit_room_name is NOT NULL. 
        // We can use the invite_token as the room name, or generate a uuid for the room name.
        livekit_room_name: `room-${inviteToken}`,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: 'Database error creating session: ' + error.message });
    }

    // Create the LiveKit room via Server SDK
    try {
      await roomService.createRoom({
        name: session.livekit_room_name,
        emptyTimeout: 10 * 60, // 10 minutes empty timeout
        maxParticipants: 50,
      });
    } catch (lkError) {
      console.error('LiveKit Error:', lkError);
      // We log but don't fail, LiveKit auto-creates rooms on token connect anyway
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/join/${inviteToken}`;

    res.status(200).json({
      success: true,
      data: {
        id: session.id,
        invite_token: session.invite_token,
        invite_url: inviteUrl,
        livekit_room_name: session.livekit_room_name,
      }
    });

  } catch (err) {
    console.error('Create Session Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error creating session' });
  }
};

export const joinSession = async (req, res) => {
  try {
    const { token } = req.params;

    const { data: session, error } = await supabase
      .from('sessions')
      .select(`
        id, 
        status, 
        livekit_room_name,
        created_by
      `)
      .eq('invite_token', token)
      .single();

    if (error || !session) {
      return res.status(404).json({ success: false, error: 'Invalid or missing invite token' });
    }

    if (session.status === 'ended') {
      return res.status(410).json({ success: false, error: 'This session has ended' });
    }

    // Look up the agent name
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(session.created_by);
    let agentName = 'Agent';
    
    if (userData?.user?.user_metadata?.name) {
      agentName = userData.user.user_metadata.name;
    }

    res.status(200).json({
      success: true,
      data: {
        id: session.id,
        status: session.status,
        agent_name: agentName,
        livekit_room_name: session.livekit_room_name
      }
    });

  } catch (err) {
    console.error('Join Session Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error joining session' });
  }
};

export const getSessionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: session, error } = await supabase
      .from('sessions')
      .select(`
        *,
        participants (*),
        recordings (*)
      `)
      .eq('id', id)
      .single();

    if (error || !session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.status(200).json({ success: true, data: session });

  } catch (err) {
    console.error('Get Session Details Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error fetching session details' });
  }
};

export const getSessionChat = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', id)
      .order('sent_at', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: 'Database error fetching chat messages' });
    }

    res.status(200).json({ success: true, data: messages });

  } catch (err) {
    console.error('Get Session Chat Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error fetching chat messages' });
  }
};

export const endSession = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the session
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status === 'ended') {
      return res.status(400).json({ success: false, error: 'Session is already ended' });
    }

    // Calculate duration
    const startedAt = new Date(session.started_at).getTime();
    const endedAt = Date.now();
    const durationSeconds = Math.floor((endedAt - startedAt) / 1000);

    // Update DB
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'ended',
        ended_at: new Date(endedAt).toISOString(),
        duration_seconds: durationSeconds
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ success: false, error: 'Failed to update session status' });
    }

    // Close LiveKit Room
    try {
      await roomService.deleteRoom(session.livekit_room_name);
    } catch (lkErr) {
      // Ignore 404 errors (room doesn't exist or already deleted)
      if (lkErr?.status !== 404) {
        console.error('Error deleting LiveKit room:', lkErr);
      }
    }

    // Socket.io emit is handled by the socket layer or can be imported, 
    // but the prompt specifies "emit a session:ended Socket.io event".
    // We will emit it using the global socket instance which we can attach to req
    if (req.io) {
      req.io.to(id).emit('session:ended', { session_id: id });
    }

    res.status(200).json({ success: true, data: updatedSession });

  } catch (err) {
    console.error('End Session Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error ending session' });
  }
};

export const getAgentSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all sessions created by this user
    // In a real app we might paginate
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        *,
        participants(count)
      `)
      .eq('created_by', userId)
      .order('started_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: 'Database error fetching sessions' });
    }

    res.status(200).json({ success: true, data: sessions });

  } catch (err) {
    console.error('Get Agent Sessions Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error fetching agent sessions' });
  }
};

export const getAllSessions = async (req, res) => {
  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        *,
        participants(count)
      `)
      .order('started_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: 'Database error fetching all sessions' });
    }

    res.status(200).json({ success: true, data: sessions });

  } catch (err) {
    console.error('Get All Sessions Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error fetching all sessions' });
  }
};
