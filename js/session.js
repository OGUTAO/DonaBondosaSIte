import { supabase } from './supabaseClient.js';
import { updateCartIcon } from './cart.js';

const loginButton = document.getElementById('login-button');
const profileButton = document.getElementById('profile-button');
const logoutButton = document.getElementById('logout-button');
const adminButton = document.getElementById('admin-button');

const mobileLoginLink = document.getElementById('mobile-login-link');
const mobileProfileLink = document.getElementById('mobile-profile-link');
const mobileLogoutLink = document.getElementById('mobile-logout-link');
const mobileAdminLink = document.getElementById('mobile-admin-link');

const updateUserUI = (user, profile) => {
    if (user && profile) {
        loginButton?.classList.add('hidden');
        profileButton?.classList.remove('hidden');
        logoutButton?.classList.remove('hidden');
        
        mobileLoginLink?.classList.add('hidden');
        mobileProfileLink?.classList.remove('hidden');
        mobileLogoutLink?.classList.remove('hidden');

        if (profile.role === 'admin' || profile.role === 'developer') {
            adminButton?.classList.remove('hidden');
            mobileAdminLink?.classList.remove('hidden');
        } else {
            adminButton?.classList.add('hidden');
            mobileAdminLink?.classList.add('hidden');
        }
    } else {
        loginButton?.classList.remove('hidden');
        profileButton?.classList.add('hidden');
        logoutButton?.classList.add('hidden');
        adminButton?.classList.add('hidden');
        
        mobileLoginLink?.classList.remove('hidden');
        mobileProfileLink?.classList.add('hidden');
        mobileLogoutLink?.classList.add('hidden');
        mobileAdminLink?.classList.add('hidden');
    }
};

const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Erro ao fazer logout:', error);
    }
    localStorage.removeItem('userRole'); 
    window.location.href = 'index.html';
};

const checkUserSession = async (user) => {
    if (user) {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Erro ao buscar perfil do usuário:', error.message);
            localStorage.removeItem('userRole');
            updateUserUI(null, null);
        } else if (profile) {
            localStorage.setItem('userRole', profile.role);
            updateUserUI(user, profile);
        } else {
            console.warn('Sessão encontrada, mas perfil não existe na tabela "profiles".');
            localStorage.removeItem('userRole');
            updateUserUI(null, null);
        }
    } else {
        localStorage.removeItem('userRole');
        updateUserUI(null, null);
    }
};

document.addEventListener('DOMContentLoaded', () => {

    updateCartIcon();

    supabase.auth.getSession().then(({ data: { session } }) => {
        checkUserSession(session?.user);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
        checkUserSession(session?.user);
    });

    logoutButton?.addEventListener('click', handleLogout);
    mobileLogoutLink?.addEventListener('click', (e) => {
        e.preventDefault(); 
        handleLogout();
    });
});