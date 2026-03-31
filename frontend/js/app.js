/* ═══════════════════════════════════════════════════════════
   MedCall AI — Application Bootstrap
   ═══════════════════════════════════════════════════════════ */

// ─── Sidebar Toggle (Mobile) ─────────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// ─── Init Application ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Lucide icons
    lucide.createIcons();

    // Initialize Toast system
    Toast.init();

    // Health check
    try {
        const health = await Api.healthCheck();
        console.log('✅ Backend connected:', health);
        if (health.clinic) {
            const clinicEl = document.getElementById('clinic-name');
            if (clinicEl) clinicEl.textContent = health.clinic;
        }
    } catch (error) {
        console.warn('⚠️ Backend not reachable:', error.message);
        Toast.error('Cannot connect to backend. Make sure the server is running on port 8000.');
    }

    // Start router
    Router.init();
});

// ─── Close sidebar on outside click (mobile) ────────────────
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger');
    if (
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !hamburger.contains(e.target)
    ) {
        sidebar.classList.remove('open');
    }
});
