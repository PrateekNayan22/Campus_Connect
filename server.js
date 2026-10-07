const express = require('express');
const path = require('path');
const db = require('./src/db');
require('./src/seed')(db);

const app = express();
app.use(express.json({ limit: '50kb' }));

// No login yet: every request acts as one demo student. Swap this for real auth later.
app.use((req, res, next) => {
  req.user = db.prepare('SELECT * FROM users WHERE id=?').get(process.env.CURRENT_USER_ID || 'CC2026000');
  req.user ? next() : res.status(500).json({ error: 'CURRENT_USER_ID does not match any student' });
});

app.use('/api', require('./src/routes'));
app.use(express.static(path.join(__dirname, 'public')));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

const PORT = process.env.PORT || 3000;
if (require.main === module) app.listen(PORT, () => console.log(`Campus Connect running at http://localhost:${PORT}`));
module.exports = app;
