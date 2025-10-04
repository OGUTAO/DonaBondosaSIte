/**
 * Script principal para a página da Dona Bondosa
 * Versão: Segura (com Back-End)
 * Autor: Gemini
 * Data: 2025-10-04
 *
 * Funcionalidades:
 * 1. Controle do menu mobile.
 * 2. Lógica do Quiz, que agora envia os dados para o nosso servidor seguro.
 * 3. Geração de descrições poéticas, que também usa o nosso servidor.
 * 4. Controle do modal de resultados.
 */

// Executa o script apenas quando o DOM estiver completamente carregado
document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores de Elementos do DOM ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const quizForm = document.getElementById('quiz-form');
    const resultModal = document.getElementById('result-modal');
    const closeModalButton = document.getElementById('close-modal');
    const modalContent = document.getElementById('modal-content');
    const poeticButtons = document.querySelectorAll('.poetic-button');

    // A chave da API foi REMOVIDA daqui para segurança.
    // Ela agora vive apenas no arquivo .env no servidor.

    // --- Funções Principais ---

    /**
     * Função que chama NOSSO back-end seguro para acessar a Gemini API.
     * O front-end não sabe mais qual é a chave da API.
     * @param {object} payload - Um objeto contendo o systemPrompt e o userQuery.
     * @returns {Promise<string>} O texto gerado pela IA, vindo do nosso servidor.
     */
    async function callGeminiAPI(payload) {
        try {
            // A URL agora aponta para a nossa rota segura no nosso próprio servidor.
            // O servidor está rodando em localhost:3000, e esta rota foi definida no server.js
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload) // Envia o payload completo para o servidor
            });

            if (!response.ok) {
                const errorBody = await response.json();
                // Mostra um erro mais detalhado vindo do servidor
                throw new Error(`Erro no servidor: ${errorBody.error}`);
            }

            const result = await response.json();
            // A resposta do nosso servidor vem no formato { text: "..." }
            return result.text;

        } catch (error) {
            console.error("Falha ao chamar o back-end:", error);
            return "Desculpe, não foi possível obter uma resposta da IA no momento. Verifique o console para mais detalhes.";
        }
    }

    /**
     * Manipula o envio do formulário do quiz.
     * @param {Event} e - O evento de envio do formulário.
     */
    async function handleQuizSubmit(e) {
        e.preventDefault();
        const formData = new FormData(quizForm);
        const skinType = formData.get('skin_type');
        const sensation = formData.get('sensation');

        if (!skinType || !sensation) {
            alert('Por favor, responda a todas as perguntas.');
            return;
        }

        resultModal.classList.remove('hidden');
        modalContent.innerHTML = `<div class="flex justify-center items-center h-48"><div class="loader"></div></div>`;

        // Prepara o "payload" (os dados) para enviar ao nosso servidor
        const payload = {
            systemPrompt: `Você é um especialista em cuidados com a pele da marca "Dona Bondosa". Sua tarefa é recomendar UM dos três sabonetes artesanais da marca (Lavanda Relaxante, Argila Verde Detox, Aveia e Mel Hidratante) com base nas preferências do cliente. Seja caloroso, direto e explique em um parágrafo curto por que o sabonete escolhido é a melhor opção, mencionando o nome do produto recomendado em negrito. Termine com uma frase convidativa.`,
            userQuery: `Meu tipo de pele é ${skinType} e busco uma sensação de ${sensation}. Qual sabonete Dona Bondosa você me recomenda?`
        };

        const recommendation = await callGeminiAPI(payload);

        modalContent.innerHTML = `
            <h3 class="text-3xl font-bold text-brand-primary mb-4">Sua Recomendação Especial!</h3>
            <p class="text-gray-700 leading-relaxed">${recommendation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
            <a href="#produtos" id="goToProduct" class="mt-6 inline-block bg-brand-primary text-white font-bold px-8 py-2 rounded-full text-lg hover:bg-brand-accent transition duration-300">Ver produto</a>
        `;

        document.getElementById('goToProduct').addEventListener('click', () => resultModal.classList.add('hidden'));
    }

    /**
     * Gera e exibe uma descrição poética para um produto.
     * @param {Event} e - O evento de clique do botão.
     */
    async function handlePoeticClick(e) {
        const button = e.currentTarget;
        const card = button.closest('.sabonete-card');
        const productName = card.querySelector('h3').innerText;
        const descriptionP = card.querySelector('.product-description');

        button.disabled = true;
        descriptionP.innerHTML = '<div class="loader mx-auto"></div>';

        // Prepara o payload para enviar ao nosso servidor
        const payload = {
            systemPrompt: `Você é um poeta. Sua tarefa é escrever uma descrição curta (2-3 frases), poética e evocativa para um sabonete artesanal chamado "${productName}". Use uma linguagem sensorial e inspiradora. Não use markdown.`,
            userQuery: `Crie uma descrição poética para o sabonete ${productName}.`
        };

        const poeticDescription = await callGeminiAPI(payload);

        descriptionP.innerHTML = `${poeticDescription} <em class="text-sm block mt-2">(Gerado por IA ✨)</em>`;
        button.disabled = false;
    }

    // --- Listeners de Eventos ---

    // Menu Mobile
    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    // Quiz
    if (quizForm) {
        quizForm.addEventListener('submit', handleQuizSubmit);
    }

    // Modal
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => resultModal.classList.add('hidden'));
    }

    // Botões de Poesia
    poeticButtons.forEach(button => {
        button.addEventListener('click', handlePoeticClick);
    });
});
