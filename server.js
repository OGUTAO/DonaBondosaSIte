// server.js - Versão simplificada

// 1. Importa as ferramentas
require('dotenv').config(); // Ainda é bom para a porta, se você definir PORT no .env
const express = require('express');

// 2. Inicializa o servidor
const app = express();
// Usa a porta do .env ou 3000 como padrão
const port = process.env.PORT || 3000;

// 3. Configura "Middlewares"
app.use(express.json()); // Para futuras APIs, se necessário
app.use(express.static('.')); // Serve os arquivos HTML, CSS, JS

// 4. Rotas de API REMOVIDAS

// 5. Inicia o servidor
app.listen(port, () => {
  console.log(`🎉 Servidor da Dona Bondosa rodando em http://localhost:${port}`);
});