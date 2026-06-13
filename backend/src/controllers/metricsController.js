import { supabase } from '../config/supabase.js';

export const getMetrics = async (req, res) => {
  try {
    // 1. Active sessions count
    const { count: activeCount, error: err1 } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // 2. Connected Sockets (using the global map passed via req)
    const activeSocketsMap = req.app.locals.activeSocketsMap || new Map();
    const connectedParticipants = activeSocketsMap.size;

    // 3. Sessions created today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { count: todayCount, error: err2 } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', startOfToday.toISOString());

    // 4. Average duration across completed sessions
    const { data: completedSessions, error: err3 } = await supabase
      .from('sessions')
      .select('duration_seconds')
      .eq('status', 'ended')
      .not('duration_seconds', 'is', null);

    let avgDuration = 0;
    if (completedSessions && completedSessions.length > 0) {
      const totalDuration = completedSessions.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
      avgDuration = Math.round(totalDuration / completedSessions.length);
    }

    if (err1 || err2 || err3) {
      return res.status(500).json({ success: false, error: 'Database error while fetching metrics' });
    }

    // Check Accept header for Prometheus format
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('text/plain')) {
      let prometheusText = '';
      prometheusText += `# HELP active_sessions Current number of active support sessions\n`;
      prometheusText += `# TYPE active_sessions gauge\n`;
      prometheusText += `active_sessions ${activeCount || 0}\n\n`;

      prometheusText += `# HELP connected_participants Current number of connected websockets\n`;
      prometheusText += `# TYPE connected_participants gauge\n`;
      prometheusText += `connected_participants ${connectedParticipants}\n\n`;

      prometheusText += `# HELP sessions_today Total sessions created today\n`;
      prometheusText += `# TYPE sessions_today counter\n`;
      prometheusText += `sessions_today ${todayCount || 0}\n\n`;

      prometheusText += `# HELP average_session_duration_seconds Average duration of ended sessions\n`;
      prometheusText += `# TYPE average_session_duration_seconds gauge\n`;
      prometheusText += `average_session_duration_seconds ${avgDuration}\n`;

      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(prometheusText);
    }

    // Default JSON response
    res.status(200).json({
      success: true,
      data: {
        active_sessions: activeCount || 0,
        connected_participants: connectedParticipants,
        sessions_today: todayCount || 0,
        average_session_duration_seconds: avgDuration,
      }
    });

  } catch (err) {
    console.error('Metrics Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error generating metrics' });
  }
};
