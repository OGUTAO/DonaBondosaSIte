// server.js - Nosso Back-End Seguro

// 1. Importa as ferramentas necessárias
require('dotenv').config(); // Carrega as variáveis do arquivo .env
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 2. Inicializa o servidor e o SDK do Gemini
const app = express();
const port = 3000; // A porta onde nosso servidor vai rodar
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Pega a chave segura do .env

// 3. Configura "Middlewares"
// Isso permite que nosso servidor entenda JSON e sirva os arquivos estáticos (html, css, js) da nossa pasta.
app.use(express.json());
app.use(express.static('.')); // Serve os arquivos da pasta raiz (nosso site!)

// 4. Cria a nossa "Rota Segura"
// O front-end vai enviar os dados para este endereço: /api/generate
app.post('/api/generate', async (req, res) => {
  try {
    // Pega as instruções (prompt) que o front-end enviou
    const { userQuery, systemPrompt } = req.body;

    if (!userQuery || !systemPrompt) {
      return res.status(400).json({ error: 'userQuery e systemPrompt são obrigatórios.' });
    }

    // Pega o modelo do Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt,
    });
    
    // Gera o conteúdo
    const result = await model.generateContent(userQuery);
    const response = result.response;

    // Envia a resposta de volta para o front-end
    res.json({ text: response.text() });

  } catch (error) {
    console.error("Erro ao chamar a API Gemini:", error);
    res.status(500).json({ error: 'Falha ao gerar conteúdo.' });
  }
});

// 5. Inicia o servidor
app.listen(port, () => {
  console.log(`🎉 Servidor da Dona Bondosa rodando em http://localhost:${port}`);
  console.log('Sua chave da API está segura no back-end!');
});