# webrtc-ptt-supabase

Browser WebRTC push-to-talk voice chat with Supabase auth, TURN (Coturn), and SFU guidance (mediasoup).

## Features
- Supabase Auth (signup/signin)
- Profiles table (username, full_name)
- Signaling via Supabase Realtime (signals table)
- Push-to-talk with configurable keybind
- Local recording (MediaRecorder)
- TURN server (Coturn) Docker config included
- SFU guidance and mediasoup skeleton for multi-peer scaling
- Server endpoints for admin actions (delete user) using Supabase service_role key

## Quick start
1. Clone repo locally.
2. Create Supabase project and run `supabase/schema.sql`.
3. Fill `server/.env` from `.env.example`.
4. Start Coturn (docker-compose in `coturn/`).
5. Start server: `cd server && npm install && npm start`.
6. Serve client: `cd client && npm install && npm start`.
7. Open `http://localhost:8080`.

See `server/README_SETUP.md` for full setup and mediasoup notes.
