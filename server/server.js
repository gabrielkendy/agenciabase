import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { google } from 'googleapis';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files in production
if (isProduction) {
  const distPath = path.join(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
  }
}

// Database setup
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'db.json');
const defaultData = {
  agents: [],
  knowledge_files: [],
  tasks: [],
  clients: [],
  chat_messages: [],
  team_messages: [],
  oauth_tokens: [],
  notifications: [],
  media_gallery: []
};

const adapter = new JSONFile(dbPath);
const db = new Low(adapter, defaultData);
await db.read();

// Seed default agents
if (db.data.agents.length === 0) {
  db.data.agents = [
    { id: 'agent-sofia', name: 'Sofia', role: 'Gestora de Projetos', description: 'Coordena o time e garante entregas no prazo', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=ffdfbf', systemInstruction: 'Você é Sofia, Gestora de Projetos especializada em marketing digital. Coordene demandas, prazos e a comunicação entre equipe e clientes. Sempre responda em português brasileiro.', model: 'gemini-2.0-flash', isOnline: true },
    { id: 'agent-lucas', name: 'Lucas', role: 'Planejador de Conteúdo', description: 'Estrategista de conteúdo e calendário editorial', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&backgroundColor=c0aede', systemInstruction: 'Você é Lucas, Planejador de Conteúdo. Crie estratégias de conteúdo, calendários editoriais e planejamentos para redes sociais. Sempre responda em português brasileiro.', model: 'gemini-2.0-flash', isOnline: true },
    { id: 'agent-clara', name: 'Clara', role: 'Designer de Carrosséis', description: 'Especialista em carrosséis e posts visuais', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Clara&backgroundColor=ffd5dc', systemInstruction: 'Você é Clara, Designer especializada em carrosséis para Instagram. Crie roteiros visuais, sugira layouts e textos para cada slide. Sempre responda em português brasileiro.', model: 'gemini-2.0-flash', isOnline: true },
    { id: 'agent-leo', name: 'Leo', role: 'Roteirista de Vídeos', description: 'Cria roteiros para Reels, TikTok e YouTube', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=d1d4f9', systemInstruction: 'Você é Leo, Roteirista de Vídeos. Crie roteiros envolventes para Reels, TikTok e YouTube com ganchos fortes e CTAs. Sempre responda em português brasileiro.', model: 'gemini-2.0-flash', isOnline: true },
    { id: 'agent-bia', name: 'Bia', role: 'Criadora de Posts', description: 'Especialista em posts únicos e stories', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bia&backgroundColor=ffcab0', systemInstruction: 'Você é Bia, Criadora de Posts. Crie conteúdos únicos, legendas criativas e stories engajadores. Sempre responda em português brasileiro.', model: 'gemini-2.0-flash', isOnline: true },
    { id: 'agent-davi', name: 'Davi', role: 'Redator de Legendas', description: 'Copywriter especialista em legendas', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Davi&backgroundColor=b6e3f4', systemInstruction: 'Você é Davi, Redator de Legendas. Escreva legendas persuasivas com ganchos, storytelling e CTAs efetivos. Sempre responda em português brasileiro.', model: 'gemini-2.0-flash', isOnline: true },
    { id: 'agent-ana', name: 'Ana', role: 'Analista de Dados', description: 'Organiza dados e planilhas', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana&backgroundColor=c1f0c1', systemInstruction: 'Você é Ana, Analista de Dados. Organize informações em tabelas, analise métricas e crie relatórios. Sempre responda em português brasileiro.', model: 'gemini-2.0-flash', isOnline: true },
  ];
  await db.write();
  console.log('✅ Agentes padrão criados');
}

// File upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ==================== API ROUTES ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

// AGENTS
app.get('/api/agents', async (req, res) => {
  await db.read();
  const agents = db.data.agents.map(a => ({
    ...a,
    files: db.data.knowledge_files.filter(f => f.agentId === a.id)
  }));
  res.json(agents);
});

app.put('/api/agents/:id', async (req, res) => {
  await db.read();
  const idx = db.data.agents.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.data.agents[idx] = { ...db.data.agents[idx], ...req.body, updatedAt: new Date().toISOString() };
  await db.write();
  res.json({ success: true });
});

// KNOWLEDGE
app.get('/api/knowledge', async (req, res) => {
  await db.read();
  res.json(db.data.knowledge_files.filter(f => f.isGlobal));
});

app.post('/api/knowledge', upload.single('file'), async (req, res) => {
  await db.read();
  const id = uuidv4();
  const file = {
    id,
    name: req.file?.originalname || req.body.name,
    content: req.file ? req.file.buffer.toString('utf-8') : req.body.content,
    type: 'text',
    source: req.body.source || 'upload',
    agentId: req.body.agentId || null,
    isGlobal: !req.body.agentId,
    createdAt: new Date().toISOString()
  };
  db.data.knowledge_files.push(file);
  await db.write();
  res.json(file);
});

app.delete('/api/knowledge/:id', async (req, res) => {
  await db.read();
  db.data.knowledge_files = db.data.knowledge_files.filter(f => f.id !== req.params.id);
  await db.write();
  res.json({ success: true });
});

// TASKS
app.get('/api/tasks', async (req, res) => {
  await db.read();
  res.json(db.data.tasks);
});

app.post('/api/tasks', async (req, res) => {
  await db.read();
  const task = { id: uuidv4(), ...req.body, approvalToken: uuidv4(), createdAt: new Date().toISOString() };
  db.data.tasks.push(task);
  await db.write();
  res.json(task);
});

app.put('/api/tasks/:id', async (req, res) => {
  await db.read();
  const idx = db.data.tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.data.tasks[idx] = { ...db.data.tasks[idx], ...req.body, updatedAt: new Date().toISOString() };
  await db.write();
  res.json({ success: true });
});

app.delete('/api/tasks/:id', async (req, res) => {
  await db.read();
  db.data.tasks = db.data.tasks.filter(t => t.id !== req.params.id);
  await db.write();
  res.json({ success: true });
});

// APPROVAL (external link for clients)
app.get('/api/approval/:token', async (req, res) => {
  await db.read();
  const task = db.data.tasks.find(t => t.approvalToken === req.params.token);
  if (!task) return res.status(404).json({ error: 'Not found' });
  res.json({ id: task.id, title: task.title, description: task.description, caption: task.caption, mediaUrls: task.mediaUrls || [], status: task.approvalStatus || 'pending' });
});

app.post('/api/approval/:token', async (req, res) => {
  await db.read();
  const idx = db.data.tasks.findIndex(t => t.approvalToken === req.params.token);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.data.tasks[idx].approvalStatus = req.body.status;
  db.data.tasks[idx].status = req.body.status === 'approved' ? 'approved' : 'review';
  if (req.body.feedback) db.data.tasks[idx].description += `\n\n[FEEDBACK CLIENTE]: ${req.body.feedback}`;
  await db.write();
  res.json({ success: true });
});

// NOTIFICATIONS
app.get('/api/notifications', async (req, res) => {
  await db.read();
  res.json(db.data.notifications.slice(-50).reverse());
});

app.post('/api/notifications', async (req, res) => {
  await db.read();
  const notif = { id: uuidv4(), ...req.body, isRead: false, createdAt: new Date().toISOString() };
  db.data.notifications.push(notif);
  await db.write();
  res.json(notif);
});

// GOOGLE OAUTH
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/oauth/google/callback';

const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

app.get('/api/oauth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(400).json({ error: 'Google OAuth not configured' });
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent'
  });
  res.json({ url });
});

app.get('/api/oauth/google/callback', async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(tokens);
    await db.read();
    db.data.oauth_tokens = [{ id: uuidv4(), provider: 'google', accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: tokens.expiry_date }];
    await db.write();
    res.send('<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#111;color:white;"><div style="text-align:center"><h1 style="color:#f97316">✅ Conectado!</h1><p>Pode fechar esta janela.</p><script>setTimeout(()=>window.close(),2000)</script></div></body></html>');
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('Erro na autenticação');
  }
});

app.get('/api/oauth/status', async (req, res) => {
  await db.read();
  const token = db.data.oauth_tokens.find(t => t.provider === 'google');
  res.json({ connected: !!token });
});

// GOOGLE DRIVE
app.get('/api/drive/files', async (req, res) => {
  await db.read();
  const token = db.data.oauth_tokens.find(t => t.provider === 'google');
  if (!token) return res.status(401).json({ error: 'Not connected' });
  oauth2Client.setCredentials({ access_token: token.accessToken, refresh_token: token.refreshToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  try {
    const response = await drive.files.list({ pageSize: 50, fields: 'files(id,name,mimeType)', q: "mimeType='application/vnd.google-apps.document' or mimeType='text/plain'" });
    res.json(response.data.files || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.post('/api/drive/import/:fileId', async (req, res) => {
  await db.read();
  const token = db.data.oauth_tokens.find(t => t.provider === 'google');
  if (!token) return res.status(401).json({ error: 'Not connected' });
  oauth2Client.setCredentials({ access_token: token.accessToken, refresh_token: token.refreshToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  try {
    const metadata = await drive.files.get({ fileId: req.params.fileId, fields: 'name,mimeType' });
    let content;
    if (metadata.data.mimeType === 'application/vnd.google-apps.document') {
      const exp = await drive.files.export({ fileId: req.params.fileId, mimeType: 'text/plain' });
      content = exp.data;
    } else {
      const dl = await drive.files.get({ fileId: req.params.fileId, alt: 'media' });
      content = dl.data;
    }
    const file = { id: uuidv4(), name: metadata.data.name, content, type: 'text', source: 'google-drive', isGlobal: true, createdAt: new Date().toISOString() };
    db.data.knowledge_files.push(file);
    await db.write();
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: 'Failed to import' });
  }
});

// GMAIL
app.get('/api/gmail/messages', async (req, res) => {
  await db.read();
  const token = db.data.oauth_tokens.find(t => t.provider === 'google');
  if (!token) return res.status(401).json({ error: 'Not connected' });
  oauth2Client.setCredentials({ access_token: token.accessToken, refresh_token: token.refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    const list = await gmail.users.messages.list({ userId: 'me', maxResults: 20 });
    const messages = await Promise.all((list.data.messages || []).slice(0, 10).map(async (m) => {
      const detail = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['Subject', 'From'] });
      const headers = detail.data.payload.headers;
      return { id: m.id, subject: headers.find(h => h.name === 'Subject')?.value || 'Sem assunto', from: headers.find(h => h.name === 'From')?.value || '' };
    }));
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/gmail/import/:messageId', async (req, res) => {
  await db.read();
  const token = db.data.oauth_tokens.find(t => t.provider === 'google');
  if (!token) return res.status(401).json({ error: 'Not connected' });
  oauth2Client.setCredentials({ access_token: token.accessToken, refresh_token: token.refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    const detail = await gmail.users.messages.get({ userId: 'me', id: req.params.messageId, format: 'full' });
    const headers = detail.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || 'Email';
    const from = headers.find(h => h.name === 'From')?.value || '';
    let body = '';
    if (detail.data.payload.body?.data) body = Buffer.from(detail.data.payload.body.data, 'base64').toString('utf-8');
    else if (detail.data.payload.parts) {
      const textPart = detail.data.payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body?.data) body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
    const content = `De: ${from}\nAssunto: ${subject}\n\n${body}`;
    const file = { id: uuidv4(), name: `Email: ${subject.substring(0, 50)}`, content, type: 'text', source: 'gmail', isGlobal: true, createdAt: new Date().toISOString() };
    db.data.knowledge_files.push(file);
    await db.write();
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Serve frontend in production (SPA fallback)
if (isProduction) {
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not built. Run: npm run build');
    }
  });
}

// Start
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
🚀 BASE Agency Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 URL: http://localhost:${PORT}
🌍 Env: ${process.env.NODE_ENV || 'development'}
📊 DB:  ${dbPath}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});
