import { supabase } from './supabaseClient.js';
import { getCart, clearCart, updateQuantity, removeFromCart } from './cart.js';

document.addEventListener('DOMContentLoaded', () => {
    
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartSummaryContainer = document.getElementById('cart-summary-container');
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    const cartTotalEl = document.getElementById('cart-total');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const checkoutButton = document.getElementById('checkout-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const cartContent = document.getElementById('cart-content');
    
    const addressSection = document.getElementById('delivery-address-section');
    const savedAddressSelect = document.getElementById('saved-address-select');
    const manualAddressForm = document.getElementById('manual-address-form');
    const addressError = document.getElementById('address-error');
    
    const citySelect = document.getElementById('city');
    const cityOtherContainer = document.getElementById('city-other-container');
    const cityOtherInput = document.getElementById('city_other');
    const cepInput = document.getElementById('cep');
    const streetInput = document.getElementById('street');
    const complementInput = document.getElementById('complement');
    
    let allProducts = [];
    let allImagesMap = new Map(); 
    let currentCartTotal = 0;

    async function loadUserAddresses() {
        const userId = localStorage.getItem('currentUserId');
        if (!userId) {
            addressSection.classList.add('hidden');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('addresses')
                .select('*')
                .eq('user_id', userId)
                .order('created_at');
            
            if (error) throw error;
            
            savedAddressSelect.innerHTML = '<option value="default" selected>-- Selecione um endereço salvo --</option>';
            
            if (data.length > 0) {
                data.forEach(addr => {
                    const addrText = `${addr.street}, ${addr.city} - ${addr.cep}`;
                    savedAddressSelect.innerHTML += `<option value="${addr.id}">${addrText}</option>`;
                });
            }
            
            savedAddressSelect.innerHTML += '<option value="new">-- Digitar um novo endereço --</option>';
            
        } catch (err) {
            console.error('Erro ao carregar endereços:', err);
            savedAddressSelect.innerHTML = '<option value="error">Não foi possível carregar endereços.</option>';
        }
    }

    async function loadCart() {
        const cart = getCart();
        
        if (cart.length === 0) {
            showEmptyCart();
            return;
        }

        await loadUserAddresses();

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

            allImagesMap = new Map();
            images.forEach(img => {
                if (!allImagesMap.has(img.product_id)) {
                    allImagesMap.set(img.product_id, img.image_url);
                }
            });

            allProducts = products;
            
            renderCart(cart, products, allImagesMap);
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
                <div class="flex flex-col sm:flex-row sm:items-center border-b pb-6" data-product-id="${product.id}">
                    <div class="flex items-center w-full mb-4 sm:mb-0">
                        <img src="${imageUrl}" alt="${product.name}" class="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg">
                        <div class="ml-4 sm:ml-6 flex-grow">
                            <a href="produto.html?id=${product.id}" class="text-lg sm:text-xl font-bold text-brand-primary hover:underline">${product.name}</a>
                            <p class="text-gray-600">Preço: R$ ${price.toFixed(2)}</p>
                        </div>
                    </div>
                    <div class="flex items-center justify-between sm:justify-end w-full sm:w-auto sm:space-x-4">
                        <input type="number" value="${cartItem.quantity}" min="1" class="quantity-input w-16 p-2 border rounded-lg text-center" data-product-id="${product.id}">
                        <p class="text-lg font-bold text-brand-accent w-24 text-right">R$ ${itemTotal.toFixed(2)}</p>
                        <button class="remove-from-cart-btn text-red-600 hover:text-red-800 text-lg ml-4 sm:ml-0" data-product-id="${product.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            cartItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
        });
        
        currentCartTotal = subtotal;
        cartSubtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
        cartTotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
    }

    function showEmptyCart() {
        emptyCartMessage.classList.remove('hidden');
        cartSummaryContainer.classList.add('hidden');
        cartItemsContainer.classList.add('hidden');
        addressSection.classList.add('hidden');
        loadingSpinner.classList.add('hidden');
        cartContent.classList.remove('hidden');
    }

    function showCartContent() {
        emptyCartMessage.classList.add('hidden');
        cartSummaryContainer.classList.remove('hidden');
        cartItemsContainer.classList.remove('hidden');
        addressSection.classList.remove('hidden');
        loadingSpinner.classList.add('hidden');
        cartContent.classList.remove('hidden');
    }

    function handleQuantityChange(productId, newQuantity) {
        updateQuantity(productId, parseInt(newQuantity));
        const cart = getCart();
        renderCart(cart, allProducts, allImagesMap); 
    }

    function handleRemoveItem(productId) {
        if (confirm('Remover este item do carrinho?')) {
            removeFromCart(productId);
            const cart = getCart();
            if (cart.length === 0) {
                showEmptyCart();
            } else {
                renderCart(cart, allProducts, allImagesMap);
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

    savedAddressSelect.addEventListener('change', () => {
        if (savedAddressSelect.value === 'new') {
            manualAddressForm.classList.remove('hidden');
        } else {
            manualAddressForm.classList.add('hidden');
            addressError.textContent = '';
        }
    });
    
    citySelect.addEventListener('change', () => {
        if (citySelect.value === 'Outra') {
            cityOtherContainer.classList.remove('hidden');
            cityOtherInput.required = true;
        } else {
            cityOtherContainer.classList.add('hidden');
            cityOtherInput.required = false;
            cityOtherInput.value = '';
        }
    });

    // --- LÓGICA DE FINALIZAR COMPRA ATUALIZADA ---
    checkoutButton.addEventListener('click', async () => {
        addressError.textContent = ''; 
        const selectedAddress = savedAddressSelect.value;
        let finalDeliveryAddress = null;

        // 1. Validação de Endereço
        if (selectedAddress === 'default' || selectedAddress === 'error') {
            addressError.textContent = 'Por favor, selecione um endereço de entrega.';
            return;
        } 
        
        if (selectedAddress === 'new') {
            const cep = cepInput.value;
            const street = streetInput.value;
            let city = citySelect.value;
            if (city === 'Outra') city = cityOtherInput.value;
            
            if (!cep || !street || !city) {
                addressError.textContent = 'Por favor, preencha os campos obrigatórios do endereço.';
                return;
            }
            finalDeliveryAddress = { cep, city, street, complement: complementInput.value };
        } else {
            const optionText = savedAddressSelect.options[savedAddressSelect.selectedIndex].text;
            finalDeliveryAddress = { description: optionText };
        }

        // 2. Processamento do Pedido
        const originalBtnText = checkoutButton.textContent;
        checkoutButton.disabled = true;
        checkoutButton.textContent = 'Processando...';

        try {
            const userId = localStorage.getItem('currentUserId');
            const cart = getCart();

            // A. Cria o Pedido
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    user_id: userId,
                    total_amount: currentCartTotal,
                    status: 'Pendente',
                    delivery_address: finalDeliveryAddress
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // B. Prepara os Itens
            const orderItems = cart.map(item => {
                const product = allProducts.find(p => p.id == item.id);
                return {
                    order_id: orderData.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    price_at_purchase: product.current_price
                };
            });

            // C. Salva os Itens
            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // D. Sucesso! Limpa o carrinho e redireciona
            clearCart();
            alert('Pedido realizado com sucesso! Redirecionando para o pagamento...');
            
            // Redireciona para a aba de pedidos no perfil
            window.location.href = 'perfil.html?tab=pedidos';

        } catch (error) {
            console.error('Erro no checkout:', error);
            alert('Erro ao processar o pedido. Tente novamente.');
            checkoutButton.disabled = false;
            checkoutButton.textContent = originalBtnText;
        }
    });

    loadCart();
});