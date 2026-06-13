# Deployment Guide

Follow these instructions to quickly deploy the application using your existing LiveKit EC2 instance for the backend and Vercel for the frontend.

## Phase 1: Deploy the Backend

1. **Find your IP:** Get the Public IP address of your LiveKit EC2 instance (let's pretend it is `12.34.56.78`).
2. **SSH into it:** Open your terminal and SSH into your LiveKit EC2 instance.
3. **Download Code:** Run `git clone https://github.com/vinay-kumar-3574/support-connect.git`
4. **Start the App:** 
   ```bash
   cd support-connect/backend
   npm install
   nano .env # Paste your Supabase/LiveKit keys, save and exit
   sudo npm install -g pm2
   pm2 start src/index.js --name "support-backend"
   pm2 save
   pm2 startup
   ```
5. **Secure it with Caddy & nip.io:** 
   - Run `sudo nano /opt/livekit/caddy.yaml`
   - Scroll to the bottom and paste this exactly (replacing with your real IP with hyphens):
     ```yaml
     12-34-56-78.nip.io {
         reverse_proxy localhost:8000
     }
     ```
   - Save the file and restart Caddy by running:
     ```bash
     cd /opt/livekit
     sudo docker-compose restart caddy
     ```

*Your backend is now securely live at `https://12-34-56-78.nip.io`!*

---

## Phase 2: Deploy the Frontend

Since your code is already on GitHub, you don't even need the Vercel CLI!

1. Go to [Vercel.com](https://vercel.com) and log in.
2. Click **Add New -> Project**.
3. Select your `support-connect` GitHub repository.
4. **Important:** Set the "Framework Preset" to **Vite**, and change the "Root Directory" to `frontend`.
5. Open the **Environment Variables** dropdown and add:
   - **Key:** `VITE_BACKEND_URL`
   - **Value:** `https://12-34-56-78.nip.io` *(Use your actual nip.io URL from Phase 1)*
6. Click **Deploy**.

Vercel will give you a live URL in 30 seconds. Your application is fully deployed and ready for the judges!
