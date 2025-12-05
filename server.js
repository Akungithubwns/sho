const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const schedule = require("node-schedule");

const app = express();
const PORT = 3000;
const SECRET = "RAHASIA_BOT";

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const databaseDir = path.join(__dirname, "database");
const backupDir = path.join(__dirname, "backup");

// Load JSON helper
const loadJSON = (file) => JSON.parse(fs.readFileSync(path.join(databaseDir, file)));
const saveJSON = (file, data) => fs.writeFileSync(path.join(databaseDir, file), JSON.stringify(data, null, 2));

// Middleware auth
const auth = require("./auth");

// ======================== ROUTES ========================

// Login admin
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  let admins = loadJSON("admin.json");
  const admin = admins.find(a => a.username === username);
  if(!admin) return res.status(401).json({ message: "User tidak ditemukan" });
  // simple password check (bcrypt bisa ditambahkan)
  if(password !== "12345") return res.status(401).json({ message: "Password salah" });

  const token = jwt.sign({ username }, SECRET, { expiresIn: "12h" });
  res.json({ token });
});

// Get commands
app.get("/api/commands", auth, (req,res) => {
  const commands = loadJSON("commands.json");
  res.json(commands);
});

// Get backup list
app.get("/api/admin/backups", auth, (req,res) => {
  const files = fs.readdirSync(backupDir).sort();
  res.json(files);
});

// Restore backup
app.post("/api/admin/restore", auth, (req,res) => {
  const { file } = req.body;
  const backupFile = path.join(backupDir, file);
  if(!fs.existsSync(backupFile)) return res.status(404).json({ message: "Backup tidak ditemukan" });

  fs.cpSync(backupFile, databaseDir, { recursive: true, force: true });
  res.json({ message: "Restore berhasil" });
  console.log(`🔄 Backup ${file} di-restore`);
});

// Restart server
app.post("/api/admin/restart", auth, (req,res) => {
  res.json({ message: "Server akan restart..." });
  console.log("🔄 Restart server diminta via dashboard");
  process.exit(0);
});

// Stats command harian
app.get("/api/admin/stats", auth, (req,res) => {
  const log = loadJSON("log.json");
  const stats = {};
  log.forEach(entry => {
    const day = entry.date.split("T")[0];
    stats[day] = (stats[day] || 0) + 1;
  });
  res.json(stats);
});

// Limit user
app.get("/api/admin/limit", auth, (req,res) => {
  const limit = loadJSON("limit.json");
  res.json(limit);
});

// ======================== SCHEDULE BACKUP & RESET ========================

// Backup otomatis tiap 24 jam
schedule.scheduleJob("0 0 * * *", () => {
  const timestamp = new Date().toISOString().replace(/:/g,"-");
  const backupPath = path.join(backupDir, timestamp);
  fs.cpSync(databaseDir, backupPath, { recursive: true });
  console.log(`💾 Backup otomatis dibuat: ${backupPath}`);
});

// Reset limit tiap 24 jam
schedule.scheduleJob("0 0 * * *", () => {
  saveJSON("limit.json", {});
  console.log("🔄 Limit user di-reset otomatis");
});

// ======================== START SERVER ========================

app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});
