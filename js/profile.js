// Importa o cliente Supabase do nosso arquivo central
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES GERAIS ---
    const loadingSpinner = document.getElementById('loading-spinner');
    const pageContent = document.getElementById('page-content');
    const logoutButton = document.getElementById('logout-button');
    let currentUser = null;

    // --- SELETORES DE DADOS PESSOAIS ---
    const profileForm = document.getElementById('profile-form');
    const updateMessage = document.getElementById('update-message');

    // --- SELETORES DE ENDEREÇO ---
    const addressListContainer = document.getElementById('address-list-container');
    const addAddressBtn = document.getElementById('add-address-btn');
    const addressModal = document.getElementById('address-modal');
    const closeAddressModalBtn = document.getElementById('close-address-modal');
    const addressForm = document.getElementById('address-form');
    const modalTitle = document.getElementById('modal-title');
    const addressErrorMessage = document.getElementById('address-error-message');

    // --- SELETORES DE ABAS ---
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

    // --- FUNÇÕES PRINCIPAIS ---

    const initializePage = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;
        
        await loadUserProfile();
        await loadUserAddresses();
        
        loadingSpinner.classList.add('hidden');
        pageContent.classList.remove('hidden');

        setupTabs();
        setupEventListeners();
    };

    const loadUserProfile = async () => {
        try {
            // CORRIGIDO: Buscando todos os campos do perfil
            const { data, error } = await supabase.from('profiles').select('full_name, phone, cpf, age').eq('id', currentUser.id).single();
            if (error) throw error;
            if (data) {
                profileForm.full_name.value = data.full_name || '';
                profileForm.email.value = currentUser.email || '';
                profileForm.phone.value = data.phone || '';
                profileForm.cpf.value = data.cpf || ''; // Campo restaurado
                profileForm.age.value = data.age || ''; // Campo restaurado
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
        addressListContainer.innerHTML = ''; // Limpa a lista
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
    
    // --- LÓGICA DO MODAL DE ENDEREÇO ---

    const openAddressModal = (address = null) => {
        addressForm.reset();
        addressErrorMessage.textContent = '';
        if (address) {
            modalTitle.textContent = 'Editar Endereço';
            addressForm.id.value = address.id;
            addressForm.cep.value = address.cep;
            addressForm.city.value = address.city;
            addressForm.street.value = address.street;
            addressForm.complement.value = address.complement;
        } else {
            modalTitle.textContent = 'Adicionar Novo Endereço';
            addressForm.id.value = '';
        }
        addressModal.classList.remove('hidden');
    };
    
    const closeAddressModal = () => addressModal.classList.add('hidden');

    // --- MANIPULADORES DE EVENTOS (EVENT HANDLERS) ---

    const setupEventListeners = () => {
        profileForm.addEventListener('submit', handleProfileUpdate);
        addAddressBtn.addEventListener('click', () => openAddressModal());
        closeAddressModalBtn.addEventListener('click', closeAddressModal);
        addressForm.addEventListener('submit', handleAddressFormSubmit);
        
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
        const addressData = Object.fromEntries(formData.entries());
        const addressId = addressData.id;

        try {
            let error;
            if (addressId) { // Editando
                ({ error } = await supabase.from('addresses').update({ cep: addressData.cep, city: addressData.city, street: addressData.street, complement: addressData.complement, user_id: currentUser.id }).eq('id', addressId));
            } else { // Criando
                ({ error } = await supabase.from('addresses').insert({ cep: addressData.cep, city: addressData.city, street: addressData.street, complement: addressData.complement, user_id: currentUser.id }));
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
                // Desativa todas as abas e esconde todos os conteúdos
                Object.values(tabs).forEach(t => t.className = 'py-4 px-1 border-b-2 border-transparent text-gray-500 hover:border-gray-400 hover:text-gray-700');
                Object.values(contents).forEach(c => c.classList.add('hidden'));

                // Ativa a aba clicada e mostra o conteúdo correspondente
                tabs[key].className = 'py-4 px-1 border-b-2 font-semibold border-brand-primary text-brand-primary';
                contents[key].classList.remove('hidden');
            });
        });
    };

    // --- INICIALIZAÇÃO ---
    initializePage();
});