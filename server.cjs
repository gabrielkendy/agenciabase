const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Tentar múltiplos caminhos possíveis
const possiblePaths = [
  path.join(process.cwd(), 'dist'),
  path.join(__dirname, 'dist'),
  '/opt/render/project/src/dist',
  '/opt/render/project/dist'
];

let distPath = null;

// Debug: listar diretório atual
console.log('📁 Current working directory:', process.cwd());
console.log('📁 __dirname:', __dirname);

// Listar arquivos no diretório atual
try {
  const files = fs.readdirSync(process.cwd());
  console.log('📂 Files in cwd:', files.join(', '));
} catch (e) {
  console.log('❌ Cannot read cwd');
}

// Encontrar o dist
for (const p of possiblePaths) {
  console.log('🔍 Checking:', p);
  if (fs.existsSync(p)) {
    distPath = p;
    console.log('✅ Found dist at:', p);
    break;
  }
}

if (!distPath) {
  console.log('❌ dist folder not found! Build may have failed.');
  console.log('📂 Creating fallback response...');
  
  app.get('*', (req, res) => {
    res.status(500).send(`
      <html>
        <body style="background:#1a1a1a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h1>⚠️ Build Error</h1>
            <p>O diretório dist não foi encontrado.</p>
            <p>Verifique os logs do build no Render.</p>
          </div>
        </body>
      </html>
    `);
  });
} else {
  // Listar arquivos no dist
  try {
    const distFiles = fs.readdirSync(distPath);
    console.log('📂 Files in dist:', distFiles.join(', '));
  } catch (e) {
    console.log('❌ Cannot read dist folder');
  }

  // Serve static files
  app.use(express.static(distPath, { maxAge: '1d' }));

  // SPA fallback
  app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('index.html not found');
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
