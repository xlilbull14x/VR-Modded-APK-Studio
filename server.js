const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

const DB_FILE = path.join(__dirname, 'database.json');

// Safe Database Loader with automatic recovery if database.json is missing/corrupted
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { users: {}, globalMemory: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error("Database read error. Initializing new database file.", err);
    const initialData = { users: {}, globalMemory: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing to database.json:", err);
  }
}

// 1. User Registration & Authentication Route
app.post('/api/auth', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const db = loadDB();
  if (db.users[username]) {
    if (db.users[username].password !== password) {
      return res.status(401).json({ error: "Invalid password for existing user." });
    }
  } else {
    db.users[username] = { password, apiKey: "" };
    saveDB(db);
  }

  res.json({ success: true, username, apiKey: db.users[username].apiKey || "" });
});

// 2. User Settings Updates (API Key Persistence)
app.post('/api/settings', (req, res) => {
  const { username, apiKey } = req.body;
  const db = loadDB();
  if (!db.users[username]) {
    return res.status(404).json({ error: "User profile not found." });
  }

  db.users[username].apiKey = apiKey;
  saveDB(db);
  res.json({ success: true });
});

// 3. Add Scanned Mod Binary Record to Shared Network Memory
app.post('/api/memory/add', (req, res) => {
  const { username, scanRecord } = req.body;
  const db = loadDB();

  const recordWithMeta = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2),
    owner: username || "Anonymous_Guest",
    timestamp: new Date().toISOString(),
    ...scanRecord
  };

  db.globalMemory.unshift(recordWithMeta);
  // Cap shared history window at 100 entries to optimize memory usage
  if (db.globalMemory.length > 100) {
    db.globalMemory = db.globalMemory.slice(0, 100);
  }

  saveDB(db);
  res.json({ success: true, memoryCount: db.globalMemory.length, newRecord: recordWithMeta });
});

// 4. Retrieve All Shared Scan Memory Records
app.get('/api/memory', (req, res) => {
  const db = loadDB();
  res.json({ globalMemory: db.globalMemory });
});

// 5. Edit Memory Entry (Enforces Strict Owner-Only Permissions)
app.post('/api/memory/edit', (req, res) => {
  const { username, recordId, updatedData } = req.body;
  const db = loadDB();

  const recordIndex = db.globalMemory.findIndex(r => r.id === recordId);
  if (recordIndex === -1) {
    return res.status(404).json({ error: "Record not found in database." });
  }

  if (db.globalMemory[recordIndex].owner !== username) {
    return res.status(403).json({ error: "Permission denied: You can only edit memories uploaded by your account." });
  }

  db.globalMemory[recordIndex] = {
    ...db.globalMemory[recordIndex],
    ...updatedData
  };

  saveDB(db);
  res.json({ success: true });
});

// Serve frontend app on all unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`VR Inspector Web Server running on port ${PORT}`);
});