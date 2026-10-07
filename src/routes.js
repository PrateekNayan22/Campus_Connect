const express = require('express');
const db = require('./db');
const r = express.Router();

const MAX_LEN = 2000;
const clean = v => (typeof v === 'string' ? v.trim() : '');
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const interestsOf = id => db.prepare('SELECT interest FROM interests WHERE user_id=? ORDER BY rowid').all(id).map(x => x.interest);
const publicUser = u => ({ id: u.id, initials: u.initials, name: u.name, deptYear: u.dept_year, style: u.style, why: u.why, interests: interestsOf(u.id) });

// Same formula the original page used, so scores look identical.
function matchScore(mine, theirs) {
  const u = mine.map(x => x.toLowerCase()), t = theirs.map(x => x.toLowerCase());
  const common = u.filter(x => t.includes(x)).length, union = new Set([...u, ...t]).size;
  return Math.max(60, Math.min(98, Math.round(62 + (common / union) * 28 + common * 8)));
}

r.get('/health', (req, res) => res.json({ ok: true }));
r.get('/me', (req, res) => res.json(publicUser(req.user)));

// ---------- Students ----------
r.get('/students', (req, res) => {
  const q = clean(req.query.q).toLowerCase();
  const mine = interestsOf(req.user.id);
  let list = db.prepare('SELECT * FROM users WHERE id != ?').all(req.user.id).map(publicUser)
    .map(s => ({ ...s, match: matchScore(mine, s.interests) }));
  if (q) list = list.filter(s => [s.name, s.deptYear, s.id, ...s.interests].join(' ').toLowerCase().includes(q));
  res.json(list.sort((a, b) => b.match - a.match));
});
r.get('/students/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!u) return bad(res, 'Student not found', 404);
  const s = publicUser(u);
  res.json({ ...s, match: matchScore(interestsOf(req.user.id), s.interests) });
});

// ---------- Connections ----------
r.get('/connections', (req, res) => res.json(db.prepare(
  'SELECT to_id AS id, status, created_at FROM connections WHERE from_id=?').all(req.user.id)));
r.post('/connections', (req, res) => {
  const toId = clean(req.body.toId);
  if (toId === req.user.id) return bad(res, "You can't connect with yourself");
  if (!db.prepare('SELECT 1 FROM users WHERE id=?').get(toId)) return bad(res, 'Student not found', 404);
  db.prepare('INSERT OR IGNORE INTO connections (from_id,to_id) VALUES (?,?)').run(req.user.id, toId);
  res.status(201).json({ ok: true, status: 'pending' });
});

