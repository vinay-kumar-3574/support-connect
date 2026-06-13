import { supabase } from '../config/supabase.js';

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token using Supabase admin client
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    // Option A: Demo approach. Assign 'admin' role if email matches
    if (user.email === 'admin@vidline.app') {
      user.role = 'admin';
    } else {
      user.role = 'agent';
    }
    
    req.user = user;
    
    next();
  } catch (err) {
    console.error('Verify Token Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during authentication' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
