/* ═══════════════════════════════════════════════════════════
   MedCall AI — Hash-based SPA Router
   ═══════════════════════════════════════════════════════════ */

const Router = {
    routes: {
        'dashboard': DashboardPage,
        'patients': PatientsPage,
        'appointments': AppointmentsPage,
        'calls': CallLogsPage,
        'analytics': AnalyticsPage,
    },

    currentPage: null,

    init() {
        window.addEventListener('hashchange', () => this.navigate());
        this.navigate();
    },

    getHash() {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        return hash;
    },

    async navigate() {
        const hash = this.getHash();
        const page = this.routes[hash];

        if (!page) {
            window.location.hash = '#dashboard';
            return;
        }

        // Update active nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === hash);
        });

        // Show loader
        const loader = document.getElementById('page-loader');
        const content = document.getElementById('page-content');
        loader.classList.remove('hidden');
        content.innerHTML = '';

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');

        // Render page
        try {
            await page.render();
        } catch (error) {
            console.error('Page render error:', error);
            content.innerHTML = `
                <div class="empty-state" style="margin-top:60px">
                    <i data-lucide="alert-circle"></i>
                    <p>Failed to load page. Check your connection.</p>
                    <button class="btn btn-primary mt-4" onclick="Router.navigate()">
                        <i data-lucide="refresh-cw"></i> Retry
                    </button>
                </div>
            `;
            lucide.createIcons();
        }

        // Hide loader
        loader.classList.add('hidden');
        this.currentPage = hash;
    },
};
