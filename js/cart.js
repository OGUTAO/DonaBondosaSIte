const CART_KEY = 'comCarinhoCart';

export function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartIcon();
}

export function addToCart(productId, quantity = 1) {
    const cart = getCart();
    const existingItemIndex = cart.findIndex(item => item.id === productId);

    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += quantity;
    } else {
        cart.push({ id: productId, quantity: quantity });
    }
    
    saveCart(cart);
    alert('Produto adicionado ao carrinho!');
}

export function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
}

export function updateQuantity(productId, newQuantity) {
    let cart = getCart();
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex > -1) {
        if (newQuantity > 0) {
            cart[itemIndex].quantity = newQuantity;
        } else {
            cart = cart.filter(item => item.id !== productId);
        }
        saveCart(cart);
    }
}

export function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartIcon();
}

export function updateCartIcon() {
    const cart = getCart();
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
    const cartIcon = document.getElementById('cart-icon-badge');
    if (cartIcon) {
        if (totalItems > 0) {
            cartIcon.textContent = totalItems;
            cartIcon.classList.remove('hidden');
        } else {
            cartIcon.classList.add('hidden');
        }
    }
}

updateCartIcon();