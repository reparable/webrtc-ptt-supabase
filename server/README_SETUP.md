# Server setup and mediasoup notes

## Environment
Copy `.env.example` to `.env` and fill values:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server only)
- ADMIN_TOKEN
- TURN_USER / TURN_PASS / TURN_URL (optional)

## Start server
cd server
npm install
node server.js

## Coturn
cd coturn
docker-compose up -d

## Mediasoup (optional SFU)
- Install mediasoup on the server: `npm install mediasoup`
- Use `mediasoup-server.js` as a starting point.
- You must run mediasoup on a machine with public IP and open UDP ports for RTP.
- For multi-node scaling, use Redis for worker coordination and a load balancer for signaling.
- See mediasoup docs: https://mediasoup.org/

## TURN credentials
- For production, configure Coturn with `static-auth-secret` and generate ephemeral credentials via REST or use long-term credentials.
- The server can implement an endpoint to generate ephemeral TURN credentials and return them to clients.
