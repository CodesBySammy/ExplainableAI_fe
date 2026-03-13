document.addEventListener('DOMContentLoaded', () => {
    // --- Auth State Management ---
    const urlParams = new URLSearchParams(window.location.search);
    
    // If returning from successful OAuth callback
    if (urlParams.get('logged_in') === '1') {
        localStorage.setItem('xai_logged_in', 'true');
        window.location.href = '/dashboard.html';
        return;
    }

    // If already logged in
    if (localStorage.getItem('xai_logged_in') === 'true' && window.location.pathname === '/') {
        window.location.href = '/dashboard.html';
        return;
    }

    // If OAuth failed
    if (urlParams.get('error')) {
        alert('Authentication failed. Please check your GitHub config.');
        window.history.replaceState({}, document.title, window.location.pathname);
        localStorage.removeItem('xai_logged_in');
    }
});
