// Buzzer Beater — serves the game and a small shared-leaderboard API.
const express = require('express');
const path = require('path');
const store = require('./store');

const app = express();
app.use(express.json({ limit: '8kb' }));

// --- Leaderboard API ---
app.get('/api/scores', async function (req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ scores: await store.top() });
  } catch (e) {
    console.error('GET /api/scores', e.message);
    res.status(500).json({ error: 'read_failed' });
  }
});

app.post('/api/scores', async function (req, res) {
  try {
    const body = req.body || {};
    const name = body.name;
    const score = body.score;
    if (typeof name !== 'string' || typeof score !== 'number' || !isFinite(score)) {
      return res.status(400).json({ error: 'bad_input' });
    }
    if (!name.trim()) return res.status(400).json({ error: 'empty_name' });
    await store.submit(name, score);
    res.json({ scores: await store.top() });
  } catch (e) {
    console.error('POST /api/scores', e.message);
    res.status(500).json({ error: 'write_failed' });
  }
});

// --- Static game files (index.html and anything beside it) ---
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log('Buzzer Beater listening on :' + PORT + ' (store: ' + store.kind + ')');
});
