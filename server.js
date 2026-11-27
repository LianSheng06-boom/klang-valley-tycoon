// Klang Valley Tycoon game server: serves the page and keeps online rooms in sync.
// Rooms live in memory. If the server restarts, the players' browsers send the
// last state back, so a game in progress carries on.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 5177;
const DOC = /^games\/[a-z0-9]{5}$/;
const ROOM = /^kvt-[a-z0-9]{5}$/;
const MAX_DOCS = 500;
const IDLE_MS = 24 * 3600e3;

/* ---------- static files: only the page ---------- */
function sendFile(res, rel, type, cache) {
  fs.readFile(path.join(__dirname, rel), (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': type, 'cache-control': cache, 'x-content-type-options': 'nosniff' });
    res.end(buf);
  });
}
const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { p = ''; }
  if (p === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' }); return res.end('ok'); }
  if (p === '/' || p === '/index.html') return sendFile(res, 'index.html', 'text/html; charset=utf-8', 'no-cache');
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found');
});

/* ---------- shared state ---------- */
const docs = new Map();   // path -> { data, at }
const leases = new Map(); // path -> { holder, until }
const subs = new Map();   // path -> Set<ws>
const rooms = new Map();  // room -> Map<ws, presence>

const snap = p => { const d = docs.get(p); return d ? { exists: true, data: d.data } : { exists: false }; };
const tell = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };

function pushDoc(p) {
  const s = subs.get(p);
  if (!s) return;
  const msg = JSON.stringify(Object.assign({ t: 'doc', path: p }, snap(p)));
  for (const w of s) if (w.readyState === 1) w.send(msg);
}
function sweep(force) {
  const now = Date.now(), watched = p => (subs.get(p) || { size: 0 }).size > 0;
  for (const [p, d] of docs) if (now - d.at > IDLE_MS && !watched(p)) docs.delete(p);
  if (force && docs.size >= MAX_DOCS) {
    [...docs].filter(([p]) => !watched(p)).sort((a, b) => a[1].at - b[1].at).slice(0, 50).forEach(([p]) => docs.delete(p));
  }
}
function put(p, data) {
  if (!docs.has(p) && docs.size >= MAX_DOCS) sweep(true);
  if (!docs.has(p) && docs.size >= MAX_DOCS) throw 'full';
  docs.set(p, { data, at: Date.now() });
}
function peers(name) {
  const r = rooms.get(name);
  if (!r) return;
  const seen = new Set(), list = [];
  for (const [w, pres] of r) { if (seen.has(w.uid)) continue; seen.add(w.uid); list.push({ by: w.uid, presence: pres || null }); }
  const msg = JSON.stringify({ t: 'peers', room: name, peers: list });
  for (const w of r.keys()) if (w.readyState === 1) w.send(msg);
}
function leaveRoom(ws, name) {
  ws.rooms.delete(name);
  const r = rooms.get(name);
  if (!r) return;
  r.delete(ws);
  if (!r.size) rooms.delete(name); else peers(name);
}

/* ---------- websocket protocol ---------- */
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 512 * 1024 });
wss.on('connection', ws => {
  ws.uid = null; ws.subs = new Set(); ws.rooms = new Set(); ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    const reply = (result, err) => { if (m.id) tell(ws, err ? { id: m.id, err } : { id: m.id, result: result === undefined ? null : result }); };
    try {
      if (m.op === 'hello') {
        if (typeof m.uid === 'string' && /^[a-z0-9]{6,40}$/i.test(m.uid)) ws.uid = m.uid;
        return reply(!!ws.uid);
      }
      if (!ws.uid) return reply(null, 'unauthenticated');
      if (m.path !== undefined && !DOC.test(m.path)) return reply(null, 'invalid_argument');
      if (m.room !== undefined && !ROOM.test(m.room)) return reply(null, 'invalid_argument');
      switch (m.op) {
        case 'get': return reply(snap(m.path));
        case 'set': {
          if (!m.data || typeof m.data !== 'object') return reply(null, 'invalid_argument');
          put(m.path, m.data);
          const l = leases.get(m.path);
          if (l && l.holder === ws.uid) leases.delete(m.path);
          pushDoc(m.path);
          return reply(true);
        }
        case 'del': docs.delete(m.path); leases.delete(m.path); pushDoc(m.path); return reply(true);
        case 'acquire': {
          const now = Date.now(), l = leases.get(m.path);
          if (!l || l.until < now || l.holder === ws.uid) {
            leases.set(m.path, { holder: ws.uid, until: now + Math.min(10000, +m.ttl || 4000) });
            return reply({ acquired: true });
          }
          return reply({ acquired: false });
        }
        case 'sub': {
          if (!subs.has(m.path)) subs.set(m.path, new Set());
          subs.get(m.path).add(ws); ws.subs.add(m.path);
          // After a server restart, browsers send back the last copy they saw.
          const r = m.restore, cur = docs.get(m.path);
          if (r && typeof r === 'object' && r.code === m.path.slice(6) && (!cur || (r.rev || 0) > (cur.data.rev || 0))) { put(m.path, r); pushDoc(m.path); }
          else tell(ws, Object.assign({ t: 'doc', path: m.path }, snap(m.path)));
          return reply(true);
        }
        case 'unsub': { const s = subs.get(m.path); if (s) { s.delete(ws); if (!s.size) subs.delete(m.path); } ws.subs.delete(m.path); return reply(true); }
        case 'join': {
          if (!rooms.has(m.room)) rooms.set(m.room, new Map());
          rooms.get(m.room).set(ws, m.presence || null); ws.rooms.add(m.room); peers(m.room);
          return reply(true);
        }
        case 'presence': { const r = rooms.get(m.room); if (r && r.has(ws)) { r.set(ws, m.presence || null); peers(m.room); } return reply(true); }
        case 'leave': leaveRoom(ws, m.room); return reply(true);
        case 'emit': {
          const r = rooms.get(m.room);
          if (r && r.has(ws)) {
            const msg = JSON.stringify({ t: 'msg', room: m.room, name: String(m.name), data: m.data, by: ws.uid });
            for (const w of r.keys()) if (w !== ws && w.readyState === 1) w.send(msg);
          }
          return reply(true);
        }
        default: return reply(null, 'unknown_op');
      }
    } catch (e) { reply(null, typeof e === 'string' ? e : 'error'); }
  });
  ws.on('close', () => {
    for (const p of ws.subs) { const s = subs.get(p); if (s) { s.delete(ws); if (!s.size) subs.delete(p); } }
    for (const r of [...ws.rooms]) leaveRoom(ws, r);
  });
});

setInterval(() => { for (const w of wss.clients) { if (!w.alive) { w.terminate(); continue; } w.alive = false; w.ping(); } }, 30000).unref();
setInterval(() => sweep(false), 3600e3).unref();
server.listen(PORT, () => console.log('Klang Valley Tycoon on http://localhost:' + PORT));
