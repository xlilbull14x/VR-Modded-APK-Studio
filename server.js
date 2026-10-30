const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

const DB_FILE = path.join(__dirname, 'database.json');

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { users: {}, globalMemory: [], feedback: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!data.feedback) data.feedback = [];
    return data;
  } catch (err) {
    const initialData = { users: {}, globalMemory: [], feedback: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing database.json:", err);
  }
}

// 1. Authentication
app.post('/api/auth', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required." });

  const db = loadDB();
  if (db.users[username]) {
    if (db.users[username].password !== password) {
      return res.status(401).json({ error: "Invalid password." });
    }
  } else {
    db.users[username] = { password, apiKey: "" };
    saveDB(db);
  }

  res.json({ success: true, username, apiKey: db.users[username].apiKey || "" });
});

// 2. Settings
app.post('/api/settings', (req, res) => {
  const { username, apiKey } = req.body;
  const db = loadDB();
  if (!db.users[username]) return res.status(404).json({ error: "User not found." });

  db.users[username].apiKey = apiKey;
  saveDB(db);
  res.json({ success: true });
});

// 3. Add Scan Record
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
  if (db.globalMemory.length > 100) db.globalMemory = db.globalMemory.slice(0, 100);

  saveDB(db);
  res.json({ success: true, memoryCount: db.globalMemory.length, newRecord: recordWithMeta });
});

// 4. Get Scan Memory
app.get('/api/memory', (req, res) => {
  const db = loadDB();
  res.json({ globalMemory: db.globalMemory });
});

// 5. Edit Memory Record
app.post('/api/memory/edit', (req, res) => {
  const { username, recordId, updatedData } = req.body;
  const db = loadDB();

  const recordIndex = db.globalMemory.findIndex(r => r.id === recordId);
  if (recordIndex === -1) return res.status(404).json({ error: "Record not found." });

  if (db.globalMemory[recordIndex].owner !== username) {
    return res.status(403).json({ error: "Permission denied." });
  }

  db.globalMemory[recordIndex] = {
    ...db.globalMemory[recordIndex],
    ...updatedData
  };

  saveDB(db);
  res.json({ success: true });
});

// 6. Submit Mod Feedback & Review
app.post('/api/feedback/add', (req, res) => {
  const { username, apkName, rating, comments, modStatus } = req.body;
  if (!apkName || !rating) return res.status(400).json({ error: "APK name and rating are required." });

  const db = loadDB();
  const newFeedback = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2),
    username: username || "Anonymous",
    apkName,
    rating: Number(rating),
    comments: comments || "No comments provided.",
    modStatus: modStatus || "Unknown",
    timestamp: new Date().toLocaleString()
  };

  db.feedback.unshift(newFeedback);
  saveDB(db);
  res.json({ success: true, feedback: db.feedback });
});

// 7. Get All Feedback
app.get('/api/feedback', (req, res) => {
  const db = loadDB();
  res.json({ feedback: db.feedback || [] });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
