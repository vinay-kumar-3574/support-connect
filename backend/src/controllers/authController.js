import { supabase } from '../config/supabase.js';

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password, and name are required' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    const user = data.user;
    const session = data.session;

    if (!session) {
      // Sometimes session is null if email confirmation is required
      return res.status(200).json({ 
        success: true, 
        data: { 
          user, 
          message: 'Registration successful. Please check your email to verify your account.' 
        } 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        token: session.access_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata.name,
          role: user.email === 'admin@vidline.app' ? 'admin' : 'agent'
        }
      }
    });

  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const { user, session } = data;

    res.status(200).json({
      success: true,
      data: {
        token: session.access_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || '',
          role: user.email === 'admin@vidline.app' ? 'admin' : 'agent'
        }
      }
    });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during login' });
  }
};
