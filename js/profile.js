import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const loadingSpinner = document.getElementById('loading-spinner');
    const pageContent = document.getElementById('page-content');
    const logoutButton = document.getElementById('logout-button');
    
    // --- NÚMERO DO WHATSAPP DA EMPRESA (MUDE AQUI) ---
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

    // Contêiner de Pedidos (NOVO)
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
        await loadUserOrders(); // Carrega os pedidos

        loadingSpinner.classList.add('hidden');
        pageContent.classList.remove('hidden');

        setupTabs();
        checkUrlTab(); // Verifica se deve abrir a aba de pedidos
        setupEventListeners();
    };
    
    // --- LÓGICA DE PEDIDOS E WHATSAPP ---
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

            // --- AVISO DE CANCELAMENTO ---
            let html = `
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-yellow-700">
                                <strong>Política de Cancelamento:</strong> Você só pode cancelar seu pedido enquanto ele estiver "Em Análise". 
                                Após o status mudar para "Em Produção", o cancelamento não será mais possível pelo site.
                            </p>
                        </div>
                    </div>
                </div>
                <h2 class="text-2xl font-bold text-brand-primary mb-6">Histórico de Pedidos</h2>
            `;

            if (orders.length === 0) {
                ordersContainer.innerHTML = html + '<p class="text-gray-600">Você ainda não fez nenhum pedido.</p>';
                return;
            }
            
            html += '<div class="space-y-6">';
            
            orders.forEach(order => {
                const date = new Date(order.created_at).toLocaleDateString('pt-BR');
                
                // Define cor e lógica do botão
                let statusColor = 'text-gray-600';
                let canCancel = false;

                if (order.status === 'Em Análise' || order.status === 'Pendente') {
                    statusColor = 'text-yellow-600';
                    canCancel = true; // Pode cancelar
                } else if (order.status === 'Em Produção') {
                    statusColor = 'text-blue-600';
                } else if (order.status === 'A Caminho') {
                    statusColor = 'text-purple-600';
                } else if (order.status === 'Entregue') {
                    statusColor = 'text-green-600';
                } else if (order.status === 'Cancelado') {
                    statusColor = 'text-red-600';
                }
                
                const waLink = generateWhatsAppLink(order, currentUser.email);

                let itemsHtml = '';
                order.order_items.forEach(item => {
                    // Verifica se produto existe (pode ter sido deletado)
                    const prodName = item.products ? item.products.name : 'Produto Indisponível';
                    itemsHtml += `<li class="text-sm text-gray-600">${item.quantity}x ${prodName}</li>`;
                });

                // Botão de Cancelar (Só aparece se canCancel for true)
                const cancelButton = canCancel 
                    ? `<button class="cancel-order-btn text-red-500 text-sm hover:underline ml-4" data-id="${order.id}">Cancelar Pedido</button>` 
                    : '';

                // Botão de Pagar (Não aparece se estiver cancelado)
                const payButton = order.status !== 'Cancelado'
                    ? `<a href="${waLink}" target="_blank" class="inline-block bg-green-600 text-white py-2 px-6 rounded-full font-bold hover:bg-green-700 transition duration-300">
                        <i class="fab fa-whatsapp mr-2"></i> Fazer Pagamento
                       </a>`
                    : '<span class="text-gray-400 font-bold italic">Pedido Cancelado</span>';

                html += `
                    <div class="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="font-bold text-lg text-brand-primary">Pedido #${order.id} ${cancelButton}</h3>
                                <p class="text-sm text-gray-500">${date}</p>
                            </div>
                            <div class="text-right">
                                <span class="font-bold ${statusColor} text-lg">${order.status}</span>
                                <p class="font-bold text-brand-accent mt-1">R$ ${order.total_amount.toFixed(2)}</p>
                            </div>
                        </div>
                        
                        <div class="mb-4 bg-gray-50 p-3 rounded">
                            <ul class="list-disc list-inside">${itemsHtml}</ul>
                        </div>

                        <div class="text-right">
                            ${payButton}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            ordersContainer.innerHTML = html;
            
            // Adiciona listener para os botões de cancelar
            document.querySelectorAll('.cancel-order-btn').forEach(btn => {
                btn.addEventListener('click', handleCancelOrder);
            });

        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
            ordersContainer.innerHTML = '<p class="text-red-500">Erro ao carregar pedidos.</p>';
        }
    };

    // --- FUNÇÃO PARA CANCELAR PEDIDO (CLIENTE) ---
    const handleCancelOrder = async (e) => {
        const orderId = e.target.dataset.id;
        
        if(!confirm('Tem certeza que deseja cancelar este pedido?')) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'Cancelado' })
                .eq('id', orderId)
                .eq('status', 'Em Análise'); // Segurança extra: só atualiza se ainda estiver em análise

            if (error) throw error;

            alert('Pedido cancelado com sucesso.');
            loadUserOrders(); // Recarrega a lista

        } catch (error) {
            console.error('Erro ao cancelar:', error);
            alert('Não foi possível cancelar o pedido. Talvez ele já tenha entrado em produção.');
            loadUserOrders();
        }
    };

    const generateWhatsAppLink = (order, email) => {
        // Formata a lista de produtos para a mensagem
        let itemsList = "";
        order.order_items.forEach(item => {
            itemsList += `- ${item.quantity}x ${item.products.name} (R$ ${item.price_at_purchase.toFixed(2)})\n`;
        });

        // Formata o endereço
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

        // Mensagem final
        const message = `Olá! Vim do site Com Carinho e gostaria de finalizar o pagamento do *Pedido #${order.id}*.\n\n` +
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
                // Reseta as classes
                Object.values(tabs).forEach(t => t.className = 'py-4 px-1 border-b-2 border-transparent text-gray-500 hover:border-gray-400 hover:text-gray-700');
                Object.values(contents).forEach(c => c.classList.add('hidden'));

                // Ativa a clicada
                tabs[key].className = 'py-4 px-1 border-b-2 font-semibold border-brand-primary text-brand-primary';
                contents[key].classList.remove('hidden');
            });
        });
    };
    
    // --- NOVA FUNÇÃO: Verifica a URL para abrir a aba certa ---
    const checkUrlTab = () => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && tabs[tab]) {
            tabs[tab].click(); // Simula o clique na aba
        }
    };

    initializePage();
});