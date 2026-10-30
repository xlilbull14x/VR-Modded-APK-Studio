const express = require('express');
const path = require('path');
const fs = require('fs');
const { analyzeBinaries } = require('./mod-analyzer');
const { generateOfflineResponse } = require('./ai-engine');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.json');
const BACKUP_DB_FILE = path.join(__dirname, 'database_backup.json');

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    if (fs.existsSync(BACKUP_DB_FILE)) {
      try {
        const backup = JSON.parse(fs.readFileSync(BACKUP_DB_FILE, 'utf8'));
        fs.writeFileSync(DB_FILE, JSON.stringify(backup, null, 2));
        return backup;
      } catch (e) { console.error("Backup recovery failed."); }
    }
    const initial = { users: {}, globalMemory: [], gameArchives: {}, feedback: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!data.users) data.users = {};
    if (!data.globalMemory) data.globalMemory = [];
    if (!data.gameArchives) data.gameArchives = {};
    if (!data.feedback) data.feedback = [];
    return data;
  } catch (err) {
    return { users: {}, globalMemory: [], gameArchives: {}, feedback: [] };
  }
}

function saveDB(data) {
  try {
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, serialized);
    fs.writeFileSync(BACKUP_DB_FILE, serialized);
  } catch (err) {
    console.error("Database save error:", err);
  }
}

function sanitizeGameKey(filename) {
  return filename.toLowerCase().replace(/_v?\d+(\.\d+)*\b/g, '').replace(/\.apk$/i, '').replace(/[^a-z0-9]/g, '_');
}

// 1. Auth Route
app.post('/api/auth', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required." });

  const db = loadDB();
  if (db.users[username]) {
    if (db.users[username].password !== password) return res.status(401).json({ error: "Invalid password." });
  } else {
    db.users[username] = { password, apiKey: "" };
    saveDB(db);
  }
  res.json({ success: true, username, apiKey: db.users[username].apiKey || "" });
});

// 2. Settings Route
app.post('/api/settings', (req, res) => {
  const { username, apiKey } = req.body;
  const db = loadDB();
  if (!db.users[username]) return res.status(404).json({ error: "User not found." });
  db.users[username].apiKey = apiKey;
  saveDB(db);
  res.json({ success: true });
});

// 3. Add Scan & Analyze via Analyzer Module
app.post('/api/memory/add', (req, res) => {
  const { username, scanRecord } = req.body;
  const db = loadDB();

  const gameKey = sanitizeGameKey(scanRecord.apkName);
  const recordId = Date.now().toString(36) + Math.random().toString(36).substring(2);

  const newRecord = {
    id: recordId,
    gameKey,
    owner: username || "Anonymous_Guest",
    timestamp: new Date().toISOString(),
    ...scanRecord
  };

  db.globalMemory.unshift(newRecord);
  if (db.globalMemory.length > 300) db.globalMemory = db.globalMemory.slice(0, 300);

  if (!db.gameArchives[gameKey]) {
    db.gameArchives[gameKey] = {
      gameTitle: scanRecord.apkName.replace(/\.apk$/i, ''),
      firstScanned: new Date().toISOString(),
      versionHistory: []
    };
  }

  db.gameArchives[gameKey].lastUpdated = new Date().toISOString();
  db.gameArchives[gameKey].versionHistory.unshift(newRecord);

  saveDB(db);
  res.json({ success: true, gameArchive: db.gameArchives[gameKey], newRecord });
});

// 4. Memory Retrieval
app.get('/api/memory', (req, res) => {
  const db = loadDB();
  res.json({ globalMemory: db.globalMemory, gameArchives: db.gameArchives });
});

// 5. AI Query Route (Supports offline modular engine + OpenAI)
app.post('/api/ai/query', (req, res) => {
  const { mode, prompt, currentScan } = req.body;
  const db = loadDB();
  
  if (mode === 'offline') {
    const responseText = generateOfflineResponse(prompt, currentScan, db.globalMemory, db.gameArchives);
    return res.json({ success: true, response: responseText });
  } else {
    res.json({ success: true, response: "OpenAI engine ready. Pass API key on client requests." });
  }
});

// 6. Feedback Routes
app.post('/api/feedback/add', (req, res) => {
  const { username, apkName, rating, comments, modStatus } = req.body;
  const db = loadDB();
  const newFeedback = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2),
    username: username || "Anonymous",
    apkName,
    rating: Number(rating),
    comments: comments || "No comments.",
    modStatus: modStatus || "Unknown",
    timestamp: new Date().toLocaleString()
  };
  db.feedback.unshift(newFeedback);
  saveDB(db);
  res.json({ success: true, feedback: db.feedback });
});

app.get('/api/feedback', (req, res) => {
  const db = loadDB();
  res.json({ feedback: db.feedback || [] });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`VR Mod Studio server running on port ${PORT}`);
});
