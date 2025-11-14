import { supabase } from './supabaseClient.js';
import { addToCart } from './cart.js';

// --- (Função createProductCard - sem alterações) ---
function createProductCard(product, imageMap) {
    const fallbackImage = 'https://placehold.co/600x400/D6C7AE/8B5E34?text=Com+Carinho';
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

    const newBadge = product.is_new
        ? '<div class="absolute top-3 left-3 bg-yellow-500 text-white text-sm font-bold px-3 py-1 rounded-md z-10 shadow-lg">NOVIDADE</div>'
        : '';
    
    const offerBadge = product.previous_price
        ? '<div class="absolute top-3 right-3 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-md z-10 shadow-lg">OFERTA</div>'
        : '';

    return `
        <div class="sabonete-card bg-white rounded-lg shadow-lg overflow-hidden text-left flex flex-col relative">
            
            ${newBadge}
            ${offerBadge}
            
            <a href="produto.html?id=${product.id}" class="block">
                <img src="${imageUrl}" alt="${product.name}" class="w-full h-56 object-cover">
            </a>
            <div class="p-6 flex-grow flex flex-col">
                <div class="mb-2">
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
}

// --- (Função loadDynamicProducts - sem alterações) ---
async function loadDynamicProducts() {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('is_new', { ascending: false })
            .order('name')
            .limit(3); 
        
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
        
        productGrid.innerHTML = ''; 
        products.forEach(product => {
            productGrid.insertAdjacentHTML('beforeend', createProductCard(product, imageMap));
        });

    } catch (error) {
        console.error('Erro ao carregar produtos em destaque:', error);
        productGrid.innerHTML = '<p class="text-red-500 col-span-3">Erro ao carregar produtos. Tente novamente mais tarde.</p>';
    }
}

// --- (Função loadOfferProducts - sem alterações) ---
async function loadOfferProducts() {
    const offerGrid = document.getElementById('offer-grid');
    if (!offerGrid) return;

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .not('previous_price', 'is', null) 
            .order('name');
        
        if (error) throw error;
        if (products.length === 0) {
            offerGrid.innerHTML = '<p class="text-gray-500 col-span-3">Sem ofertas no momento</p>';
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
        
        offerGrid.innerHTML = ''; 
        products.forEach(product => {
            offerGrid.insertAdjacentHTML('beforeend', createProductCard(product, imageMap));
        });

    } catch (error) {
        console.error('Erro ao carregar ofertas:', error);
        offerGrid.innerHTML = '<p class="text-red-500 col-span-3">Erro ao carregar ofertas. Tente novamente mais tarde.</p>';
    }
}


// --- INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
    
    // --- ATUALIZADO: Listener de clique com verificação de login ---
    document.body.addEventListener('click', (e) => {
        const cartBtn = e.target.closest('.add-to-cart-btn');
        if (cartBtn) {
            e.preventDefault();
            
            const userId = localStorage.getItem('currentUserId');
            if (!userId) {
                // Se não estiver logado, mostra o pop-up
                document.getElementById('login-prompt-modal')?.classList.remove('hidden');
            } else {
                // Se estiver logado, adiciona ao carrinho
                const productId = cartBtn.dataset.productId;
                addToCart(productId, 1);
            }
        }
    });
    
    loadDynamicProducts(); 
    loadOfferProducts();
});