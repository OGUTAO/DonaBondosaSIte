import { supabase } from './supabaseClient.js';
import { addToCart } from './cart.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loadingSpinner = document.getElementById('loading-spinner');
    const productContent = document.getElementById('product-content');
    const mainImage = document.getElementById('main-image');
    const thumbnailGallery = document.getElementById('thumbnail-gallery');
    const productName = document.getElementById('product-name');
    const productPrice = document.getElementById('product-price');
    const productDescription = document.getElementById('product-description');
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    
    const reviewFormContainer = document.getElementById('review-form-container');
    const reviewForm = document.getElementById('review-form');
    const reviewLoginPrompt = document.getElementById('review-login-prompt');
    const reviewList = document.getElementById('review-list');
    
    // --- NOVOS ELEMENTOS DE AVISO ---
    // Vamos criar esses elementos via JS se necessário, ou usar o alert
    
    let currentProductId = null;
    let currentUser = null;

    function getProductId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    async function loadProductData(productId) {
        try {
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (productError) throw new Error(`Produto não encontrado: ${productError.message}`);

            const { data: images, error: imagesError } = await supabase
                .from('product_images')
                .select('*')
                .eq('product_id', productId)
                .order('created_at');
            
            if (imagesError) throw imagesError;

            const { data: reviews, error: reviewsError } = await supabase
                .from('product_reviews')
                .select('*, profiles(full_name)')
                .eq('product_id', productId)
                .order('created_at', { ascending: false });
            
            if (reviewsError) throw reviewsError;
            
            populateProductDetails(product);
            populateImageGallery(images, product.name);
            populateReviews(reviews);
            
            loadingSpinner.classList.add('hidden');
            productContent.classList.remove('hidden');

        } catch (error) {
            console.error('Erro ao carregar dados do produto:', error);
            loadingSpinner.innerHTML = `<p class="text-red-500 text-center text-lg"><b>Erro:</b> Produto não encontrado ou falha ao carregar.<br><a href="index.html" class="text-brand-primary underline">Voltar para a loja</a></p>`;
        }
    }

    function populateImageGallery(images, altText) {
        const fallbackImage = 'https://placehold.co/600x400/D6C7AE/8B5E34?text=Sem+Imagem';
        
        if (images.length === 0) {
            mainImage.src = fallbackImage;
            mainImage.alt = altText;
            return;
        }

        mainImage.src = images[0].image_url;
        mainImage.alt = images[0].alt_text || altText;
        
        thumbnailGallery.innerHTML = '';
        images.forEach(image => {
            const thumb = document.createElement('img');
            thumb.src = image.image_url;
            thumb.alt = `Thumbnail ${image.alt_text || altText}`;
            thumb.className = 'w-20 h-20 object-cover rounded-md cursor-pointer border-2 border-transparent hover:border-brand-primary transition-all';
            
            thumb.addEventListener('click', () => {
                mainImage.src = image.image_url;
                mainImage.alt = image.alt_text || altText;
            });
            thumbnailGallery.appendChild(thumb);
        });
    }

    function populateProductDetails(product) {
        currentProductId = product.id;
        document.title = `${product.name} - Com Carinho`;
        productName.textContent = product.name;
        productDescription.textContent = product.description;

        const price = parseFloat(product.current_price).toFixed(2);
        let priceHtml = `<span class="text-brand-accent">R$ ${price}</span>`;
        if (product.previous_price) {
            const oldPrice = parseFloat(product.previous_price).toFixed(2);
            priceHtml = `
                <span class="text-red-600">R$ ${price}</span>
                <span class="text-gray-500 line-through ml-3">R$ ${oldPrice}</span>
            `;
        }
        productPrice.innerHTML = priceHtml;
    }

    function populateReviews(reviews) {
        reviewList.innerHTML = '';
        if (reviews.length === 0) {
            reviewList.innerHTML = '<p class="text-gray-500">Este produto ainda não tem avaliações. Seja o primeiro!</p>';
            return;
        }

        reviews.forEach(review => {
            const reviewerName = review.profiles ? review.profiles.full_name : 'Anônimo';
            const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            const date = new Date(review.created_at).toLocaleDateString('pt-BR');
            
            const reviewElement = `
                <div class="border-t pt-6">
                    <div class="flex justify-between items-center">
                        <p class="font-bold text-brand-primary">${reviewerName}</p>
                        <span class="text-sm text-gray-500">${date}</span>
                    </div>
                    <p class="text-yellow-500 my-2">${stars}</p>
                    
                    <p class="text-gray-600 mt-2 break-words">${review.comment}</p>
                    
                </div>
            `;
            reviewList.insertAdjacentHTML('beforeend', reviewElement);
        });
    }
    
    // --- NOVA FUNÇÃO DE VERIFICAÇÃO ---
    async function checkReviewEligibility() {
        if (!currentUser) {
            reviewForm.classList.add('hidden');
            reviewLoginPrompt.classList.remove('hidden');
            return;
        }

        reviewLoginPrompt.classList.add('hidden');

        // 1. Verifica se já avaliou
        const { data: existingReviews } = await supabase
            .from('product_reviews')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('product_id', currentProductId);

        if (existingReviews && existingReviews.length > 0) {
            reviewForm.innerHTML = '<p class="text-green-600 font-bold bg-green-50 p-4 rounded border border-green-200">Você já avaliou este produto. Obrigado! ❤️</p>';
            reviewForm.classList.remove('hidden');
            return;
        }

        // 2. Verifica se comprou e recebeu (Status 'Entregue')
        // Precisamos buscar nos itens de pedido onde o pedido tem status 'Entregue'
        const { data: purchases } = await supabase
            .from('order_items')
            .select(`
                id, 
                orders!inner (
                    status, 
                    user_id
                )
            `)
            .eq('product_id', currentProductId)
            .eq('orders.user_id', currentUser.id)
            .eq('orders.status', 'Entregue');

        if (purchases && purchases.length > 0) {
            // Tudo certo, pode avaliar
            reviewForm.classList.remove('hidden');
        } else {
            // Não comprou ou não recebeu
            reviewForm.innerHTML = `
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <p class="text-yellow-700">
                        <strong>Apenas compradores podem avaliar.</strong><br>
                        Para deixar sua opinião, você precisa comprar este produto e aguardar a entrega ser confirmada.
                    </p>
                </div>`;
            reviewForm.classList.remove('hidden');
        }
    }

    async function handleReviewSubmit(e) {
        e.preventDefault();
        if (!currentUser || !currentProductId) return;

        const rating = reviewForm.rating.value;
        const comment = reviewForm.comment.value;
        
        if (!rating) {
            alert('Por favor, selecione uma nota.');
            return;
        }

        try {
            const { error } = await supabase
                .from('product_reviews')
                .insert({
                    product_id: currentProductId,
                    user_id: currentUser.id,
                    rating: parseInt(rating),
                    comment: comment
                });
            
            if (error) {
                // Se o banco bloquear (caso alguém tente burlar o HTML), mostramos o erro
                if (error.message.includes('policy')) {
                    throw new Error('Você não tem permissão para avaliar este produto (é necessário ter comprado e recebido).');
                }
                throw error;
            }
            
            alert('Avaliação enviada com sucesso!');
            reviewForm.reset();
            
            // Recarrega a elegibilidade (vai esconder o form e mostrar "Já avaliou")
            await checkReviewEligibility();
            
            const { data: reviews } = await supabase.from('product_reviews').select('*, profiles(full_name)').eq('product_id', currentProductId).order('created_at', { ascending: false });
            populateReviews(reviews);

        } catch (error) {
            console.error('Erro ao salvar avaliação:', error);
            alert(error.message || 'Erro ao salvar sua avaliação. Tente novamente.');
        }
    }

    const productId = getProductId();
    if (productId) {
        // Primeiro carrega o produto para ter o ID
        await loadProductData(productId);
        
        // Pega o usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        currentUser = user;

        // --- NOVA LÓGICA DE VERIFICAÇÃO AO INICIAR ---
        const addToCartBtn = document.getElementById('add-to-cart-btn');
        if(addToCartBtn) {
             addToCartBtn.addEventListener('click', () => {
                const userId = localStorage.getItem('currentUserId');
                if (!userId) {
                    document.getElementById('login-prompt-modal')?.classList.remove('hidden');
                } else {
                    addToCart(currentProductId, 1);
                }
            });
        }
       
        await checkReviewEligibility(); // Verifica se pode mostrar o form

        reviewForm.addEventListener('submit', handleReviewSubmit);

    } else {
        loadingSpinner.innerHTML = '<p class="text-red-500 text-center text-lg"><b>Erro:</b> ID do produto não encontrado.<br><a href="index.html" class="text-brand-primary underline">Voltar para a loja</a></p>';
    }
});