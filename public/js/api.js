/* Connects the original UI (app.js) to the backend API.
   app.js starts with empty data; everything below loads it from /api and saves changes back. */

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

const ago = iso => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso.replace(' ', 'T') + 'Z')) / 60000));
  return m < 1 ? 'Now' : m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : m < 2880 ? 'Yesterday' : Math.round(m / 1440) + 'd';
};
const agoLong = iso => { const t = ago(iso); return t === 'Now' || t === 'Yesterday' ? t : t + ' ago'; };

let commIds = [];            // index in `communities` -> database id
const pending = new Set();   // students you already sent a connection request to

const toConv = c => {
  const last = c.messages[c.messages.length - 1];
  return { id: c.id, name: c.name, initial: c.initials, style: c.style, unread: c.unread,
    preview: esc(last.body), time: ago(last.createdAt),
    messages: c.messages.map(m => [m.mine ? 'me' : 'other', esc(m.body)]) };
};

function updateBadge() {
  const n = conversations.filter(c => c.unread).length, el = document.querySelector('.msgbadge');
  el.textContent = n; el.style.display = n ? '' : 'none';
}

async function loadAll() {
  const [me, st, cm, cv, teams, conns] = await Promise.all([api('/me'), api('/students'), api('/communities'),
    api('/messages/conversations'), api('/teams'), api('/connections')]);
  currentUser.interests = me.interests;
  students.length = 0;
  st.forEach(s => students.push([s.initials, s.name, s.deptYear, s.interests, s.match + '%', s.why, s.style, s.id]));
  communities.length = 0; commIds = [];
  cm.forEach((c, i) => { communities.push([c.icon, c.name, String(c.members), c.tags]); commIds.push(c.id); if (c.joined) joinedCommunities[i] = true; });
  conversations = cv.map(toConv);
  conns.forEach(c => pending.add(c.id));
  renderTeams(teams); updateBadge(); mini(); renderStudents(); renderCommunities(); renderDMList();
}

/* ---------- Teams ---------- */
function renderTeams(list) {
  document.querySelector('.teamgrid').innerHTML = list.map(t => `<div class="teamcard"><div class="pill">${esc(t.kind)}</div><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p><div class="need">Looking for: ${esc(t.needs)}</div><div class="chips">${t.tags.split(',').map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div><button class="primary" style="margin-top:14px" ${t.requested ? 'disabled' : ''} onclick="requestTeam(${t.id},this)">${t.requested ? '✓ Request Sent' : 'Request to Join'}</button></div>`).join('');
}
async function requestTeam(id, btn) {
  try { await api('/teams/' + id + '/request', { method: 'POST' }); btn.textContent = '✓ Request Sent'; btn.disabled = true; }
  catch (e) { alert(e.message); }
}

/* ---------- Connections ---------- */
const _connectPerson = connectPerson, _profile = profile;
connectPerson = function (i, fromProfile = false) {
  api('/connections', { method: 'POST', body: { toId: students[i][7] } }).then(() => pending.add(students[i][7])).catch(e => alert(e.message));
  _connectPerson(i, fromProfile);
};
profile = function (i) {
  _profile(i);
  const b = document.getElementById('profileConnectBtn');
  if (b && pending.has(students[i][7])) { b.innerHTML = '✓ Connection Request Sent'; b.style.background = '#16a34a'; }
};

/* ---------- Messages ---------- */
const _renderDMChat = renderDMChat;
renderDMChat = function (name) {
  const c = conversations.find(x => x.name === name);
  if (c && c.unread) api('/messages/' + c.id + '/read', { method: 'POST' }).catch(() => {});
  _renderDMChat(name); updateBadge();
};
sendDM = function () {
  const input = document.getElementById('dmInput'), v = input.value.trim();
  if (!v) return;
  const c = conversations.find(x => x.name === activeConversation);
  input.value = '';
  api('/messages/' + c.id, { method: 'POST', body: { body: v } })
    .then(() => { c.messages.push(['me', esc(v)]); c.preview = esc(v); c.time = 'Now'; renderDMChat(c.name); })
    .catch(e => alert(e.message));
};

