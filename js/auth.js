import { supabase } from './supabaseClient.js';

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const errorMessageDiv = document.getElementById('error-message');
const successMessageDiv = document.getElementById('success-message');

if (signupForm) {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const toggleConfirmPasswordBtn = document.getElementById('toggle-confirm-password');

    const togglePasswordVisibility = (input, icon) => {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    };

    togglePasswordBtn.addEventListener('click', () => {
        togglePasswordVisibility(passwordInput, togglePasswordBtn.querySelector('i'));
    });
    toggleConfirmPasswordBtn.addEventListener('click', () => {
        togglePasswordVisibility(confirmPasswordInput, toggleConfirmPasswordBtn.querySelector('i'));
    });

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = signupForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Cadastrando...';

        if (errorMessageDiv) errorMessageDiv.textContent = '';
        if (successMessageDiv) successMessageDiv.textContent = '';

        const formData = new FormData(signupForm);

        try {
            const password = formData.get('password');
            const confirmPassword = formData.get('confirm-password');
            if (password !== confirmPassword) {
                throw new Error('As senhas não coincidem.');
            }

            let extraData = {
                full_name: formData.get('full_name'),
                cpf: formData.get('cpf'),
                phone: formData.get('phone'),
                age: formData.get('age')
            };

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.get('email'),
                password: formData.get('password'),
                options: {
                    data: extraData
                }
            });

            if (authError) {
                throw authError;
            }

            if (!authData.user || !authData.user.id) {
                throw new Error("Database error: CPF ou E-mail já em uso.");
            }

            console.log('Cadastro completo!', authData);
            signupForm.reset();
            if (successMessageDiv) successMessageDiv.textContent = 'Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.';

        } catch (error) {
            console.error('Erro no cadastro:', error.message);
            let userMessage = 'Não foi possível realizar o cadastro.';

            if (error.message.toLowerCase().includes('user already registered')) {
                userMessage = 'Este E-mail já está cadastrado.';
            } else if (error.message.toLowerCase().includes('cpf ou e-mail já em uso')) {
                userMessage = 'Este CPF ou E-mail já está cadastrado.';
            } else if (error.message.toLowerCase().includes('senhas não coincidem')) {
                userMessage = 'As senhas não coincidem. Tente novamente.';
            }
            
            if (errorMessageDiv) errorMessageDiv.textContent = userMessage;

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}

if (loginForm) {
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
                recoveryMessageDiv.textContent = 'Link de recuperação enviado! Verifique sua caixa deG entrada e spam.';
                recoveryMessageDiv.classList.add('text-green-600');
            }
            submitButton.disabled = false;
            submitButton.textContent = 'Enviar Link de Recuperação';
        });
    }
}