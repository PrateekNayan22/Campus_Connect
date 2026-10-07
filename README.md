# Campus Connect

Discover students, join communities, find teams and chat privately.
Node.js + Express + SQLite backend, plain HTML/CSS/JS frontend.

## Run it locally

1. Install **Node.js 18 or newer** (the LTS version is best): https://nodejs.org
2. In this folder:
   ```bash
   npm install
   npm start
   ```
3. Open **http://localhost:3000**

The first start creates `data/campus.db` and fills it with the demo students, communities, posts and chats.
To wipe all data and start over: `npm run reset`, then `npm start`.

> Don't open `public/index.html` by double-clicking it. The page needs the server running, otherwise it shows a red "Could not reach the server" bar.

## Push to GitHub

Create an empty repository on GitHub first (no README), then:

```bash
git init
git add .
git commit -m "Initial commit: Campus Connect"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/campus-connect.git
git push -u origin main
```

`node_modules/` and the database file are already in `.gitignore`, so they won't be uploaded.

## Project structure

```
server.js            Starts Express, serves /public and mounts /api
src/db.js            SQLite connection + table definitions
src/seed.js          Demo data (loaded only when the database is empty)
src/seed-data.json   Students, communities and chats taken from your original page
src/routes.js        All API endpoints
public/index.html    The page (markup only)
public/css/styles.css
public/js/app.js     Original UI code (no hardcoded data any more)
public/js/api.js     Loads data from the API and saves changes back
public/img/logo.png
data/                SQLite file lives here (git-ignored)
```

## API

All routes are under `/api`. Errors return `{ "error": "message" }` with a 4xx status.

| Method | Route | What it does |
| --- | --- | --- |
| GET | `/health` | Server check |
| GET | `/me` | The current (demo) user |
| GET | `/students?q=` | Students with match score, best match first. `q` searches name, ID, department, interests |
| GET | `/students/:id` | One student |
| GET / POST | `/connections` | List sent requests / send one (`{ "toId": "CC2026001" }`) |
| GET | `/communities` | All communities with member count and `joined` flag |
| GET | `/communities/:id` | One community |
| POST / DELETE | `/communities/:id/join` | Join / leave |
| GET / POST | `/communities/:id/posts` | List / create posts (members only) |
| POST | `/posts/:id/like` | Toggle like |
| POST | `/posts/:id/comments` | Add comment (`{ "body": "..." }`) |
| GET | `/teams` | Team opportunities |
| POST | `/teams/:id/request` | Request to join a team |
| GET | `/messages/conversations` | Your chats with all messages, newest first |
| POST | `/messages/:studentId` | Send a message (`{ "body": "..." }`) |
| POST | `/messages/:studentId/read` | Mark a chat as read |

Settings (optional environment variables): `PORT`, `DB_PATH`, `CURRENT_USER_ID`. See `.env.example`.

## Things to know

- **There is no login yet.** Every request acts as one demo student, "You" (`CC2026000`), set in `server.js`. Before real users can use this, add sign-up/login (for example with `express-session` or JWT) and replace that middleware so `req.user` comes from the logged-in session.
- Messages, posts and comments are escaped before display, so pasted HTML shows as plain text.
- New messages from other people appear after a page refresh (there is no live chat yet; WebSockets would be the next step).
- The **Members** and **Discussions** tabs inside a community, the filter sidebar on Discover, the "Create Community" button and the assistant chat bubble are still UI-only, as in your original page.
- SQLite stores data in a file. If you deploy to Render, Railway or Fly.io, attach a persistent disk/volume and point `DB_PATH` at it, otherwise data resets on every deploy.
- `public/img/logo.png` is about 870 KB. Resizing it to around 200 px will make the page load faster.
