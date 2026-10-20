// Score store with two backends, chosen at startup:
//   - Postgres, when DATABASE_URL is set (durable; use this in production).
//   - A local JSON file otherwise (fine for trying it out; on a host with an
//     ephemeral filesystem, like Render's free plan, it resets when the
//     service restarts or redeploys).
// Both expose the same async interface: top() and submit(name, score).

const fs = require('fs');
const path = require('path');

function clampName(n) { return String(n == null ? '' : n).trim().slice(0, 20); }
function clampScore(s) {
  s = Math.floor(Number(s));
  if (!isFinite(s) || s < 0) s = 0;
  if (s > 1000000) s = 1000000;
  return s;
}

let impl;

if (process.env.DATABASE_URL) {
  // ---- Postgres backend ----
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const ready = pool.query(
    'CREATE TABLE IF NOT EXISTS scores (key TEXT PRIMARY KEY, name TEXT NOT NULL, score INTEGER NOT NULL)'
  );

  impl = {
    kind: 'postgres',
    async top() {
      await ready;
      const r = await pool.query(
        'SELECT name, score FROM scores ORDER BY score DESC, name ASC LIMIT 25'
      );
      return r.rows;
    },
    async submit(name, score) {
      await ready;
      name = clampName(name);
      score = clampScore(score);
      if (!name) return;
      const key = name.toLowerCase();
      await pool.query(
        'INSERT INTO scores (key, name, score) VALUES ($1, $2, $3) ' +
        'ON CONFLICT (key) DO UPDATE SET ' +
        'score = GREATEST(scores.score, EXCLUDED.score), name = EXCLUDED.name',
        [key, name, score]
      );
    }
  };
} else {
  // ---- JSON file backend ----
  const file = path.join(process.env.DATA_DIR || __dirname, 'scores.json');

  function load() {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return {}; }
  }
  function save(obj) {
    try { fs.writeFileSync(file, JSON.stringify(obj)); }
    catch (e) { console.error('score save failed:', e.message); }
  }

  impl = {
    kind: 'json-file',
    async top() {
      const o = load();
      return Object.keys(o).map(function (k) { return o[k]; })
        .sort(function (a, b) { return b.score - a.score || a.name.localeCompare(b.name); })
        .slice(0, 25)
        .map(function (r) { return { name: r.name, score: r.score }; });
    },
    async submit(name, score) {
      name = clampName(name);
      score = clampScore(score);
      if (!name) return;
      const key = name.toLowerCase();
      const o = load();
      if (!o[key] || score > o[key].score) o[key] = { name: name, score: score };
      save(o);
    }
  };
}

module.exports = impl;
