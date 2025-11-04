import { supabase } from './supabaseClient.js';
import { getCart, removeFromCart, updateQuantity } from './cart.js';

document.addEventListener('DOMContentLoaded', () => {
    
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartSummaryContainer = document.getElementById('cart-summary-container');
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    const cartTotalEl = document.getElementById('cart-total');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const checkoutButton = document.getElementById('checkout-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const cartContent = document.getElementById('cart-content');
    
    let allProducts = [];

    async function loadCart() {
        const cart = getCart();
        
        if (cart.length === 0) {
            showEmptyCart();
            return;
        }

        try {
            const productIds = cart.map(item => item.id);
            
            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .in('id', productIds);
            
            if (error) throw error;
            
            const { data: images } = await supabase
                .from('product_images')
                .select('product_id, image_url')
                .in('product_id', productIds)
                .order('created_at', { ascending: true });

            const imageMap = new Map();
            images.forEach(img => {
                if (!imageMap.has(img.product_id)) {
                    imageMap.set(img.product_id, img.image_url);
                }
            });

            allProducts = products;
            
            renderCart(cart, products, imageMap);
            showCartContent();
            
        } catch (err) {
            console.error('Erro ao carregar produtos do carrinho:', err);
            cartItemsContainer.innerHTML = '<p class="text-red-500">Erro ao carregar seu carrinho. Tente novamente.</p>';
            loadingSpinner.classList.add('hidden');
            cartContent.classList.remove('hidden');
        }
    }

    function renderCart(cart, products, imageMap) {
        cartItemsContainer.innerHTML = '';
        let subtotal = 0;
        const fallbackImage = 'https://placehold.co/100x100/D6C7AE/8B5E34?text=Sem+Imagem';

        cart.forEach(cartItem => {
            const product = products.find(p => p.id == cartItem.id);
            if (!product) return;

            const price = parseFloat(product.current_price);
            const itemTotal = price * cartItem.quantity;
            subtotal += itemTotal;
            const imageUrl = imageMap.get(product.id) || fallbackImage;

            const itemHtml = `
                <div class="flex items-center border-b pb-6" data-product-id="${product.id}">
                    <img src="${imageUrl}" alt="${product.name}" class="w-24 h-24 object-cover rounded-lg">
                    <div class="ml-6 flex-grow">
                        <a href="produto.html?id=${product.id}" class="text-xl font-bold text-brand-primary hover:underline">${product.name}</a>
                        <p class="text-gray-600">Preço: R$ ${price.toFixed(2)}</p>
                    </div>
                    <div class="flex items-center space-x-4">
                        <input type="number" value="${cartItem.quantity}" min="1" class="quantity-input w-16 p-2 border rounded-lg text-center" data-product-id="${product.id}">
                        <p class="text-lg font-bold text-brand-accent w-24 text-right">R$ ${itemTotal.toFixed(2)}</p>
                        <button class="remove-from-cart-btn text-red-600 hover:text-red-800 text-lg" data-product-id="${product.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            cartItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
        });

        cartSubtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
        cartTotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
    }

    function showEmptyCart() {
        emptyCartMessage.classList.remove('hidden');
        cartSummaryContainer.classList.add('hidden');
        cartItemsContainer.classList.add('hidden');
        loadingSpinner.classList.add('hidden');
        cartContent.classList.remove('hidden');
    }

    function showCartContent() {
        emptyCartMessage.classList.add('hidden');
        cartSummaryContainer.classList.remove('hidden');
        cartItemsContainer.classList.remove('hidden');
        loadingSpinner.classList.add('hidden');
        cartContent.classList.remove('hidden');
    }

    function handleQuantityChange(productId, newQuantity) {
        updateQuantity(productId, parseInt(newQuantity));
        const cart = getCart();
        const imageMap = new Map();
        allProducts.forEach(p => imageMap.set(p.id, p.image_url)); 
        renderCart(cart, allProducts, imageMap); 
    }

    function handleRemoveItem(productId) {
        if (confirm('Remover este item do carrinho?')) {
            removeFromCart(productId);
            const cart = getCart();
            if (cart.length === 0) {
                showEmptyCart();
            } else {
                const imageMap = new Map();
                allProducts.forEach(p => imageMap.set(p.id, p.image_url));
                renderCart(cart, allProducts, imageMap);
            }
        }
    }

    cartItemsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const productId = e.target.dataset.productId;
            const newQuantity = e.target.value;
            handleQuantityChange(productId, newQuantity);
        }
    });

    cartItemsContainer.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-from-cart-btn');
        if (removeBtn) {
            const productId = removeBtn.dataset.productId;
            handleRemoveItem(productId);
        }
    });

    checkoutButton.addEventListener('click', () => {
        alert('Funcionalidade de checkout em construção!');
    });

    loadCart();
});