import { supabase } from './supabaseClient.js';
import { addToCart } from './cart.js';

document.addEventListener('DOMContentLoaded', () => {
    
    const productGrid = document.getElementById('all-products-grid');

    async function loadAllProducts() {
        if (!productGrid) return;

        try {
            // 1. Busca TODOS os produtos, sem limite
            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .order('name');
            
            if (error) throw error;

            if (products.length === 0) {
                productGrid.innerHTML = '<p class="text-gray-500 col-span-3">Nenhum produto cadastrado no momento.</p>';
                return;
            }

            // 2. Busca a PRIMEIRA imagem de CADA produto
            const productIds = products.map(p => p.id);
            const { data: images, error: imgError } = await supabase
                .from('product_images')
                .select('product_id, image_url')
                .in('product_id', productIds)
                .order('created_at', { ascending: true });
            
            if (imgError) throw imgError;

            // Mapeia imagens para fácil acesso
            const imageMap = new Map();
            images.forEach(img => {
                if (!imageMap.has(img.product_id)) {
                    imageMap.set(img.product_id, img.image_url);
                }
            });
            
            const fallbackImage = 'https://placehold.co/600x400/D6C7AE/8B5E34?text=Com+Carinho';

            // 3. Limpa o grid e constrói o HTML
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

                // Este é o mesmo card do js/main.js
                const productCard = `
                    <div class="sabonete-card bg-white rounded-lg shadow-lg overflow-hidden text-left flex flex-col">
                        <a href="produto.html?id=${product.id}" class="block">
                            <img src="${imageUrl}" alt="${product.name}" class="w-full h-56 object-cover">
                        </a>
                        <div class="p-6 flex-grow flex flex-col">
                            <div class="flex justify-between items-start mb-2">
                                <a href="produto.html?id=${product.id}" class="block hover:underline">
                                    <h3 class="text-2xl font-bold text-brand-primary">${product.name}</h3>
                                </a>
                                </div>
                            
                            <p class="product-description text-gray-600 mb-2 break-words h-24 truncate-4-lines">${product.description || 'Veja mais detalhes sobre este produto.'}</p>
                            
                            <a href="produto.html?id=${product.id}" class="text-sm text-brand-primary font-semibold hover:underline mb-4">
                                Ver mais...
                            </a>
                            
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

    // Adiciona listener de clique para os botões "Adicionar"
    document.body.addEventListener('click', (e) => {
        const cartBtn = e.target.closest('.add-to-cart-btn');
        if (cartBtn) {
            e.preventDefault();
            const productId = cartBtn.dataset.productId;
            addToCart(productId, 1);
        }
    });
    
    // Carrega os produtos assim que a página abre
    loadAllProducts();
});