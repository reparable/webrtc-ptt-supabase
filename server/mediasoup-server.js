// server/mediasoup-server.js
// Minimal mediasoup skeleton. This file is a starting point and requires mediasoup installation and configuration.
// See README_SETUP.md for full mediasoup setup and production notes.

const mediasoup = require('mediasoup');

async function createWorker() {
  const worker = await mediasoup.createWorker({
    rtcMinPort: 20000,
    rtcMaxPort: 20200,
    logLevel: 'warn'
  });
  const router = await worker.createRouter({ mediaCodecs: [
    { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 }
  ]});
  return { worker, router };
}

module.exports = { createWorker };
