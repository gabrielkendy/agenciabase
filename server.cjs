const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Encontrar o diretório dist corretamente
const distPath = path.join(process.cwd(), 'dist');

console.log('📁 Serving from:', distPath);

// Serve static files from dist
app.use(express.static(distPath, {
  maxAge: '1d',
  etag: true
}));

// SPA fallback - all routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
