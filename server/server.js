/* ==========================================================================
   MARBLE RUSH — relay server (Section 7.3)
   Serves the two game pages and relays messages between the TV and phones.
   The TV runs the race; this server never needs to know the rules.
   ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, '..', 'public');
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O
const ROOM_IDLE_MS = 30 * 60 * 1000;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.wav': 'audio/wav', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function sendFile(res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': cache ? 'public, max-age=86400' : 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  if (p === '/' || p === '/tv' || p === '/tv.html') return sendFile(res, path.join(PUB, 'tv.html'));
  if (p === '/play' || p === '/play.html' || p === '/join') return sendFile(res, path.join(PUB, 'play.html'));
  if (p === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
  if (p.startsWith('/assets/')) {
    const file = path.normalize(path.join(PUB, p));
    if (!file.startsWith(path.join(PUB, 'assets'))) { res.writeHead(403); res.end(); return; }
    return sendFile(res, file, !p.endsWith('manifest.json'));
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
});

/* ---------- rooms ---------- */
const rooms = new Map(); // code → { host, players: Map(pid → ws), last }
function newCode() {
  for (let n = 0; n < 1000; n++) {
    let c = '';
    for (let i = 0; i < 4; i++) c += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    if (!rooms.has(c)) return c;
  }
  throw new Error('no free room codes');
}
function out(ws, m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
wss.on('connection', ws => {
  ws.alive = true;
  ws.role = null; ws.room = null; ws.pid = null;
  ws.rate = 0; ws.rateT = Date.now();
  ws.on('pong', () => { ws.alive = true; });

  ws.on('message', raw => {
    // simple flood guard: 80 messages per second
    const now = Date.now();
    if (now - ws.rateT > 1000) { ws.rate = 0; ws.rateT = now; }
    if (++ws.rate > 80) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;

    /* ----- TV ----- */
    if (m.t === 'host') {
      let code = typeof m.code === 'string' ? m.code.toUpperCase() : null;
      let room = code && rooms.get(code);
      if (!room || (room.host && room.host.readyState === 1 && room.host !== ws)) {
        code = newCode(); room = { host: null, players: new Map(), last: now };
        rooms.set(code, room);
      }
      room.host = ws; room.last = now;
      ws.role = 'host'; ws.room = code;
      out(ws, { t: 'room', code, pids: [...room.players.keys()] });
      for (const [pid, pws] of room.players) out(ws, { t: 'join', pid, name: pws.name, swirl: pws.swirl });
      return;
    }
    if (ws.role === 'host') {
      const room = rooms.get(ws.room); if (!room) return;
      room.last = now;
      if (m.t === 'to' && typeof m.pid === 'string') out(room.players.get(m.pid), m.m);
      else if (m.t === 'all') for (const pws of room.players.values()) out(pws, m.m);
      return;
    }

    /* ----- phone ----- */
    if (m.t === 'join') {
      const code = String(m.code || '').toUpperCase().slice(0, 4);
      const room = rooms.get(code);
      if (!room) { out(ws, { t: 'err', e: 'noroom' }); return; }
      const pid = String(m.pid || '').slice(0, 24);
      if (!pid) return;
      const old = room.players.get(pid);
      if (old && old !== ws) { old.replaced = true; try { old.close(4009, 'Session opened elsewhere'); } catch (e) { /* gone */ } }
      ws.role = 'player'; ws.room = code; ws.pid = pid;
      ws.name = String(m.name || 'Racer').slice(0, 16);
      ws.swirl = Number.isInteger(m.swirl) ? m.swirl : 0;
      room.players.set(pid, ws); room.last = now;
      if (room.host && room.host.readyState === 1) out(room.host, { t: 'join', pid, name: ws.name, swirl: ws.swirl });
      else out(ws, { t: 'wait' });
      return;
    }
    if (ws.role === 'player') {
      const room = rooms.get(ws.room); if (!room) return;
      // A superseded tab cannot continue sending race/party inputs.
      if (room.players.get(ws.pid) !== ws) return;
      room.last = now;
      if (m.t === 'in' && (m.k === 'p' || m.k === 'r' || m.k === 'i')) out(room.host, { t: 'in', pid: ws.pid, k: m.k });
      else if (m.t === 'act' && typeof m.a === 'string') out(room.host, { t: 'act', pid: ws.pid, a: m.a.slice(0, 16), v: m.v });
    }
  });

  ws.on('close', () => {
    const room = ws.room && rooms.get(ws.room);
    if (!room) return;
    if (ws.role === 'host' && room.host === ws) room.host = null;
    if (ws.role === 'player' && room.players.get(ws.pid) === ws) {
      room.players.delete(ws.pid);
      if (!ws.replaced) out(room.host, { t: 'leave', pid: ws.pid });
    }
  });
});

// heartbeat + cleanup
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false; try { ws.ping(); } catch (e) { /* closed */ }
  }
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (!room.host && room.players.size === 0 && now - room.last > 10 * 60 * 1000) rooms.delete(code);
    else if (now - room.last > ROOM_IDLE_MS) rooms.delete(code);
  }
}, 25000);

server.listen(PORT, () => console.log(`Marble Rush running on port ${PORT}`));
