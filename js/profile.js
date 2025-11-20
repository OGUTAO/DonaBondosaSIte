import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const loadingSpinner = document.getElementById('loading-spinner');
    const pageContent = document.getElementById('page-content');
    const logoutButton = document.getElementById('logout-button');
    
    const COMPANY_PHONE = '5561991177578'; 
    
    let currentUser = null;

    const profileForm = document.getElementById('profile-form');
    const updateMessage = document.getElementById('update-message');
    const addressListContainer = document.getElementById('address-list-container');
    const addAddressBtn = document.getElementById('add-address-btn');
    const addressModal = document.getElementById('address-modal');
    const closeAddressModalBtn = document.getElementById('close-address-modal');
    const addressForm = document.getElementById('address-form');
    const modalTitle = document.getElementById('modal-title');
    const addressErrorMessage = document.getElementById('address-error-message');
    const citySelect = document.getElementById('city');
    const cityOtherContainer = document.getElementById('city-other-container');
    const cityOtherInput = document.getElementById('city_other');
    const contentPedidos = document.getElementById('content-pedidos');
    
    const tabs = {
        dados: document.getElementById('tab-dados'),
        enderecos: document.getElementById('tab-enderecos'),
        pedidos: document.getElementById('tab-pedidos'),
    };
    const contents = {
        dados: document.getElementById('content-dados'),
        enderecos: document.getElementById('content-enderecos'),
        pedidos: document.getElementById('content-pedidos'),
    };

    const initializePage = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;
        
        await loadUserProfile();
        await loadUserAddresses();
        await loadUserOrders(); 

        loadingSpinner.classList.add('hidden');
        pageContent.classList.remove('hidden');

        setupTabs();
        checkUrlTab(); 
        setupEventListeners();
    };
    
    const formatOrderId = (order) => {
        if (!order.created_at || !order.sequence_number) return `#${order.id}`;
        const date = new Date(order.created_at);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `#${order.sequence_number}${month}${year}`;
    };

    const loadUserOrders = async () => {
        const ordersContainer = contentPedidos.querySelector('div'); 
        
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        quantity,
                        price_at_purchase,
                        products (name)
                    )
                `)
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            let html = `
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-lg">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-yellow-700">
                                <strong>Política de Cancelamento:</strong> Você pode cancelar seu pedido enquanto o status for "Pendente" ou "Em Análise". Após entrar "Em Produção", o cancelamento não será mais possível pelo site.
                            </p>
                        </div>
                    </div>
                </div>
                <h2 class="text-2xl font-bold text-brand-primary mb-6">Histórico de Pedidos</h2>
            `;

            if (orders.length === 0) {
                ordersContainer.innerHTML = html + '<div class="text-center py-10 bg-gray-50 rounded-lg"><p class="text-gray-500 text-lg">Você ainda não fez nenhum pedido.</p><a href="produtos.html" class="text-brand-primary font-bold hover:underline mt-2 inline-block">Ir às compras</a></div>';
                return;
            }
            
            html += '<div class="space-y-8">';
            
            orders.forEach(order => {
                const date = new Date(order.created_at).toLocaleDateString('pt-BR');
                const displayId = formatOrderId(order); 
                
                let statusBadgeClass = 'bg-gray-100 text-gray-600';
                let canCancel = false;

                // Lógica de cores e cancelamento
                if (order.status === 'Pendente') {
                    statusBadgeClass = 'bg-black-200 text-gray-700 border border-gray-300';
                    canCancel = true; 
                } else if (order.status === 'Em Análise') {
                    statusBadgeClass = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
                    canCancel = true; 
                } else if (order.status === 'Em Produção') {
                    statusBadgeClass = 'bg-blue-100 text-blue-800 border border-blue-200';
                } else if (order.status === 'A Caminho') {
                    statusBadgeClass = 'bg-purple-100 text-purple-800 border border-purple-200';
                } else if (order.status === 'Entregue') {
                    statusBadgeClass = 'bg-green-100 text-green-800 border border-green-200';
                } else if (order.status === 'Cancelado') {
                    statusBadgeClass = 'bg-red-100 text-red-800 border border-red-200';
                }
                
                const waLink = generateWhatsAppLink(order, currentUser.email, displayId);

                let itemsHtml = '';
                order.order_items.forEach(item => {
                    const prodName = item.products ? item.products.name : 'Produto Indisponível';
                    itemsHtml += `
                        <li class="flex justify-between text-gray-700 py-1 border-b border-gray-100 last:border-0">
                            <span>${item.quantity}x ${prodName}</span>
                        </li>`;
                });

                const cancelButton = canCancel 
                    ? `<button class="cancel-order-btn border border-red-500 text-red-500 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition text-sm" data-id="${order.id}">
                         <i class="fas fa-times mr-1"></i> Cancelar Pedido
                       </button>` 
                    : '';

                // --- ALTERAÇÃO AQUI: Botão só aparece se status for 'Pendente' ---
                const payButton = order.status === 'Pendente'
                    ? `<a href="${waLink}" target="_blank" class="bg-green-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-600 transition text-sm flex items-center shadow-sm">
                        <i class="fab fa-whatsapp mr-2"></i> Fazer Pagamento
                       </a>`
                    : '';

                html += `
                    <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition duration-300">
                        <div class="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-200">
                            <div>
                                <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">PEDIDO</span>
                                <h3 class="font-bold text-xl text-brand-primary">${displayId}</h3>
                                <p class="text-xs text-gray-400">${date}</p>
                            </div>
                            <div class="text-right">
                                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusBadgeClass}">
                                    ${order.status}
                                </span>
                                <p class="font-bold text-brand-accent mt-1 text-lg">R$ ${order.total_amount.toFixed(2)}</p>
                            </div>
                        </div>
                        
                        <div class="p-6">
                            <h4 class="text-sm font-bold text-gray-500 mb-3 uppercase">ITENS</h4>
                            <ul class="mb-6">
                                ${itemsHtml}
                            </ul>
                            
                            <div class="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-100">
                                ${cancelButton}
                                ${payButton}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            ordersContainer.innerHTML = html;
            
            document.querySelectorAll('.cancel-order-btn').forEach(btn => {
                btn.addEventListener('click', handleCancelOrder);
            });

        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
            ordersContainer.innerHTML = '<p class="text-red-500">Erro ao carregar pedidos.</p>';
        }
    };

    const handleCancelOrder = async (e) => {
        const orderId = e.target.dataset.id; 
        const btn = e.target;
        
        if(!confirm('Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.')) return;
        
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = 'Cancelando...';

        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'Cancelado' })
                .eq('id', orderId); 

            if (error) throw error;

            alert('Pedido cancelado com sucesso.');
            loadUserOrders(); 

        } catch (error) {
            console.error('Erro ao cancelar:', error);
            alert('Não foi possível cancelar o pedido. Verifique se ele já entrou em produção.');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };

    const generateWhatsAppLink = (order, email, displayId) => {
        let itemsList = "";
        order.order_items.forEach(item => {
            const prodName = item.products ? item.products.name : 'Produto Indisponível';
            itemsList += `- ${item.quantity}x ${prodName} (R$ ${item.price_at_purchase.toFixed(2)})\n`;
        });

        let addressStr = "Endereço Salvo";
        if (order.delivery_address) {
            if (order.delivery_address.description) {
                addressStr = order.delivery_address.description;
            } else {
                const addr = order.delivery_address;
                addressStr = `${addr.street}, ${addr.city} - CEP: ${addr.cep}`;
                if(addr.complement) addressStr += ` (${addr.complement})`;
            }
        }

        const message = `Olá! Vim do site e gostaria de finalizar o pagamento do *Pedido ${displayId}*.\n\n` +
            `*Cliente:* ${email}\n\n` +
            `*Itens:*\n${itemsList}\n` +
            `*Total:* R$ ${order.total_amount.toFixed(2)}\n` +
            `*Endereço de Entrega:* ${addressStr}\n\n` +
            `Como posso prosseguir com o pagamento?`;

        return `https://wa.me/${COMPANY_PHONE}?text=${encodeURIComponent(message)}`;
    };

    const loadUserProfile = async () => {
        try {
            const { data, error } = await supabase.from('profiles').select('full_name, phone, cpf, age').eq('id', currentUser.id).single();
            if (error) throw error;
            if (data) {
                profileForm.full_name.value = data.full_name || '';
                profileForm.email.value = currentUser.email || '';
                profileForm.phone.value = data.phone || '';
                profileForm.cpf.value = data.cpf || '';
                profileForm.age.value = data.age || '';
            }
        } catch (error) {
            console.error('Erro ao buscar dados do perfil:', error.message);
        }
    };
    
    const loadUserAddresses = async () => {
        try {
            const { data, error } = await supabase.from('addresses').select('*').eq('user_id', currentUser.id).order('created_at');
            if (error) throw error;
            displayAddresses(data);
        } catch (error) {
            console.error('Erro ao buscar endereços:', error.message);
        }
    };

    const displayAddresses = (addresses) => {
        addressListContainer.innerHTML = '';
        if (addresses.length === 0) {
            addressListContainer.innerHTML = `<p class="text-gray-500">Nenhum endereço cadastrado ainda.</p>`;
            return;
        }
        addresses.forEach(addr => {
            const addressCard = `
                <div class="border p-4 rounded-lg flex justify-between items-center">
                    <div>
                        <p class="font-bold">${addr.street}, ${addr.complement || ''}</p>
                        <p class="text-gray-600">${addr.city} - DF, CEP: ${addr.cep}</p>
                    </div>
                    <div class="space-x-2">
                        <button class="edit-address-btn text-blue-600 hover:text-blue-800" data-id="${addr.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-address-btn text-red-600 hover:text-red-800" data-id="${addr.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            addressListContainer.insertAdjacentHTML('beforeend', addressCard);
        });
    };
    
    const handleCityChange = () => {
        if (citySelect.value === 'Outra') {
            cityOtherContainer.classList.remove('hidden');
            cityOtherInput.required = true;
        } else {
            cityOtherContainer.classList.add('hidden');
            cityOtherInput.required = false;
            cityOtherInput.value = '';
        }
    };
    
    const openAddressModal = (address = null) => {
        addressForm.reset();
        addressErrorMessage.textContent = '';
        cityOtherContainer.classList.add('hidden');
        cityOtherInput.required = false;

        if (address) {
            modalTitle.textContent = 'Editar Endereço';
            addressForm.id.value = address.id;
            addressForm.cep.value = address.cep;
            addressForm.street.value = address.street;
            addressForm.complement.value = address.complement;

            const standardOptions = Array.from(citySelect.options).map(opt => opt.value);
            if (standardOptions.includes(address.city)) {
                citySelect.value = address.city;
            } else {
                citySelect.value = 'Outra';
                cityOtherInput.value = address.city;
                cityOtherContainer.classList.remove('hidden');
                cityOtherInput.required = true;
            }
        } else {
            modalTitle.textContent = 'Adicionar Novo Endereço';
            addressForm.id.value = '';
        }
        addressModal.classList.remove('hidden');
    };
    
    const closeAddressModal = () => addressModal.classList.add('hidden');

    const setupEventListeners = () => {
        profileForm.addEventListener('submit', handleProfileUpdate);
        addAddressBtn.addEventListener('click', () => openAddressModal());
        closeAddressModalBtn.addEventListener('click', closeAddressModal);
        addressForm.addEventListener('submit', handleAddressFormSubmit);
        citySelect?.addEventListener('change', handleCityChange);
        addressListContainer.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-address-btn');
            const deleteBtn = e.target.closest('.delete-address-btn');
            if (editBtn) handleEditAddress(editBtn.dataset.id);
            if (deleteBtn) handleDeleteAddress(deleteBtn.dataset.id);
        });
        logoutButton.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    };

    const handleProfileUpdate = async (event) => {
        event.preventDefault();
        const submitButton = profileForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        updateMessage.textContent = '';
        const updatedProfile = { full_name: profileForm.full_name.value, phone: profileForm.phone.value };
        try {
            const { error } = await supabase.from('profiles').update(updatedProfile).eq('id', currentUser.id);
            if (error) throw error;
            updateMessage.textContent = 'Dados atualizados com sucesso!';
            updateMessage.className = 'mt-4 text-center font-semibold text-green-600';
        } catch (error) {
            updateMessage.textContent = 'Ocorreu um erro ao salvar.';
            updateMessage.className = 'mt-4 text-center font-semibold text-red-600';
        } finally {
            submitButton.disabled = false;
        }
    };
    
    const handleAddressFormSubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(addressForm);
        const addressId = formData.get('id');
        let finalCity = formData.get('city');
        if (finalCity === 'Outra') finalCity = formData.get('city_other');
        
        const addressDataToSave = {
            cep: formData.get('cep'),
            city: finalCity,
            street: formData.get('street'),
            complement: formData.get('complement'),
            user_id: currentUser.id
        };

        try {
            let error;
            if (addressId) {
                ({ error } = await supabase.from('addresses').update(addressDataToSave).eq('id', addressId));
            } else {
                ({ error } = await supabase.from('addresses').insert(addressDataToSave));
            }
            if (error) throw error;
            closeAddressModal();
            await loadUserAddresses();
        } catch (err) {
            addressErrorMessage.textContent = 'Erro ao salvar o endereço.';
            console.error(err);
        }
    };
    
    const handleEditAddress = async (id) => {
        try {
            const { data, error } = await supabase.from('addresses').select('*').eq('id', id).single();
            if (error) throw error;
            openAddressModal(data);
        } catch (err) {
            console.error('Erro ao buscar endereço para edição:', err);
        }
    };

    const handleDeleteAddress = async (id) => {
        if (confirm('Tem certeza que deseja apagar este endereço?')) {
            try {
                const { error } = await supabase.from('addresses').delete().eq('id', id);
                if (error) throw error;
                await loadUserAddresses();
            } catch (err) {
                console.error('Erro ao apagar endereço:', err);
            }
        }
    };

    const setupTabs = () => {
        Object.keys(tabs).forEach(key => {
            tabs[key].addEventListener('click', () => {
                Object.values(tabs).forEach(t => t.className = 'py-4 px-1 border-b-2 border-transparent text-gray-500 hover:border-gray-400 hover:text-gray-700');
                Object.values(contents).forEach(c => c.classList.add('hidden'));
                tabs[key].className = 'py-4 px-1 border-b-2 font-semibold border-brand-primary text-brand-primary';
                contents[key].classList.remove('hidden');
            });
        });
    };
    
    const checkUrlTab = () => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && tabs[tab]) {
            tabs[tab].click(); 
        }
    };

    initializePage();
});