import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DAS ABAS ---
    const tabProdutos = document.getElementById('tab-produtos');
    const tabPedidos = document.getElementById('tab-pedidos');
    const contentProdutos = document.getElementById('content-produtos');
    const contentPedidos = document.getElementById('content-pedidos');

    // --- ELEMENTOS DE PRODUTOS ---
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
    
    // --- ELEMENTOS DO MODAL DE EXCLUSÃO ---
    const deleteModal = document.getElementById('delete-product-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // --- ELEMENTOS DE PEDIDOS E MODAL DE DETALHES ---
    const ordersListBody = document.getElementById('orders-list-body');
    const ordersLoading = document.getElementById('orders-loading');
    const filterStatus = document.getElementById('filter-status');
    
    const orderDetailsModal = document.getElementById('order-details-modal');
    const modalOrderId = document.getElementById('modal-order-id');
    const modalItemsList = document.getElementById('modal-items-list');
    const closeDetailsBtn = document.getElementById('close-details-btn');
    const closeDetailsBtnAction = document.getElementById('close-details-btn-action');

    // Armazena os pedidos carregados para acesso rápido no modal
    let currentOrders = [];


    // --- LÓGICA DE ABAS ---
    const switchTab = (tabName) => {
        if (tabName === 'produtos') {
            contentProdutos.classList.remove('hidden');
            contentPedidos.classList.add('hidden');
            
            tabProdutos.classList.add('border-brand-primary', 'text-brand-primary', 'font-bold');
            tabProdutos.classList.remove('border-transparent', 'text-gray-500');
            
            tabPedidos.classList.remove('border-brand-primary', 'text-brand-primary', 'font-bold');
            tabPedidos.classList.add('border-transparent', 'text-gray-500');
        } else {
            contentProdutos.classList.add('hidden');
            contentPedidos.classList.remove('hidden');
            
            tabPedidos.classList.add('border-brand-primary', 'text-brand-primary', 'font-bold');
            tabPedidos.classList.remove('border-transparent', 'text-gray-500');
            
            tabProdutos.classList.remove('border-brand-primary', 'text-brand-primary', 'font-bold');
            tabProdutos.classList.add('border-transparent', 'text-gray-500');
            
            // Carrega os pedidos ao entrar na aba
            loadOrders();
        }
    };

    tabProdutos.addEventListener('click', () => switchTab('produtos'));
    tabPedidos.addEventListener('click', () => switchTab('pedidos'));


    // ==========================================
    // LÓGICA DE PRODUTOS
    // ==========================================
    
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
                .from('product-images')
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

    const handleDeleteProduct = async (productId) => {
        try {
            if (productIdInput.value === productId) resetProductForm();
            const { data: images, error: imgError } = await supabase
                .from('product_images')
                .select('image_url')
                .eq('product_id', productId);
            if (imgError) throw imgError;
            if (images && images.length > 0) {
                const filePaths = images.map(img => img.image_url.split('/product-images/')[1]);
                await supabase.storage.from('product-images').remove(filePaths);
            }
            const { error: productError } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);
            if (productError) throw productError;
            productMessage.textContent = 'Produto excluído com sucesso!';
            productMessage.className = 'mt-4 text-center font-semibold text-green-600';
            loadProducts(searchInput.value);
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            productMessage.textContent = `Erro ao excluir produto: ${error.message}`;
            productMessage.className = 'mt-4 text-center font-semibold text-red-600';
        }
    };

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;
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
                    await uploadAndLinkImage(newProduct.id, newProduct.name, fileToUpload);
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
        const deleteBtn = e.target.closest('.delete-product-btn'); 
        
        if (editBtn) {
            productMessage.textContent = ''; 
            const id = editBtn.dataset.id;
            fillFormForEdit(id);
            return;
        }

        if (deleteBtn) { 
            const id = deleteBtn.dataset.id;
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

    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        deleteModal.dataset.productId = ''; 
    });

    confirmDeleteBtn.addEventListener('click', () => {
        const id = deleteModal.dataset.productId;
        if (id) handleDeleteProduct(id);
        deleteModal.classList.add('hidden'); 
        deleteModal.dataset.productId = '';
    });


    // ==========================================
    // LÓGICA DE PEDIDOS (COM DETALHES)
    // ==========================================

    // --- FUNÇÃO PARA PREENCHER E ABRIR O MODAL DE DETALHES ---
    const openOrderDetails = (orderId) => {
        const order = currentOrders.find(o => o.id == orderId);
        if (!order) return;

        modalOrderId.textContent = `#${order.id}`;
        modalItemsList.innerHTML = '';

        order.order_items.forEach(item => {
            const prodName = item.products ? item.products.name : 'Produto Removido';
            const price = parseFloat(item.price_at_purchase);
            const total = price * item.quantity;

            const itemHtml = `
                <div class="flex justify-between items-center border-b border-gray-200 pb-2 last:border-0">
                    <div>
                        <p class="font-bold text-gray-800">${prodName}</p>
                        <p class="text-sm text-gray-500">Qtd: ${item.quantity} x R$ ${price.toFixed(2)}</p>
                    </div>
                    <p class="font-bold text-brand-primary">R$ ${total.toFixed(2)}</p>
                </div>
            `;
            modalItemsList.insertAdjacentHTML('beforeend', itemHtml);
        });

        // Adiciona resumo do total
        const totalHtml = `
             <div class="mt-4 pt-4 border-t border-gray-300 flex justify-between items-center">
                <span class="font-bold text-xl">Total do Pedido</span>
                <span class="font-bold text-xl text-brand-primary">R$ ${order.total_amount.toFixed(2)}</span>
             </div>
        `;
        modalItemsList.insertAdjacentHTML('beforeend', totalHtml);

        orderDetailsModal.classList.remove('hidden');
    };

    // Fecha o modal
    const closeOrderDetails = () => {
        orderDetailsModal.classList.add('hidden');
    };
    closeDetailsBtn.addEventListener('click', closeOrderDetails);
    closeDetailsBtnAction.addEventListener('click', closeOrderDetails);


    const loadOrders = async () => {
        if (!ordersListBody) return;
        
        ordersLoading.classList.remove('hidden');
        ordersListBody.innerHTML = '';

        let query = supabase
            .from('orders')
            .select(`
                *,
                profiles!fk_cliente (full_name, email),
                admin_profile:profiles!fk_admin (full_name),
                order_items (
                    quantity,
                    price_at_purchase,
                    products (name)
                )
            `)
            .order('created_at', { ascending: false });

        if (filterStatus && filterStatus.value !== 'all') {
            query = query.eq('status', filterStatus.value);
        }

        const { data: orders, error } = await query;
        
        // Armazena em memória
        currentOrders = orders || [];

        ordersLoading.classList.add('hidden');

        if (error) {
            console.error('Erro ao carregar pedidos:', error);
            ordersListBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Erro ao carregar pedidos.</td></tr>';
            return;
        }

        if (orders.length === 0) {
            ordersListBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhum pedido encontrado.</td></tr>';
            return;
        }

        orders.forEach(order => {
            // Cria resumo curto
            const itemsSummary = order.order_items.map(i => `${i.quantity}x ${i.products?.name || 'Item removido'}`).join(', ');
            const updatedBy = order.admin_profile ? `<br><span class="text-xs text-gray-500">Att por: ${order.admin_profile.full_name}</span>` : '';

            let statusColor = 'bg-gray-200 text-gray-800';
            if (order.status === 'Em Análise') statusColor = 'bg-yellow-200 text-yellow-800';
            if (order.status === 'Em Produção') statusColor = 'bg-blue-200 text-blue-800';
            if (order.status === 'A Caminho') statusColor = 'bg-purple-200 text-purple-800';
            if (order.status === 'Entregue') statusColor = 'bg-green-200 text-green-800';
            if (order.status === 'Cancelado') statusColor = 'bg-red-200 text-red-800';

            const row = `
                <tr class="border-b border-gray-200 hover:bg-gray-50">
                    <td class="px-5 py-5 text-sm">
                        <p class="text-gray-900 whitespace-no-wrap font-bold">#${order.id}</p>
                        <p class="text-gray-600 whitespace-no-wrap">${order.profiles?.full_name || 'Desconhecido'}</p>
                        <p class="text-gray-500 text-xs">${order.profiles?.email || ''}</p>
                    </td>
                    <td class="px-5 py-5 text-sm">
                        <div class="flex flex-col items-start">
                            <span class="text-gray-900 whitespace-no-wrap truncate w-48 block" title="${itemsSummary}">${itemsSummary}</span>
                            <button class="view-details-btn text-brand-primary text-xs font-bold hover:underline mt-1" data-id="${order.id}">
                                Ver Detalhes
                            </button>
                        </div>
                    </td>
                    <td class="px-5 py-5 text-sm">
                        <p class="text-gray-900 whitespace-no-wrap font-bold">R$ ${order.total_amount.toFixed(2)}</p>
                    </td>
                    <td class="px-5 py-5 text-sm">
                        <span class="relative inline-block px-3 py-1 font-semibold leading-tight ${statusColor} rounded-full">
                            <span aria-hidden class="absolute inset-0 opacity-50 rounded-full"></span>
                            <span class="relative">${order.status}</span>
                        </span>
                        ${updatedBy}
                    </td>
                    <td class="px-5 py-5 text-sm">
                        <select class="status-change-select p-2 border rounded bg-white cursor-pointer focus:ring-2 focus:ring-brand-accent" data-order-id="${order.id}">
                            <option value="" disabled selected>Alterar Status</option>
                            <option value="Em Análise">Em Análise</option>
                            <option value="Em Produção">Em Produção</option>
                            <option value="A Caminho">A Caminho</option>
                            <option value="Entregue">Entregue</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </td>
                </tr>
            `;
            ordersListBody.insertAdjacentHTML('beforeend', row);
        });
    };

    if (ordersListBody) {
        ordersListBody.addEventListener('click', (e) => {
             // Listener para ver detalhes
             const viewBtn = e.target.closest('.view-details-btn');
             if (viewBtn) {
                 e.preventDefault();
                 const orderId = viewBtn.dataset.id;
                 openOrderDetails(orderId);
                 return;
             }
        });
        
        ordersListBody.addEventListener('change', async (e) => {
            if (e.target.classList.contains('status-change-select')) {
                const newStatus = e.target.value;
                const orderId = e.target.dataset.orderId;
                
                if (!confirm(`Deseja alterar o status do pedido #${orderId} para "${newStatus}"? O cliente será notificado.`)) {
                    e.target.value = ""; 
                    return;
                }

                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    
                    const { error } = await supabase
                        .from('orders')
                        .update({ 
                            status: newStatus,
                            last_updated_by: user.id 
                        })
                        .eq('id', orderId);

                    if (error) throw error;
                    alert(`Status atualizado para "${newStatus}"!`);
                    loadOrders();

                } catch (error) {
                    console.error('Erro ao atualizar status:', error);
                    alert('Erro ao atualizar status.');
                }
            }
        });
    }

    if (filterStatus) {
        filterStatus.addEventListener('change', loadOrders);
    }

    loadProducts(); 
});