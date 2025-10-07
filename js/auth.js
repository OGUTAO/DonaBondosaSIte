// Importa o cliente JÁ CRIADO do nosso arquivo de configuração
import { supabase } from './supabaseClient.js';

// --- SELETORES DE FORMULÁRIO ---
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const errorMessageDiv = document.getElementById('error-message');
const successMessageDiv = document.getElementById('success-message');

// --- LÓGICA DE CADASTRO (SIGN UP) ---
if (signupForm) {
    const toggleAddress = document.getElementById('toggle-address');
    const addressSection = document.getElementById('address-section');
    const addressFields = addressSection.querySelectorAll('input, select');

    toggleAddress.addEventListener('change', () => {
        const isChecked = toggleAddress.checked;
        addressSection.classList.toggle('hidden', !isChecked);
        addressFields.forEach(field => field.required = isChecked);
    });

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = signupForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Cadastrando...';

        if (errorMessageDiv) errorMessageDiv.textContent = '';
        if (successMessageDiv) successMessageDiv.textContent = '';

        try {
            const formData = new FormData(signupForm);
            
            // Monta o objeto de dados extras para o Supabase
            const extraData = {
                full_name: formData.get('full_name'),
                cpf: formData.get('cpf'),
                phone: formData.get('phone'),
                age: formData.get('age'), // CAMPO IDADE ADICIONADO
                address: null
            };
            
            if (toggleAddress.checked) {
                extraData.address = {
                    cep: formData.get('cep'),
                    city: formData.get('city'),
                    street: formData.get('street'),
                    complement: formData.get('complement')
                };
            }

            const { data, error } = await supabase.auth.signUp({
                email: formData.get('email'),
                password: formData.get('password'),
                options: {
                    data: extraData // Envia todos os dados extras
                }
            });

            if (error) throw error;
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                throw new Error("User already registered");
            }

            console.log('Cadastro bem-sucedido!', data);
            signupForm.reset();
            addressSection.classList.add('hidden');
            if (successMessageDiv) successMessageDiv.textContent = 'Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.';

        } catch (error) {
            console.error('Erro no cadastro:', error.message);
            let userMessage = 'Não foi possível realizar o cadastro. Verifique os campos e tente novamente.';
            if (error && error.message.toLowerCase().includes('user already registered')) {
                userMessage = 'Este email já está cadastrado. Por favor, tente fazer login.';
            } else if (error) {
                userMessage = `Erro: ${error.message}`;
            }
            if (errorMessageDiv) errorMessageDiv.textContent = userMessage;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}


// --- LÓGICA DE LOGIN ---
if (loginForm) {
    // A lógica de login permanece a mesma
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Entrando...';

        if (errorMessageDiv) errorMessageDiv.textContent = '';

        try {
            const formData = new FormData(event.target);
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.get('email'),
                password: formData.get('password'),
            });
            if (error) throw error;
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Erro no login:', error.message);
            let userMessage = 'Email ou senha inválidos.';
            if (error && error.message.toLowerCase().includes('email not confirmed')) {
                userMessage = 'Seu email ainda não foi verificado. Por favor, confira sua caixa de entrada.';
            }
            if (errorMessageDiv) errorMessageDiv.textContent = userMessage;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
    
    // Lógica de recuperação de senha
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const recoveryModal = document.getElementById('recovery-modal');
    const closeModalButton = document.getElementById('close-recovery-modal');
    const recoveryForm = document.getElementById('recovery-form');
    const recoveryMessageDiv = document.getElementById('recovery-message');

    if(forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            recoveryModal.classList.remove('hidden');
        });
    }
    if(closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            recoveryModal.classList.add('hidden');
            recoveryMessageDiv.textContent = '';
        });
    }
    if(recoveryForm) {
        recoveryForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = recoveryForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';
            recoveryMessageDiv.textContent = '';
            recoveryMessageDiv.className = 'mt-4 text-center font-semibold';
            const email = recoveryForm.email.value;
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                 redirectTo: `${window.location.origin}/reset-password.html`
            });
            if (error) {
                recoveryMessageDiv.textContent = 'Erro ao enviar o email. Verifique o endereço digitado.';
                recoveryMessageDiv.classList.add('text-red-600');
            } else {
                recoveryMessageDiv.textContent = 'Link de recuperação enviado! Verifique sua caixa de entrada e spam.';
                recoveryMessageDiv.classList.add('text-green-600');
            }
            submitButton.disabled = false;
            submitButton.textContent = 'Enviar Link de Recuperação';
        });
    }
}