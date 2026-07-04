const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── File Paths ───────────────────────────────────────────────────────────────
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const DIARY_FILE = path.join(__dirname, 'data', 'diary.json');

// ─── Helper: Read JSON file ───────────────────────────────────────────────────
function readJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// ─── Helper: Write JSON file ──────────────────────────────────────────────────
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const db = readJSON(USERS_FILE);

  // Check if username already exists
  const existing = db.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (existing) {
    return res.status(409).json({ error: 'Username already taken. Please choose another.' });
  }

  const newUser = {
    id: uuidv4(),
    username: username.trim(),
    password: password,
  };

  db.users.push(newUser);
  writeJSON(USERS_FILE, db);

  return res.status(201).json({
    message: 'Registration successful!',
    user: { id: newUser.id, username: newUser.username },
  });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const db = readJSON(USERS_FILE);

  const user = db.users.find(
    (u) =>
      u.username.toLowerCase() === username.toLowerCase() &&
      u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  return res.status(200).json({
    message: 'Login successful!',
    user: { id: user.id, username: user.username },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DIARY ENTRY ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/entries/:userId  — Get all entries for a user
app.get('/api/entries/:userId', (req, res) => {
  const { userId } = req.params;

  const db = readJSON(DIARY_FILE);
  const userEntries = db.entries
    .filter((e) => e.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest first

  return res.status(200).json({ entries: userEntries });
});

// POST /api/entries  — Create a new diary entry
app.post('/api/entries', (req, res) => {
  const { userId, title, content, mood } = req.body;

  if (!userId || !title || !content) {
    return res.status(400).json({ error: 'userId, title, and content are required.' });
  }

  const db = readJSON(DIARY_FILE);

  const newEntry = {
    id: uuidv4(),
    userId,
    title: title.trim(),
    content: content.trim(),
    mood: mood || 'neutral',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.entries.push(newEntry);
  writeJSON(DIARY_FILE, db);

  return res.status(201).json({ message: 'Entry created!', entry: newEntry });
});

// PUT /api/entries/:entryId  — Edit an existing diary entry
app.put('/api/entries/:entryId', (req, res) => {
  const { entryId } = req.params;
  const { title, content, mood, userId } = req.body;

  const db = readJSON(DIARY_FILE);
  const index = db.entries.findIndex((e) => e.id === entryId);

  if (index === -1) {
    return res.status(404).json({ error: 'Entry not found.' });
  }

  // Ensure the entry belongs to the requesting user
  if (db.entries[index].userId !== userId) {
    return res.status(403).json({ error: 'Unauthorized to edit this entry.' });
  }

  db.entries[index] = {
    ...db.entries[index],
    title: title !== undefined ? title.trim() : db.entries[index].title,
    content: content !== undefined ? content.trim() : db.entries[index].content,
    mood: mood !== undefined ? mood : db.entries[index].mood,
    updatedAt: new Date().toISOString(),
  };

  writeJSON(DIARY_FILE, db);

  return res.status(200).json({ message: 'Entry updated!', entry: db.entries[index] });
});

// DELETE /api/entries/:entryId  — Delete a diary entry
app.delete('/api/entries/:entryId', (req, res) => {
  const { entryId } = req.params;
  const { userId } = req.body;

  const db = readJSON(DIARY_FILE);
  const index = db.entries.findIndex((e) => e.id === entryId);

  if (index === -1) {
    return res.status(404).json({ error: 'Entry not found.' });
  }

  // Ensure the entry belongs to the requesting user
  if (db.entries[index].userId !== userId) {
    return res.status(403).json({ error: 'Unauthorized to delete this entry.' });
  }

  db.entries.splice(index, 1);
  writeJSON(DIARY_FILE, db);

  return res.status(200).json({ message: 'Entry deleted successfully.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Personal Diary Server running at http://localhost:${PORT}`);
  console.log(`   Users file  → ${USERS_FILE}`);
  console.log(`   Diary file  → ${DIARY_FILE}\n`);
});
