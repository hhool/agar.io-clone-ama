#!/usr/bin/env node
// Simple Socket.IO smoke-test
// Usage: node scripts/smoke_test_socket.js https://your-service.onrender.com

const io = require('socket.io-client');

const URL = process.argv[2] || process.env.RENDER_URL;
if (!URL) {
  console.error('Usage: node scripts/smoke_test_socket.js <service-url>');
  process.exit(2);
}

console.log('Socket smoke-test ->', URL);

const socket = io(URL, {
  transports: ['websocket'],
  reconnection: false,
  timeout: 10000
});

let connected = false;

socket.on('connect', () => {
  connected = true;
  console.log('connected, socket id =', socket.id);

  // Try a harmless emit; server may ignore unknown events but emit should succeed
  try {
    socket.emit('client_ping', { ts: Date.now() });
    console.log('emitted client_ping');
  } catch (e) {
    console.warn('emit error:', e && e.message ? e.message : e);
  }

  // Wait briefly to observe any server response, then close
  setTimeout(() => {
    console.log('closing socket (success)');
    socket.close();
    process.exit(0);
  }, 2500);
});

socket.on('connect_error', (err) => {
  console.error('connect_error:', (err && err.message) || err);
  process.exit(3);
});

socket.on('error', (err) => {
  console.error('socket error:', err);
});

socket.on('disconnect', (reason) => {
  console.log('disconnected:', reason);
  if (!connected) process.exit(4);
});

// Capture any unexpected events for debugging
socket.onAny((event, ...args) => {
  console.log('received event:', event, args.length ? args : '');
});
