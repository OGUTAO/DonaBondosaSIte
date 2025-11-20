// js/navigation.js

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DO DARK MODE (NOVO) ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const icon = themeToggleBtn?.querySelector('i');

    // 1. Verifica se já tem preferência salva
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if(icon) icon.className = 'fas fa-sun'; // Muda ícone para sol
    }

    // 2. Função de clique
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Previne comportamento de link se houver
            body.classList.toggle('dark-mode');
            
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                if(icon) icon.className = 'fas fa-sun'; // Ícone de sol (para voltar ao claro)
            } else {
                localStorage.setItem('theme', 'light');
                if(icon) icon.className = 'fas fa-moon'; // Ícone de lua (para ir ao escuro)
            }
        });
    }
    // --- FIM DA LÓGICA DO DARK MODE ---


    // --- LÓGICA DO MENU HAMBÚRGUER ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // --- Lógica de navegação existente ---
    const activeClasses = ['text-brand-primary', 'font-bold'];
    const inactiveClasses = ['text-gray-600', 'hover:text-brand-primary'];
    
    const navLinks = document.querySelectorAll('header nav a[href], header #mobile-menu a[href]');
    const currentPath = window.location.pathname.split('/').pop();

    let isIndexPage = (currentPath === 'index.html' || currentPath === '');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        const linkPath = linkHref.split('/').pop().split('#')[0];

        if (!linkHref.startsWith('#') && !linkHref.includes('carrinho.html')) {
            link.classList.remove(...activeClasses);
            link.classList.add(...inactiveClasses);
        }

        if (linkPath === currentPath && !isIndexPage && linkPath !== '') {
            link.classList.remove(...inactiveClasses);
            link.classList.add(...activeClasses);
        }
    });

    if (isIndexPage) {
        const sectionLinks = document.querySelectorAll('header nav a[href^="#"], header #mobile-menu a[href^="#"]');
        const sections = [...sectionLinks].map(link => {
            try { return document.querySelector(link.getAttribute('href')); } catch (e) { return null; }
        }).filter(Boolean);

        if (sections.length === 0) return;

        const observerOptions = { root: null, rootMargin: '-75% 0px -25% 0px', threshold: 0 };
        const observerCallback = (entries) => {
            entries.forEach(entry => {
                const id = entry.target.getAttribute('id');
                const activeLinkQuery = `header nav a[href="#${id}"], header #mobile-menu a[href="#${id}"]`;
                if (entry.isIntersecting) {
                    sectionLinks.forEach(link => {
                        link.classList.remove(...activeClasses);
                        link.classList.add(...inactiveClasses);
                    });
                    const activeLink = document.querySelector(activeLinkQuery);
                    if (activeLink) {
                        activeLink.classList.remove(...inactiveClasses);
                        activeLink.classList.add(...activeClasses);
                    }
                }
            });
        };
        const observer = new IntersectionObserver(observerCallback, observerOptions);
        sections.forEach(section => observer.observe(section));
    }
});