// ---------- Communities ----------
const commRow = (c, uid) => ({
  id: c.id, icon: c.icon, name: c.name, tags: c.tags,
  members: c.base_members + db.prepare('SELECT COUNT(*) n FROM community_members WHERE community_id=?').get(c.id).n,
  joined: !!db.prepare('SELECT 1 FROM community_members WHERE community_id=? AND user_id=?').get(c.id, uid),
});
r.get('/communities', (req, res) => res.json(db.prepare('SELECT * FROM communities ORDER BY id').all().map(c => commRow(c, req.user.id))));
r.get('/communities/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM communities WHERE id=?').get(req.params.id);
  c ? res.json(commRow(c, req.user.id)) : bad(res, 'Community not found', 404);
});
r.post('/communities/:id/join', (req, res) => {
  if (!db.prepare('SELECT 1 FROM communities WHERE id=?').get(req.params.id)) return bad(res, 'Community not found', 404);
  db.prepare('INSERT OR IGNORE INTO community_members VALUES (?,?)').run(req.params.id, req.user.id);
  res.json({ ok: true });
});
r.delete('/communities/:id/join', (req, res) => {
  db.prepare('DELETE FROM community_members WHERE community_id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

const isMember = (cid, uid) => !!db.prepare('SELECT 1 FROM community_members WHERE community_id=? AND user_id=?').get(cid, uid);
const postRow = (p, uid) => ({
  id: p.id, body: p.body, createdAt: p.created_at,
  author: { id: p.user_id, name: p.name, initials: p.initials, style: p.style },
  likes: db.prepare('SELECT COUNT(*) n FROM post_likes WHERE post_id=?').get(p.id).n,
  liked: !!db.prepare('SELECT 1 FROM post_likes WHERE post_id=? AND user_id=?').get(p.id, uid),
  comments: db.prepare(`SELECT c.id, c.body, c.created_at AS createdAt, u.name FROM comments c JOIN users u ON u.id=c.user_id
                        WHERE c.post_id=? ORDER BY c.id`).all(p.id),
});
r.get('/communities/:id/posts', (req, res) => {
  if (!isMember(req.params.id, req.user.id)) return bad(res, 'Join this community first', 403);
  const rows = db.prepare(`SELECT p.*, u.name, u.initials, u.style FROM posts p JOIN users u ON u.id=p.user_id
                           WHERE p.community_id=? ORDER BY p.id DESC LIMIT 50`).all(req.params.id);
  res.json(rows.map(p => postRow(p, req.user.id)));
});
r.post('/communities/:id/posts', (req, res) => {
  if (!isMember(req.params.id, req.user.id)) return bad(res, 'Join this community first', 403);
  const body = clean(req.body.body);
  if (!body || body.length > MAX_LEN) return bad(res, `Post must be 1-${MAX_LEN} characters`);
  const id = db.prepare('INSERT INTO posts (community_id,user_id,body) VALUES (?,?,?)').run(req.params.id, req.user.id, body).lastInsertRowid;
  const p = db.prepare('SELECT p.*, u.name, u.initials, u.style FROM posts p JOIN users u ON u.id=p.user_id WHERE p.id=?').get(id);
  res.status(201).json(postRow(p, req.user.id));
});
r.post('/posts/:id/like', (req, res) => {
  if (!db.prepare('SELECT 1 FROM posts WHERE id=?').get(req.params.id)) return bad(res, 'Post not found', 404);
  const del = db.prepare('DELETE FROM post_likes WHERE post_id=? AND user_id=?').run(req.params.id, req.user.id);
  if (!del.changes) db.prepare('INSERT INTO post_likes VALUES (?,?)').run(req.params.id, req.user.id);
  res.json({ liked: !del.changes, likes: db.prepare('SELECT COUNT(*) n FROM post_likes WHERE post_id=?').get(req.params.id).n });
});
r.post('/posts/:id/comments', (req, res) => {
  if (!db.prepare('SELECT 1 FROM posts WHERE id=?').get(req.params.id)) return bad(res, 'Post not found', 404);
  const body = clean(req.body.body);
  if (!body || body.length > MAX_LEN) return bad(res, `Comment must be 1-${MAX_LEN} characters`);
  db.prepare('INSERT INTO comments (post_id,user_id,body) VALUES (?,?,?)').run(req.params.id, req.user.id, body);
  res.status(201).json({ ok: true });
});

// ---------- Teams ----------
r.get('/teams', (req, res) => res.json(db.prepare('SELECT * FROM teams ORDER BY id').all().map(t => ({
  ...t, requested: !!db.prepare('SELECT 1 FROM team_requests WHERE team_id=? AND user_id=?').get(t.id, req.user.id) }))));
r.post('/teams/:id/request', (req, res) => {
  if (!db.prepare('SELECT 1 FROM teams WHERE id=?').get(req.params.id)) return bad(res, 'Team not found', 404);
  db.prepare('INSERT OR IGNORE INTO team_requests VALUES (?,?)').run(req.params.id, req.user.id);
  res.status(201).json({ ok: true });
});

// ---------- Messages ----------
r.get('/messages/conversations', (req, res) => {
  const me = req.user.id, threads = new Map();
  const rows = db.prepare('SELECT * FROM messages WHERE sender_id=? OR receiver_id=? ORDER BY id').all(me, me);
  for (const m of rows) {
    const peer = m.sender_id === me ? m.receiver_id : m.sender_id;
    if (!threads.has(peer)) threads.set(peer, { messages: [], unread: false });
    const t = threads.get(peer);
    t.messages.push({ mine: m.sender_id === me, body: m.body, createdAt: m.created_at });
    t.lastId = m.id; t.lastAt = m.created_at;
    if (m.receiver_id === me && !m.is_read) t.unread = true;
  }
  const out = [...threads.entries()].sort((a, b) => b[1].lastAt.localeCompare(a[1].lastAt) || b[1].lastId - a[1].lastId).map(([peer, t]) => {
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(peer);
    return { id: u.id, name: u.name, initials: u.initials, style: u.style, unread: t.unread, messages: t.messages };
  });
  res.json(out);
});
r.post('/messages/:peerId', (req, res) => {
  const peer = req.params.peerId, body = clean(req.body.body);
  if (peer === req.user.id) return bad(res, "You can't message yourself");
  if (!db.prepare('SELECT 1 FROM users WHERE id=?').get(peer)) return bad(res, 'Student not found', 404);
  if (!body || body.length > MAX_LEN) return bad(res, `Message must be 1-${MAX_LEN} characters`);
  db.prepare('INSERT INTO messages (sender_id,receiver_id,body,is_read) VALUES (?,?,?,0)').run(req.user.id, peer, body);
  res.status(201).json({ ok: true });
});
r.post('/messages/:peerId/read', (req, res) => {
  db.prepare('UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=?').run(req.params.peerId, req.user.id);
  res.json({ ok: true });
});

r.use((req, res) => bad(res, 'Not found', 404));
module.exports = r;
