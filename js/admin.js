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
    
    // --- NOVOS ELEMENTOS DO MODAL ---
    const deleteModal = document.getElementById('delete-product-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    
    const loadProducts = async (searchTerm = '') => {
        
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
            console.error(error); 
            return;
        }

        if (products.length === 0) {
            productListContainer.innerHTML = '<p class="text-gray-500">Nenhum produto cadastrado (ou encontrado na busca).</p>';
            return;
        }

        productListContainer.innerHTML = products.map(product => {
            
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
                
                <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button class="edit-product-btn text-blue-600 hover:text-blue-800" data-id="${product.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="delete-product-btn text-red-600 hover:text-red-800" data-id="${product.id}">
                        <i class="fas fa-trash"></i> Excluir
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

    // --- FUNÇÃO PARA DELETAR O PRODUTO (confirm() REMOVIDO) ---
    const handleDeleteProduct = async (productId) => {
        // O pop-up de confirmação agora é o modal!
        
        try {
            if (productIdInput.value === productId) {
                resetProductForm();
            }

            // 1. Achar todas as imagens do produto no Storage
            const { data: images, error: imgError } = await supabase
                .from('product_images')
                .select('image_url')
                .eq('product_id', productId);
            
            if (imgError) throw imgError;

            // 2. Deletar as imagens do Storage (se houver)
            if (images && images.length > 0) {
                const filePaths = images.map(img => img.image_url.split('/product-images/')[1]);
                const { error: storageError } = await supabase.storage
                    .from('product-images')
                    .remove(filePaths);
                if (storageError) {
                    console.warn("Erro ao deletar arquivos do storage (continuando):", storageError);
                }
            }

            // 3. Deletar o produto da tabela 'products'
            const { error: productError } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);
            
            if (productError) throw productError;

            // 4. Sucesso
            productMessage.textContent = 'Produto excluído com sucesso!';
            productMessage.className = 'mt-4 text-center font-semibold text-green-600';
            loadProducts(searchInput.value); // Recarrega a lista

        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            productMessage.textContent = `Erro ao excluir produto: ${error.message}`;
            productMessage.className = 'mt-4 text-center font-semibold text-red-600';
        }
    };


    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
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
                // MODO DE ATUALIZAÇÃO
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
                // MODO DE CRIAÇÃO
                productData.current_price = newPrice;
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

    // --- LISTENER ATUALIZADO para chamar o MODAL ---
    productListContainer.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-product-btn');
        const deleteBtn = e.target.closest('.delete-product-btn'); 
        
        if (editBtn) {
            productMessage.textContent = ''; 
            const id = editBtn.dataset.id;
            fillFormForEdit(id);
            return;
        }

        if (deleteBtn) { 
            const id = deleteBtn.dataset.id;
            // Salva o ID no modal e mostra o modal
            deleteModal.dataset.productId = id;
            deleteModal.classList.remove('hidden');
            return;
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

    // --- NOVOS LISTENERS PARA O MODAL ---
    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        deleteModal.dataset.productId = ''; // Limpa o ID
    });

    confirmDeleteBtn.addEventListener('click', () => {
        const id = deleteModal.dataset.productId;
        if (id) {
            handleDeleteProduct(id);
        }
        deleteModal.classList.add('hidden'); // Esconde o modal
        deleteModal.dataset.productId = ''; // Limpa o ID
    });


    loadProducts(); 
    resetProductForm(); 
});