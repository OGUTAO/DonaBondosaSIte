// Importa o cliente Supabase do nosso arquivo central
import { supabase } from './supabaseClient.js';

// Executa quando o conteúdo da página estiver carregado
document.addEventListener('DOMContentLoaded', () => {

    // Seleciona os botões do header (desktop)
    const loginButton = document.getElementById('login-button');
    const profileButton = document.getElementById('profile-button');
    const logoutButton = document.getElementById('logout-button');

    // Seleciona os links do menu mobile
    const mobileLoginLink = document.getElementById('mobile-login-link');
    const mobileProfileLink = document.getElementById('mobile-profile-link');
    const mobileLogoutLink = document.getElementById('mobile-logout-link');

    // Função para atualizar a interface do usuário com base no estado de login
    const updateUserUI = (user) => {
        if (user) {
            // Se o usuário ESTÁ LOGADO
            loginButton?.classList.add('hidden');
            profileButton?.classList.remove('hidden');
            logoutButton?.classList.remove('hidden');

            mobileLoginLink?.classList.add('hidden');
            mobileProfileLink?.classList.remove('hidden');
            mobileLogoutLink?.classList.remove('hidden');
        } else {
            // Se o usuário NÃO ESTÁ LOGADO
            loginButton?.classList.remove('hidden');
            profileButton?.classList.add('hidden');
            logoutButton?.classList.add('hidden');

            mobileLoginLink?.classList.remove('hidden');
            mobileProfileLink?.classList.add('hidden');
            mobileLogoutLink?.classList.add('hidden');
        }
    };

    // O Supabase verifica o estado da autenticação e nos avisa sempre que mudar
    supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user;
        updateUserUI(user);
    });

    // Função para fazer logout
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Erro ao fazer logout:', error);
        } else {
            // Redireciona para a página inicial após o logout bem-sucedido
            window.location.href = 'index.html';
        }
    };

    // Adiciona o evento de clique aos botões de logout
    logoutButton?.addEventListener('click', handleLogout);
    mobileLogoutLink?.addEventListener('click', (e) => {
        e.preventDefault(); // Previne o comportamento padrão do link
        handleLogout();
    });
});
