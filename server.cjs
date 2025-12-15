const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve arquivos estáticos da pasta dist
app.use(express.static(path.join(__dirname, 'dist')));

// Para Express 5, usar sintaxe correta para catch-all
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
