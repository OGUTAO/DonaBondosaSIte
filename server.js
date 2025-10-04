// server.js - Nosso Back-End Seguro (VERSÃO ATUALIZADA COM VERIFICAÇÃO)

// 1. Importa as ferramentas e carrega o .env
require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- NOVA VERIFICAÇÃO DE SEGURANÇA ---
// Verifica se a chave da API foi carregada do arquivo .env
if (!process.env.GEMINI_API_KEY) {
  console.error('\nERRO CRÍTICO: A variável GEMINI_API_KEY não foi encontrada.');
  console.error('Por favor, verifique se você criou um arquivo .env na raiz do projeto e se a chave está correta.\n');
  process.exit(1); // Encerra o programa se a chave não existir
}
// --- FIM DA VERIFICAÇÃO ---

// 2. Inicializa o servidor e o SDK do Gemini
const app = express();
const port = 3000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Pega a chave segura do .env

// 3. Configura "Middlewares"
app.use(express.json());
app.use(express.static('.'));

// 4. Cria a nossa "Rota Segura"
app.post('/api/generate', async (req, res) => {
  try {
    const { userQuery, systemPrompt } = req.body;

    if (!userQuery || !systemPrompt) {
      return res.status(400).json({ error: 'userQuery e systemPrompt são obrigatórios.' });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });
    
    const result = await model.generateContent(userQuery);
    const response = result.response;

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