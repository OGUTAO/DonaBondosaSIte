// js/navigation.js

document.addEventListener('DOMContentLoaded', () => {
    const activeClasses = ['text-brand-primary', 'font-bold'];
    const inactiveClasses = ['text-gray-600', 'hover:text-brand-primary'];
    
    const navLinks = document.querySelectorAll('header nav a[href], header #mobile-menu a[href]');
    const currentPath = window.location.pathname.split('/').pop();

    let isIndexPage = (currentPath === 'index.html' || currentPath === '');
    
    // --- LÓGICA 1: Destacar a Página Ativa (ex: produtos.html) ---
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        const linkPath = linkHref.split('/').pop().split('#')[0];

        // Limpa classes de todos os links que não são âncora ou carrinho
        if (!linkHref.startsWith('#') && !linkHref.includes('carrinho.html')) {
            link.classList.remove(...activeClasses);
            link.classList.add(...inactiveClasses);
        }

        // Se o link corresponde à página atual (e não é a index), aplica as classes ativas.
        if (linkPath === currentPath && !isIndexPage && linkPath !== '') {
            link.classList.remove(...inactiveClasses);
            link.classList.add(...activeClasses);
        }
    });

    // --- LÓGICA 2: Destaque de Rolagem (Scrollspy, SÓ NA INDEX.HTML) ---
    if (isIndexPage) {
        const sectionLinks = document.querySelectorAll('header nav a[href^="#"], header #mobile-menu a[href^="#"]');
        
        const sections = [...sectionLinks].map(link => {
            try {
                const id = link.getAttribute('href');
                return document.querySelector(id);
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        if (sections.length === 0) return;

        // --- CORREÇÃO DA ÁREA DE DETECÇÃO ---
        // rootMargin: '-30% 0px -70% 0px'
        // Isso cria uma "linha" 30% abaixo do topo da tela,
        // dando mais espaço para o footer ser detectado.
        const observerOptions = {
            root: null,
            rootMargin: '-75% 0px -25% 0px',
            threshold: 0
        };

        // --- CORREÇÃO DA LÓGICA DE DESTAQUE ---
        const observerCallback = (entries) => {
            entries.forEach(entry => {
                const id = entry.target.getAttribute('id');
                const activeLinkQuery = `header nav a[href="#${id}"], header #mobile-menu a[href="#${id}"]`;

                if (entry.isIntersecting) {
                    // 1. Remove "ativo" (marrom) e adiciona "inativo" (cinza) de TODOS
                    sectionLinks.forEach(link => {
                        link.classList.remove(...activeClasses);
                        link.classList.add(...inactiveClasses);
                    });
                    
                    // 2. Adiciona "ativo" (marrom) e remove "inativo" (cinza) do link ATUAL
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