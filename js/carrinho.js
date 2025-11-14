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
    
    // --- NOVOS ELEMENTOS DE ENDEREÇO ---
    const addressSection = document.getElementById('delivery-address-section');
    const savedAddressSelect = document.getElementById('saved-address-select');
    const manualAddressForm = document.getElementById('manual-address-form');
    const addressError = document.getElementById('address-error');
    
    // Inputs do formulário manual
    const citySelect = document.getElementById('city');
    const cityOtherContainer = document.getElementById('city-other-container');
    const cityOtherInput = document.getElementById('city_other');
    const cepInput = document.getElementById('cep');
    const streetInput = document.getElementById('street');
    
    let allProducts = [];
    let allImagesMap = new Map(); 

    // --- NOVA FUNÇÃO: Carregar endereços salvos ---
    async function loadUserAddresses() {
        const userId = localStorage.getItem('currentUserId');
        if (!userId) {
            // Se, por algum motivo, o usuário não estiver logado, esconde a seção
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
            
            savedAddressSelect.innerHTML = '<option value="default" selected>-- Selecione um endereço salvo ou digite seu endereço --</option>'; // Limpa o "Carregando..."
            
            if (data.length > 0) {
                data.forEach(addr => {
                    const addrText = `${addr.street}, ${addr.city} - ${addr.cep}`;
                    savedAddressSelect.innerHTML += `<option value="${addr.id}">${addrText}</option>`;
                });
            }
            
            // Adiciona a opção de digitar novo endereço
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

        // --- NOVO: Carrega os endereços ---
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

        cartSubtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
        cartTotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
    }

    function showEmptyCart() {
        emptyCartMessage.classList.remove('hidden');
        cartSummaryContainer.classList.add('hidden');
        cartItemsContainer.classList.add('hidden');
        addressSection.classList.add('hidden'); // --- NOVO ---
        loadingSpinner.classList.add('hidden');
        cartContent.classList.remove('hidden');
    }

    function showCartContent() {
        emptyCartMessage.classList.add('hidden');
        cartSummaryContainer.classList.remove('hidden');
        cartItemsContainer.classList.remove('hidden');
        addressSection.classList.remove('hidden'); // --- NOVO ---
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

    // --- NOVO: Listener para o dropdown de endereço ---
    savedAddressSelect.addEventListener('change', () => {
        if (savedAddressSelect.value === 'new') {
            manualAddressForm.classList.remove('hidden');
        } else {
            manualAddressForm.classList.add('hidden');
            addressError.textContent = ''; // Limpa o erro se o usuário selecionar um salvo
        }
    });
    
    // --- NOVO: Listener para o select de cidade (igual ao profile.js) ---
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

    // --- NOVO: Lógica de validação do Checkout ---
    checkoutButton.addEventListener('click', () => {
        addressError.textContent = ''; // Limpa erros anteriores
        const selectedAddress = savedAddressSelect.value;
        
        let deliveryAddress = null;

        if (selectedAddress === 'default' || selectedAddress === 'error') {
            addressError.textContent = 'Por favor, selecione um endereço de entrega.';
            return;
        } 
        
        if (selectedAddress === 'new') {
            // Se "novo endereço" for selecionado, valida o formulário manual
            const cep = cepInput.value;
            const street = streetInput.value;
            let city = citySelect.value;
            
            if (city === 'Outra') {
                city = cityOtherInput.value;
            }
            
            if (!cep || !street || !city) {
                addressError.textContent = 'Por favor, preencha todos os campos do novo endereço (CEP, Cidade e Rua).';
                return;
            }
            
            // Sucesso na validação manual
            deliveryAddress = {
                cep: cep,
                street: street,
                city: city,
                complement: document.getElementById('complement').value
            };
            
        } else {
            // Sucesso, um endereço salvo foi selecionado
            deliveryAddress = {
                id: selectedAddress,
                text: savedAddressSelect.options[savedAddressSelect.selectedIndex].text
            };
        }
        
        // Se chegou até aqui, um endereço é válido
        console.log("Endereço de entrega selecionado:", deliveryAddress);
        alert('Pedido quase finalizado! Em breve entraremos em contato para confirmar o frete e o pagamento.');
        
        // Futuramente, você pode enviar o 'deliveryAddress' e o carrinho para o banco de dados.
        // ex: await createOrder(getCart(), deliveryAddress);
    });

    loadCart();
});