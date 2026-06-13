import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';

// Hard polyfill for Node.js 20
globalThis.WebSocket = ws;
global.WebSocket = ws;

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.warn('WARNING: Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ANON_KEY');
}

// Global client using Service Role Key for DB operations (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    WebSocket: ws,
  },
  realtime: {
    transport: ws,
  }
});

// Auth client using Anon Key for signups and logins (prevents JWT pollution on the global client)
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    WebSocket: ws,
  },
  realtime: {
    transport: ws,
  }
});
