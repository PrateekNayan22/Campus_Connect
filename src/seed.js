// Fills an empty database with the same demo data the original page had.
const data = require('./seed-data.json');

const ME = { id: 'CC2026000', initials: 'YO', name: 'You', deptYear: 'CSE · 2nd Year', style: '',
  interests: ['AI & ML', 'Python', 'Hackathons', 'Web Development'] };

const TEAMS = [
  ['TEAM OPPORTUNITY', 'SIH 2026 — Smart Education', 'Building an intelligent platform for student collaboration.', 'UI/UX Designer + Backend Developer', 'AI,Web,Hackathon'],
  ['PROJECT TEAM', 'Campus Event Platform', 'Building a simple platform to discover and manage college events.', 'React Developer', 'React,Frontend'],
  ['RESEARCH TEAM', 'AI Research Project', 'Exploring AI solutions for student productivity.', 'ML Developer + Data Analyst', 'AI,Research'],
  ['STARTUP TEAM', 'Student Marketplace', 'Building a marketplace for campus services.', 'Product Designer', 'Startup,Design'],
];

const POSTS = [ // [authorId, body, likedByFirstN, [[commenterId, text], ...]]
  ['CC2026001', 'Anyone interested in building a project for the upcoming SIH? Looking for students with different skills!', 12, [
    ['CC2026002', "I'm interested! I can handle UI/UX."], ['CC2026003', "I can work on the frontend. Let's connect!"],
    ['CC2026004', 'Sounds interesting. What problem statement are you working on?']]],
  ['CC2026002', 'Just completed my first AI prototype! Would love feedback from the community.', 18, [
    ['CC2026001', 'Looks great! The idea has a lot of potential.'], ['CC2026005', 'Nice work! Would love to know which model you used.'],
    ['CC2026006', 'This could become a really useful campus product.']]],
];

module.exports = function seed(db) {
  if (db.prepare('SELECT COUNT(*) n FROM users').get().n > 0) return;
  const addUser = db.prepare('INSERT INTO users (id,initials,name,dept_year,style,why) VALUES (?,?,?,?,?,?)');
  const addInt = db.prepare('INSERT OR IGNORE INTO interests (user_id,interest) VALUES (?,?)');
  db.transaction(() => {
    addUser.run(ME.id, ME.initials, ME.name, ME.deptYear, ME.style, '');
    ME.interests.forEach(i => addInt.run(ME.id, i));
    // student tuple: [initials, name, deptYear, interests[], matchPct, why, style, id]
    for (const [ini, name, dy, ints, , why, style, id] of data.students) {
      addUser.run(id, ini, name, dy, style, why);
      ints.forEach(i => addInt.run(id, i));
    }
    const addComm = db.prepare('INSERT INTO communities (icon,name,base_members,tags) VALUES (?,?,?,?)');
    for (const [icon, name, n, tags] of data.communities) addComm.run(icon, name, Number(n), tags);
    for (const [t, title, desc, needs, tags] of TEAMS)
      db.prepare('INSERT INTO teams (kind,title,description,needs,tags) VALUES (?,?,?,?,?)').run(t, title, desc, needs, tags);

    // Seed posts in "AI & Innovation"
    const aiId = db.prepare("SELECT id FROM communities WHERE name='AI & Innovation'").get().id;
    const ids = data.students.map(s => s[7]);
    for (const [author, body, likes, comments] of POSTS) {
      const pid = db.prepare('INSERT INTO posts (community_id,user_id,body) VALUES (?,?,?)').run(aiId, author, body).lastInsertRowid;
      ids.slice(0, likes).forEach(u => db.prepare('INSERT INTO post_likes VALUES (?,?)').run(pid, u));
      comments.forEach(([u, text]) => db.prepare('INSERT INTO comments (post_id,user_id,body) VALUES (?,?,?)').run(pid, u, text));
    }
    // Seed conversations (original: "other" = them, "me" = you). Staggered timestamps keep order.
    const addMsg = db.prepare("INSERT INTO messages (sender_id,receiver_id,body,is_read,created_at) VALUES (?,?,?,?,datetime('now',?))");
    const ago = [-2, -60, -180, -1440]; // minutes ago for the last message in each thread
    data.conversations.forEach((c, ci) => {
      c.messages.forEach(([who, text], mi) => {
        const offset = `${ago[ci] - (c.messages.length - 1 - mi)} minutes`;
        addMsg.run(who === 'me' ? ME.id : c.id, who === 'me' ? c.id : ME.id, text, who === 'me' || !c.unread ? 1 : 0, offset);
      });
    });
  })();
  console.log('Database seeded with demo data.');
};
