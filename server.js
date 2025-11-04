// server.js - Nosso Back-End Seguro (VERSÃO ATUALIZADA COM VERIFICAÇÃO)

// 1. Importa as ferramentas e carrega o .env
require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// NOVO: Importa o createClient do Supabase
const { createClient } = require('@supabase/supabase-js');

// --- NOVA VERIFICAÇÃO DE SEGURANÇA ---
// Verifica TODAS as chaves necessárias
if (!process.env.GEMINI_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('\nERRO CRÍTICO: Verifique as variáveis GEMINI_API_KEY, SUPABASE_URL e SUPABASE_SERVICE_KEY no .env\n');
  process.exit(1); // Encerra o programa se as chaves não existirem
}
// --- FIM DA VERIFICAÇÃO ---

// 2. Inicializa o servidor e os SDKs
const app = express();
const port = 3000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Pega a chave segura do .env

// NOVO: Inicializa o Supabase com a CHAVE DE ADMIN (Service Key)
// Isso dá ao nosso servidor "superpoderes"
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// 3. Configura "Middlewares"
app.use(express.json());
app.use(express.static('.'));

// 4. Rota Segura da API Gemini (Existente)
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

// 5. --- NOVA ROTA PARA CRIAR ADMINS (Funcionários) ---
app.post('/api/create-admin', async (req, res) => {
  try {
    // Apenas o 'developer' pode chamar esta rota (verificado no front-end,
    // mas uma verificação de token aqui seria ideal em produção)
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, senha e nome completo são obrigatórios.' });
    }

    // 1. Cria o usuário no Supabase Auth (usando os superpoderes)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Já cria como confirmado
    });

    if (authError) throw authError;

    // 2. Cria o perfil para esse usuário na tabela 'profiles'
    // OBS: Sua tabela 'profiles' deve ter RLS desabilitado para 'INSERT'
    // ou uma regra que permita ao 'service_role' inserir.
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
            id: authData.user.id, // Vincula o perfil ao ID do usuário criado
            full_name: full_name,
            email: authData.user.email, // Salva o email no perfil
            role: 'admin' // Define a role como 'admin'
        });
    
    if (profileError) throw profileError;

    res.json({ message: 'Administrador criado com sucesso!', user: authData.user });

  } catch (error) {
    console.error("Erro ao criar admin:", error);
    res.status(500).json({ error: error.message });
  }
});


// 6. Inicia o servidor
app.listen(port, () => {
  console.log(`🎉 Servidor da Dona Bondosa rodando em http://localhost:${port}`);
  console.log('Sua chave da API está segura no back-end!');
});