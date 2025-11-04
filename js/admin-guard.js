const userRole = localStorage.getItem('userRole');

if (userRole !== 'admin' && userRole !== 'developer') {
    // Se o usuário não é admin nem developer (ou está deslogado)
    console.warn('Acesso não autorizado ao Painel de Controle. Redirecionando...');
    // Expulsa o usuário da página
    window.location.href = 'index.html';
}