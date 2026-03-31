/* ═══════════════════════════════════════════════════════════
   MedCall AI — Toast Notifications
   ═══════════════════════════════════════════════════════════ */

const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
    },

    show(message, type = 'info', duration = 4000) {
        if (!this.container) this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const iconMap = {
            success: 'check-circle',
            error: 'alert-circle',
            info: 'info',
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i data-lucide="${iconMap[type] || 'info'}"></i>
            </div>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i data-lucide="x"></i>
            </button>
        `;

        this.container.appendChild(toast);
        lucide.createIcons({ nodes: [toast] });

        // Auto dismiss
        setTimeout(() => {
            toast.classList.add('toast-exiting');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(message) {
        this.show(message, 'success');
    },

    error(message) {
        this.show(message, 'error', 6000);
    },

    info(message) {
        this.show(message, 'info');
    },
};
