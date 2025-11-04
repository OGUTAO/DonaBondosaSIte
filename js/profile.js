import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const loadingSpinner = document.getElementById('loading-spinner');
    const pageContent = document.getElementById('page-content');
    const logoutButton = document.getElementById('logout-button');
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
        
        loadingSpinner.classList.add('hidden');
        pageContent.classList.remove('hidden');

        setupTabs();
        setupEventListeners();
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
        if (finalCity === 'Outra') {
            finalCity = formData.get('city_other');
        }
        
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
            addressErrorMessage.textContent = 'Erro ao salvar o endereço. Verifique as permissões (RLS).';
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

    initializePage();
});