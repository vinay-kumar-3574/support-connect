import { RoomServiceClient, EgressClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

const livekitHost = process.env.LIVEKIT_HOST;
const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

if (!livekitHost || !livekitApiKey || !livekitApiSecret) {
  console.warn('WARNING: LiveKit environment variables are missing.');
}

// Client for communicating with the LiveKit Server API
export const roomService = new RoomServiceClient(
  livekitHost,
  livekitApiKey,
  livekitApiSecret
);

// Client for communicating with LiveKit Egress Service
export const egressClient = new EgressClient(
  livekitHost,
  livekitApiKey,
  livekitApiSecret
);
