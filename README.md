# Buzzer Beater

A drag-to-shoot basketball game with a **shared** leaderboard. The Node server
serves the game and stores every player's best run centrally, so everyone sees
the same board.

## Files
- `index.html` — the game (talks to the API at `/api/scores`)
- `server.js` — Express server: serves the game + the leaderboard API
- `store.js` — score storage (Postgres if `DATABASE_URL` is set, else a JSON file)
- `package.json` — dependencies and the `start` script

## Run locally
```
npm install
npm start
```
Then open http://localhost:3000.

## Deploy on Render (Web Service)
1. Push these files to a GitHub repo.
2. On render.com: **New +** → **Web Service** → connect the repo.
3. Render auto-detects Node. Confirm **Build Command** `npm install` and
   **Start Command** `npm start`.
4. Create the service. Your game is live at the `.onrender.com` URL.

## Making scores durable
Without a database, scores live in `scores.json` on the server's disk. On
Render's **free** plan that disk is wiped whenever the service restarts, sleeps,
or redeploys — fine for testing, but the board resets.

For a board that lasts, give the server a Postgres database and set a
`DATABASE_URL` environment variable (Render dashboard → your service →
**Environment**). Any Postgres works — Render's own, Neon, or Supabase all have
free tiers. The server creates its table automatically on first run.

## API
- `GET /api/scores` → `{ "scores": [ { "name", "score" }, ... ] }` (top 25)
- `POST /api/scores` with `{ "name": "...", "score": 123 }` → updated top 25

Names are capped at 20 characters and one row is kept per name (the best score).