/* ---------- Communities, posts, likes, comments ---------- */
const _joinCurrent = joinCurrentCommunity, _renderDetail = renderCommunityDetail;
joinCurrentCommunity = function () {
  api('/communities/' + commIds[currentCommunity] + '/join', { method: 'POST' })
    .then(() => { communities[currentCommunity][2] = String(+communities[currentCommunity][2] + 1); _joinCurrent(); })
    .catch(e => alert(e.message));
};
renderCommunityDetail = function () {
  _renderDetail();
  document.querySelector('.communitytitle .sm').textContent = communities[currentCommunity][2] + ' members · Active today';
  if (joinedCommunities[currentCommunity] && currentTab === 'overview') loadPosts();
};

const composer = `<div class="post"><textarea id="newPost" rows="3" placeholder="Share something with the community..." style="width:100%;border:1px solid var(--line);border-radius:8px;padding:10px;font:inherit"></textarea><button class="primary" style="margin-top:10px" onclick="createPost()">Post</button></div>`;

function postHTML(p) {
  const i = students.findIndex(s => s[7] === p.author.id), click = i >= 0 ? `onclick="profile(${i})"` : '';
  return `<div class="post"><div class="row"><div class="av ${p.author.style}" style="cursor:pointer" ${click}>${esc(p.author.initials)}</div><div style="cursor:pointer" ${click}><div class="nm">${esc(p.author.name)}</div><div class="sm">${agoLong(p.createdAt)}</div></div></div><p>${esc(p.body)}</p><div class="postactions"><button class="likebtn ${p.liked ? 'liked' : ''}" onclick="toggleLike(this,'likes${p.id}')">👍 <span id="likes${p.id}">${p.likes}</span> Likes</button><button class="commenttoggle" onclick="toggleComments('comments${p.id}')">💬 <span id="ccount${p.id}">${p.comments.length}</span> Comments</button></div><div class="comments" id="comments${p.id}">${p.comments.map(c => `<div class="comment"><b>${esc(c.name)}:</b> ${esc(c.body)}</div>`).join('')}<div class="commentinput"><input id="input${p.id}" placeholder="Write a comment..."><button class="primary" onclick="addComment('comments${p.id}','input${p.id}')">Post</button></div></div></div>`;
}
async function loadPosts() {
  const col = document.querySelector('#communityContent .communitycontent > div:first-child'), cid = commIds[currentCommunity];
  if (!col) return;
  try {
    const posts = await api('/communities/' + cid + '/posts');
    if (commIds[currentCommunity] === cid) col.innerHTML = composer + posts.map(postHTML).join('');
  } catch (e) { col.innerHTML = `<div class="post">${esc(e.message)}</div>`; }
}
async function createPost() {
  const t = document.getElementById('newPost'), v = t.value.trim();
  if (!v) return;
  try { await api('/communities/' + commIds[currentCommunity] + '/posts', { method: 'POST', body: { body: v } }); loadPosts(); }
  catch (e) { alert(e.message); }
}
toggleLike = function (btn, countId) {
  api('/posts/' + countId.replace('likes', '') + '/like', { method: 'POST' })
    .then(r => { document.getElementById(countId).textContent = r.likes; btn.classList.toggle('liked', r.liked); })
    .catch(e => alert(e.message));
};
addComment = function (containerId, inputId) {
  const input = document.getElementById(inputId), v = input.value.trim(), id = containerId.replace('comments', '');
  if (!v) return;
  api('/posts/' + id + '/comments', { method: 'POST', body: { body: v } }).then(() => {
    const el = document.createElement('div'); el.className = 'comment'; el.innerHTML = '<b>You:</b> ' + esc(v);
    document.getElementById(containerId).insertBefore(el, input.parentElement);
    const n = document.getElementById('ccount' + id); n.textContent = +n.textContent + 1; input.value = '';
  }).catch(e => alert(e.message));
};

loadAll().catch(e => {
  console.error(e);
  document.body.insertAdjacentHTML('afterbegin', '<div style="background:#fee2e2;color:#991b1b;padding:10px;text-align:center;font-size:13px">Could not reach the server. Start it with <b>npm start</b> and open http://localhost:3000</div>');
});
