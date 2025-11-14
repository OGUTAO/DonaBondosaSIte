import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {

    const productForm = document.getElementById('product-form');
    const productMessage = document.getElementById('product-message');
    const clearFormBtn = document.getElementById('clear-form-btn');
    const productListContainer = document.getElementById('product-list');
    const productIdInput = document.getElementById('product_id');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const searchInput = document.getElementById('search-product-input');

    const imageGallerySection = document.getElementById('image-gallery-section');
    const imageList = document.getElementById('image-list');
    const imageUploadInput = document.getElementById('image-upload');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const uploadStatus = document.getElementById('upload-status');
    
    // --- FUNÇÃO DE CARREGAR PRODUTOS ATUALIZADA ---
    const loadProducts = async (searchTerm = '') => {
        
        // --- MUDANÇA 1: Query atualizada para buscar os nomes dos perfis (JOIN) ---
        let query = supabase
            .from('products')
            .select(`
                *,
                created_by_profile:created_by (full_name),
                updated_by_profile:updated_by (full_name)
            `);
        
        if (searchTerm) {
            query = query.ilike('name', `%${searchTerm}%`);
        }

        const { data: products, error } = await query
            .order('is_new', { ascending: false })
            .order('name');
        
        if (error) {
            productListContainer.innerHTML = '<p class="text-red-500">Erro ao carregar produtos.</p>';
            console.error(error); // Mostra o erro no console
            return;
        }

        if (products.length === 0) {
            productListContainer.innerHTML = '<p class="text-gray-500">Nenhum produto cadastrado (ou encontrado na busca).</p>';
            return;
        }

        productListContainer.innerHTML = products.map(product => {
            
            // --- MUDANÇA 2: Pega os nomes, com 'N/A' se não existir ---
            const createdName = product.created_by_profile ? product.created_by_profile.full_name : 'N/A';
            const updatedName = product.updated_by_profile ? product.updated_by_profile.full_name : 'N/A';

            return `
            <div class="border p-4 rounded-lg flex justify-between items-center">
                <div>
                    <p class="font-bold">${product.name}
                        ${product.is_new ? '<span class="ml-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded">NOVIDADE</span>' : ''}
                    </p>
                    <p class="text-gray-600">
                        Preço Atual: <span class="text-green-600 font-semibold">R$ ${product.current_price.toFixed(2)}</span>
                        ${product.previous_price ? `<span class="text-red-500 line-through ml-2">R$ ${product.previous_price.toFixed(2)}</span>` : ''}
                    </p>
                    
                    <p class="text-xs text-gray-500 mt-2">
                        Criado por: <strong>${createdName}</strong><br>
                        Última att: <strong>${updatedName}</strong>
                    </p>
                </div>
                <div class="space-x-2">
                    <button class="edit-product-btn text-blue-600 hover:text-blue-800" data-id="${product.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
            `;
        }).join('');
    };
    
    const uploadAndLinkImage = async (productId, productName, file) => {
        if (!file) {
            uploadStatus.textContent = 'Por favor, escolha um arquivo de imagem.';
            return false;
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
                    alt_text: productName
                });
            if (dbError) throw dbError;
            uploadStatus.textContent = 'Upload completo!';
            imageUploadInput.value = ''; 
            await loadProductImages(productId); 
            return true;
        } catch (error) {
            console.error('Erro no upload:', error);
            uploadStatus.textContent = `Erro: ${error.message}`;
            return false;
        } finally {
            uploadImageBtn.disabled = false; 
        }
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
        const productId = productIdInput.value;
        const productName = productForm.name.value;
        const file = imageUploadInput.files[0];
        if (!file) {
            uploadStatus.textContent = 'Por favor, escolha um arquivo de imagem.';
            return;
        }
        if (!productId) return; 
        await uploadAndLinkImage(productId, productName, file);
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
        productForm.is_new.checked = product.is_new;
        await loadProductImages(id);
        uploadImageBtn.classList.remove('hidden');
        imageUploadInput.disabled = false;
        uploadStatus.textContent = 'Adicione mais fotos à galeria.';
        cancelEditBtn.classList.remove('hidden');
        clearFormBtn.classList.add('hidden');
        window.scrollTo(0, 0);
    };
    
    const resetProductForm = () => {
        productForm.reset();
        productIdInput.value = '';
        productMessage.textContent = '';
        productMessage.className = 'mt-4 text-center font-semibold';
        productForm.is_new.checked = false;
        imageList.innerHTML = '';
        imageUploadInput.value = '';
        uploadImageBtn.classList.add('hidden'); 
        imageUploadInput.disabled = false; 
        uploadStatus.textContent = 'Escolha uma imagem para o novo produto. Ela será enviada ao salvar.';
        cancelEditBtn.classList.add('hidden');
        clearFormBtn.classList.remove('hidden');
    };

    // --- FUNÇÃO DE SUBMIT ATUALIZADA ---
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // --- MUDANÇA 4: Pega o ID do usuário logado ---
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            productMessage.textContent = 'Erro: Não foi possível identificar o usuário. Faça login novamente.';
            productMessage.className = 'mt-4 text-center font-semibold text-red-600';
            return;
        }
        const currentUserId = user.id;

        const formData = new FormData(productForm);
        const productId = formData.get('product_id');
        const newPrice = parseFloat(formData.get('current_price'));
        const is_new = productForm.is_new.checked;

        let productData = {
            name: formData.get('name'),
            description: formData.get('description'),
            is_new: is_new
        };

        try {
            if (productId) {
                // --- MODO DE ATUALIZAÇÃO ---
                // --- MUDANÇA 5: Adiciona o 'updated_by' ---
                productData.updated_by = currentUserId;

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
                resetProductForm();

            } else {
                // --- MODO DE CRIAÇÃO ---
                productData.current_price = newPrice;
                
                // --- MUDANÇA 6: Adiciona 'created_by' e 'updated_by' ---
                productData.created_by = currentUserId;
                productData.updated_by = currentUserId;

                const { data: newProduct, error: insertError } = await supabase
                    .from('products')
                    .insert([productData])
                    .select()
                    .single();
                if (insertError) throw insertError;
                
                productMessage.textContent = 'Produto criado com sucesso!';
                
                const fileToUpload = imageUploadInput.files[0];
                if (fileToUpload) {
                    productMessage.textContent = 'Produto criado! Enviando imagem...';
                    const uploadSuccess = await uploadAndLinkImage(newProduct.id, newProduct.name, fileToUpload);
                    if(uploadSuccess) {
                        productMessage.textContent = 'Produto e imagem salvos com sucesso!';
                    } else {
                         productMessage.textContent = 'Produto salvo, mas houve um erro ao enviar a imagem.';
                    }
                }
                resetProductForm(); 
            }
            loadProducts(searchInput.value);
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            productMessage.textContent = `Erro: ${error.message}`;
            productMessage.className = 'mt-4 text-center font-semibold text-red-600';
        }
    });
    
    clearFormBtn.addEventListener('click', resetProductForm);
    cancelEditBtn.addEventListener('click', resetProductForm);

    productListContainer.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-product-btn');
        if (editBtn) {
            productMessage.textContent = ''; 
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
    
    searchInput.addEventListener('input', () => {
        loadProducts(searchInput.value);
    });

    loadProducts(); 
    resetProductForm(); 
});