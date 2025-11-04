import { supabase } from './supabaseClient.js';
import { addToCart } from './cart.js';

document.addEventListener('DOMContentLoaded', () => {

    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const quizForm = document.getElementById('quiz-form');
    const resultModal = document.getElementById('result-modal');
    const closeModalButton = document.getElementById('close-modal');
    const modalContent = document.getElementById('modal-content');
    const productGrid = document.getElementById('product-grid');

    async function callGeminiAPI(payload) {
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`Erro no servidor: ${errorBody.error}`);
            }
            const result = await response.json();
            return result.text;
        } catch (error) {
            console.error("Falha ao chamar o back-end:", error);
            return "Desculpe, não foi possível obter uma resposta da IA no momento.";
        }
    }

    async function handleQuizSubmit(e) {
        e.preventDefault();
        const formData = new FormData(quizForm);
        const skinType = formData.get('skin_type');
        const sensation = formData.get('sensation');

        if (!skinType || !sensation) {
            alert('Por favor, responda a todas as perguntas.');
            return;
        }
        
        const modalContent = document.getElementById('modal-content');
        resultModal.classList.remove('hidden');
        modalContent.innerHTML = `<div class="flex justify-center items-center h-48"><div class="loader mx-auto" style="border-top-color: #8B5E34;"></div></div>`;

        const payload = {
            systemPrompt: `Você é um especialista em cuidados com a pele da marca "Com Carinho". Sua tarefa é recomendar UM dos sabonetes artesanais da marca com base nas preferências do cliente. Seja caloroso, direto e explique em um parágrafo curto por que o sabonete escolhido é a melhor opção, mencionando o nome do produto recomendado em negrito. Termine com uma frase convidativa.`,
            userQuery: `Meu tipo de pele é ${skinType} e busco uma sensação de ${sensation}. Qual sabonete Com Carinho você me recomenda?`
        };
        const recommendation = await callGeminiAPI(payload);

        modalContent.innerHTML = `
            <h3 class="text-3xl font-bold text-brand-primary mb-4">Sua Recomendação Especial!</h3>
            <p class="text-gray-700 leading-relaxed">${recommendation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
            <a href="#produtos" id="goToProduct" class="mt-6 inline-block bg-brand-primary text-white font-bold px-8 py-2 rounded-full text-lg hover:bg-brand-accent transition duration-300">Ver produto</a>
        `;
        document.getElementById('goToProduct').addEventListener('click', () => resultModal.classList.add('hidden'));
    }

    async function handlePoeticClick(e) {
        const button = e.currentTarget;
        const card = button.closest('.sabonete-card');
        const productName = card.querySelector('h3').innerText;
        const descriptionP = card.querySelector('.product-description');

        button.disabled = true;
        descriptionP.innerHTML = '<div class="loader mx-auto" style="border-top-color: #8B5E34;"></div>';

        const payload = {
            systemPrompt: `Você é um poeta. Sua tarefa é escrever uma descrição curta (2-3 frases), poética e evocativa para um sabonete artesanal chamado "${productName}". Use uma linguagem sensorial e inspiradora. Não use markdown.`,
            userQuery: `Crie uma descrição poética para o sabonete ${productName}.`
        };
        const poeticDescription = await callGeminiAPI(payload);

        descriptionP.innerHTML = `${poeticDescription} <em class="text-sm block mt-2">(Gerado por IA ✨)</em>`;
        button.disabled = false;
    }
    
    async function loadDynamicProducts() {
        if (!productGrid) return;

        try {
            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .order('name');
            
            if (error) throw error;

            if (products.length === 0) {
                productGrid.innerHTML = '<p class="text-gray-500 col-span-3">Nenhum produto cadastrado no momento.</p>';
                return;
            }

            const productIds = products.map(p => p.id);
            const { data: images, error: imgError } = await supabase
                .from('product_images')
                .select('product_id, image_url')
                .in('product_id', productIds)
                .order('created_at', { ascending: true });
            
            if (imgError) throw imgError;

            const imageMap = new Map();
            images.forEach(img => {
                if (!imageMap.has(img.product_id)) {
                    imageMap.set(img.product_id, img.image_url);
                }
            });
            
            const fallbackImage = 'https://placehold.co/600x400/D6C7AE/8B5E34?text=Com+Carinho';

            productGrid.innerHTML = ''; 
            products.forEach(product => {
                const imageUrl = imageMap.get(product.id) || fallbackImage;
                const price = parseFloat(product.current_price).toFixed(2);
                
                let priceHtml = `<span class="text-xl font-bold text-brand-accent">R$ ${price}</span>`;
                if (product.previous_price) {
                    const oldPrice = parseFloat(product.previous_price).toFixed(2);
                    priceHtml = `
                        <span class="text-xl font-bold text-red-600">R$ ${price}</span>
                        <span class="text-lg line-through text-gray-500 ml-2">R$ ${oldPrice}</span>
                    `;
                }

                const productCard = `
                    <div class="sabonete-card bg-white rounded-lg shadow-lg overflow-hidden text-left flex flex-col">
                        <a href="produto.html?id=${product.id}" class="block">
                            <img src="${imageUrl}" alt="${product.name}" class="w-full h-56 object-cover">
                        </a>
                        <div class="p-6 flex-grow flex flex-col">
                            <div class="flex justify-between items-start mb-2">
                                <h3 class="text-2xl font-bold text-brand-primary">${product.name}</h3>
                                <button class="poetic-button text-2xl text-brand-accent hover:text-yellow-500 transition" title="Gerar Descrição Poética ✨">✨</button>
                            </div>
                            <p class="product-description text-gray-600 mb-4 h-24">${product.description || 'Veja mais detalhes sobre este produto.'}</p>
                            <div class="flex-grow"></div>
                            <div class="flex justify-between items-center mt-4">
                                <div>${priceHtml}</div>
                                <button class="add-to-cart-btn bg-brand-primary text-white px-5 py-2 rounded-full hover:bg-brand-accent transition duration-300" data-product-id="${product.id}">
                                    <i class="fas fa-shopping-cart mr-2"></i> Adicionar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                productGrid.insertAdjacentHTML('beforeend', productCard);
            });

        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            productGrid.innerHTML = '<p class="text-red-500 col-span-3">Erro ao carregar produtos. Tente novamente mais tarde.</p>';
        }
    }

    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    if (quizForm) {
        quizForm.addEventListener('submit', handleQuizSubmit);
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => resultModal.classList.add('hidden'));
    }

    document.body.addEventListener('click', (e) => {
        const poeticBtn = e.target.closest('.poetic-button');
        if (poeticBtn) {
            e.preventDefault();
            handlePoeticClick(e);
        }

        const cartBtn = e.target.closest('.add-to-cart-btn');
        if (cartBtn) {
            e.preventDefault();
            const productId = cartBtn.dataset.productId;
            addToCart(productId, 1);
        }
    });
    
    loadDynamicProducts();
});