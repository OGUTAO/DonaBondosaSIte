import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {

    const productForm = document.getElementById('product-form');
    const productMessage = document.getElementById('product-message');
    const clearFormBtn = document.getElementById('clear-form-btn');
    const productListContainer = document.getElementById('product-list');
    const productIdInput = document.getElementById('product_id');

    const imageGallerySection = document.getElementById('image-gallery-section');
    const imageList = document.getElementById('image-list');
    const imageUploadInput = document.getElementById('image-upload');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const uploadStatus = document.getElementById('upload-status');

    const createAdminForm = document.getElementById('create-admin-form');
    const createAdminMessage = document.getElementById('create-admin-message');
    const adminFormContainer = document.getElementById('admin-form-container');
    
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'developer' && adminFormContainer) {
        adminFormContainer.classList.remove('hidden');
    }

    const loadProducts = async () => {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('name');
        
        if (error) {
            productListContainer.innerHTML = '<p class="text-red-500">Erro ao carregar produtos.</p>';
            return;
        }

        if (products.length === 0) {
            productListContainer.innerHTML = '<p class="text-gray-500">Nenhum produto cadastrado ainda.</p>';
            return;
        }

        productListContainer.innerHTML = products.map(product => `
            <div class="border p-4 rounded-lg flex justify-between items-center">
                <div>
                    <p class="font-bold">${product.name}</p>
                    <p class="text-gray-600">
                        Preço Atual: <span class="text-green-600 font-semibold">R$ ${product.current_price.toFixed(2)}</span>
                        ${product.previous_price ? `<span class="text-red-500 line-through ml-2">R$ ${product.previous_price.toFixed(2)}</span>` : ''}
                    </p>
                </div>
                <div class="space-x-2">
                    <button class="edit-product-btn text-blue-600 hover:text-blue-800" data-id="${product.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
        `).join('');
    };
    
    const loadProductImages = async (productId) => {
        imageList.innerHTML = '';
        const { data: images, error } = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', productId);
            
        if (error) {
            console.error('Erro ao carregar imagens:', error);
            return;
        }

        images.forEach(image => {
            const imgElement = `
                <div class="relative group">
                    <img src="${image.image_url}" alt="${image.alt_text || 'Imagem do produto'}" class="w-full h-24 object-cover rounded-lg">
                    <button class="delete-image-btn absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-image-id="${image.id}" data-image-url="${image.image_url}">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>
            `;
            imageList.insertAdjacentHTML('beforeend', imgElement);
        });
    };

    const handleImageUpload = async () => {
        const file = imageUploadInput.files[0];
        const productId = productIdInput.value;
        if (!file || !productId) {
            uploadStatus.textContent = 'Selecione um produto para editar e escolha um arquivo.';
            return;
        }

        uploadImageBtn.disabled = true;
        uploadStatus.textContent = 'Enviando imagem...';

        try {
            const fileName = `${productId}/${Date.now()}-${file.name}`;
            
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);
            
            const publicUrl = publicUrlData.publicUrl;

            const { error: dbError } = await supabase
                .from('product_images')
                .insert({
                    product_id: productId,
                    image_url: publicUrl,
                    alt_text: productForm.name.value
                });
            
            if (dbError) throw dbError;

            uploadStatus.textContent = 'Upload completo!';
            imageUploadInput.value = '';
            await loadProductImages(productId);

        } catch (error) {
            console.error('Erro no upload:', error);
            uploadStatus.textContent = `Erro: ${error.message}`;
        } finally {
            uploadImageBtn.disabled = false;
        }
    };

    const handleImageDelete = async (imageId, imageUrl) => {
        if (!confirm('Tem certeza que quer apagar esta imagem?')) return;

        try {
            const { error: dbError } = await supabase
                .from('product_images')
                .delete()
                .eq('id', imageId);
            
            if (dbError) throw dbError;

            const fileName = imageUrl.split('/product-images/')[1];
            const { error: storageError } = await supabase.storage
                .from('product-images')
                .remove([fileName]);
            
            if (storageError) console.warn("Erro ao apagar do storage:", storageError.message);

            await loadProductImages(productIdInput.value);

        } catch (error) {
            console.error('Erro ao apagar imagem:', error);
            alert(`Erro ao apagar imagem: ${error.message}`);
        }
    };

    const fillFormForEdit = async (id) => {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Erro ao buscar dados do produto.');
            return;
        }

        productForm.product_id.value = product.id;
        productForm.name.value = product.name;
        productForm.description.value = product.description;
        productForm.current_price.value = product.current_price;
        
        imageGallerySection.classList.remove('hidden');
        await loadProductImages(id);
        
        window.scrollTo(0, 0);
    };
    
    const resetProductForm = () => {
        productForm.reset();
        productIdInput.value = '';
        productMessage.textContent = '';
        productMessage.className = 'mt-4 text-center font-semibold';
        imageGallerySection.classList.add('hidden');
        imageList.innerHTML = '';
        uploadStatus.textContent = '';
        imageUploadInput.value = '';
    };

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(productForm);
        const productId = formData.get('product_id');
        const newPrice = parseFloat(formData.get('current_price'));

        let productData = {
            name: formData.get('name'),
            description: formData.get('description'),
        };

        try {
            if (productId) {
                const { data: existingProduct, error: fetchError } = await supabase
                    .from('products')
                    .select('current_price')
                    .eq('id', productId)
                    .single();
                
                if (fetchError) throw fetchError;
                const oldPrice = existingProduct.current_price;

                if (newPrice < oldPrice) {
                    productData.current_price = newPrice;
                    productData.previous_price = oldPrice;
                } else {
                    productData.current_price = newPrice;
                    productData.previous_price = null;
                }

                const { error: updateError } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', productId);
                
                if (updateError) throw updateError;
                productMessage.textContent = 'Produto atualizado com sucesso!';
                productMessage.className = 'mt-4 text-center font-semibold text-green-600';

            } else {
                productData.current_price = newPrice;

                const { data: newProduct, error: insertError } = await supabase
                    .from('products')
                    .insert([productData])
                    .select()
                    .single();
                
                if (insertError) throw insertError;
                
                productMessage.textContent = 'Produto criado com sucesso! Agora você pode adicionar fotos.';
                productMessage.className = 'mt-4 text-center font-semibold text-green-600';
                
                fillFormForEdit(newProduct.id);
            }
            
            loadProducts();

        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            productMessage.textContent = `Erro: ${error.message}`;
            productMessage.className = 'mt-4 text-center font-semibold text-red-600';
        }
    });
    
    clearFormBtn.addEventListener('click', resetProductForm);

    productListContainer.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-product-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            fillFormForEdit(id);
        }
    });

    uploadImageBtn.addEventListener('click', handleImageUpload);
    imageList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-image-btn');
        if (deleteBtn) {
            const imageId = deleteBtn.dataset.imageId;
            const imageUrl = deleteBtn.dataset.imageUrl;
            handleImageDelete(imageId, imageUrl);
        }
    });

    createAdminForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = createAdminForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Criando...';
        createAdminMessage.textContent = '';
        
        const email = createAdminForm.email.value;
        const password = createAdminForm.password.value;
        const full_name = createAdminForm.full_name.value;

        const response = await fetch('/api/create-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name })
        });
        const result = await response.json();
        if (response.ok) {
            createAdminMessage.textContent = 'Funcionário criado com sucesso!';
            createAdminMessage.className = 'mt-4 text-center font-semibold text-green-600';
            createAdminForm.reset();
        } else {
            createAdminMessage.textContent = `Erro: ${result.error}`;
            createAdminMessage.className = 'mt-4 text-center font-semibold text-red-600';
        }
        submitButton.disabled = false;
        submitButton.textContent = 'Criar Funcionário';
    });

    loadProducts();
});