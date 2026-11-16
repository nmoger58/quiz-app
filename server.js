/**
 * Kannada Quiz Arena - Integrated HTTP & WebSocket Relay Server
 * Provides static web hosting & real-time two-device synchronization.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// 1. HTTP Server for static assets
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // Clean routing
  if (pathname === '/' || pathname === '/index.html') {
    pathname = '/index.html';
  } else if (pathname === '/projector' || pathname === '/projector.html') {
    pathname = '/projector.html';
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found - Kannada Quiz Arena');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// 2. WebSocket Relay Server
const wss = new WebSocketServer({ server, path: '/ws' });

// In-memory sessions store
// sessionId -> { teacher: ws, projectors: Set<ws>, latestState: null }
const sessions = new Map();

wss.on('connection', (ws, req) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const initialSessionId = parsedUrl.searchParams.get('sessionId') || 'DEFAULT';
  const initialRole = parsedUrl.searchParams.get('role') || 'projector';

  ws.sessionId = initialSessionId;
  ws.role = initialRole;

  registerConnection(ws, initialSessionId, initialRole);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
        return;
      }

      if (msg.type === 'REGISTER') {
        registerConnection(ws, msg.sessionId, msg.role);
        return;
      }

      // Security: Projector cannot send control commands
      if (ws.role === 'projector') {
        console.warn(`[Blocked] Read-only projector attempted command: ${msg.type}`);
        return;
      }

      // Teacher broadcasting state update
      const session = sessions.get(ws.sessionId);
      if (session) {
        if (msg.state) {
          session.latestState = msg.state;
        }

        // Broadcast to all projector clients in this session
        session.projectors.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
          }
        });
      }
    } catch (e) {
      console.error("WS message parse error", e);
    }
  });

  ws.on('close', () => {
    const session = sessions.get(ws.sessionId);
    if (session) {
      if (session.teacher === ws) {
        session.teacher = null;
      }
      session.projectors.delete(ws);
      if (!session.teacher && session.projectors.size === 0) {
        // keep session data for 5 minutes for reconnection
        setTimeout(() => {
          const s = sessions.get(ws.sessionId);
          if (s && !s.teacher && s.projectors.size === 0) {
            sessions.delete(ws.sessionId);
          }
        }, 300000);
      }
    }
  });
});

function registerConnection(ws, sessionId, role) {
  if (!sessionId) return;
  ws.sessionId = sessionId;
  ws.role = role;

  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      teacher: null,
      projectors: new Set(),
      latestState: null
    });
  }

  const session = sessions.get(sessionId);

  if (role === 'teacher') {
    session.teacher = ws;
  } else {
    session.projectors.add(ws);
    // If we have a cached state snapshot, send it immediately upon connection
    if (session.latestState) {
      ws.send(JSON.stringify({
        type: 'STATE_SNAPSHOT',
        sessionId: sessionId,
        revision: session.latestState.revision || 1,
        state: session.latestState
      }));
    }
  }
}

// Get local network IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function startServer(port = PORT, callback) {
  return server.listen(port, () => {
    const localIp = getLocalIpAddress();
    console.log('================================================================');
    console.log('🚩 ಕನ್ನಡ ಕ್ವಿಜ್ ಅರೆನಾ (KANNADA QUIZ ARENA) - ಸರ್ವರ್ ಆರಂಭವಾಗಿದೆ');
    console.log('================================================================');
    console.log(`📡 Local Host:       http://localhost:${port}`);
    console.log(`🌐 Wi-Fi / Network:  http://${localIp}:${port}`);
    console.log(`📽️ Projector Display: http://${localIp}:${port}/projector`);
    console.log('================================================================');
    if (callback) callback();
  });
}

function stopServer(callback) {
  wss.close(() => {
    server.close(callback);
  });
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = { server, wss, sessions, getLocalIpAddress, startServer, stopServer, PORT };
