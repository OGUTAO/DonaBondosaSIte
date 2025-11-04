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
                    <p class="text-gray-600 mt-2">${review.comment}</p>
                </div>
            `;
            reviewList.insertAdjacentHTML('beforeend', reviewElement);
        });
    }
    
    async function checkUserForReview() {
        const { data } = await supabase.auth.getUser();
        currentUser = data.user;
        
        if (currentUser) {
            reviewForm.classList.remove('hidden');
            reviewLoginPrompt.classList.add('hidden');
        } else {
            reviewForm.classList.add('hidden');
            reviewLoginPrompt.classList.remove('hidden');
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
            
            if (error) throw error;
            
            alert('Avaliação enviada com sucesso!');
            reviewForm.reset();
            
            const { data: reviews } = await supabase.from('product_reviews').select('*, profiles(full_name)').eq('product_id', currentProductId).order('created_at', { ascending: false });
            populateReviews(reviews);

        } catch (error) {
            console.error('Erro ao salvar avaliação:', error);
            alert('Erro ao salvar sua avaliação. Tente novamente.');
        }
    }


    const productId = getProductId();
    if (productId) {
        loadProductData(productId);
        checkUserForReview();
        
        addToCartBtn.addEventListener('click', () => {
            addToCart(currentProductId, 1);
        });

        reviewForm.addEventListener('submit', handleReviewSubmit);

    } else {
        loadingSpinner.innerHTML = '<p class="text-red-500 text-center text-lg"><b>Erro:</b> ID do produto não encontrado.<br><a href="index.html" class="text-brand-primary underline">Voltar para a loja</a></p>';
    }
});