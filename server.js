import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

app.use(express.json());

app.post('/api/contact', (req, res) => {
  const submission = {
    ...req.body,
    receivedAt: new Date().toISOString(),
  };
  const logDir = path.join(__dirname, 'data');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'contact-submissions.json');
  let submissions = [];
  if (fs.existsSync(logFile)) {
    try { submissions = JSON.parse(fs.readFileSync(logFile, 'utf-8')); } catch {}
  }
  submissions.push(submission);
  fs.writeFileSync(logFile, JSON.stringify(submissions, null, 2));
  res.json({ success: true });
});

app.use(express.static(DIST_DIR, {
  maxAge: '1h',
  etag: true,
  lastModified: true,
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving files from ${DIST_DIR}`);
});
