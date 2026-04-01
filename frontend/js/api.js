/* ═══════════════════════════════════════════════════════════
   MedCall AI — API Client
   ═══════════════════════════════════════════════════════════ */

// Configure API base URL:
// - For local dev: auto-detects from current origin (localhost:8000)
// - For Vercel+Render: set window.MEDCALL_API_URL before this script loads
const API_BASE = window.MEDCALL_API_URL || window.location.origin + '/api';

const Api = {
    // ─── Generic Fetch Wrapper ───────────────────────────────
    async request(url, options = {}) {
        try {
            const response = await fetch(API_BASE + url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.detail || `Request failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error [${url}]:`, error);
            throw error;
        }
    },

    // ─── Patients ────────────────────────────────────────────
    getPatients(search = '') {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        return this.request(`/patients${params}`);
    },

    createPatient(data) {
        return this.request('/patients', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    getPatient(id) {
        return this.request(`/patients/${id}`);
    },

    updatePatient(id, data) {
        return this.request(`/patients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deletePatient(id) {
        return this.request(`/patients/${id}`, {
            method: 'DELETE',
        });
    },

    // ─── Appointments ────────────────────────────────────────
    getAppointments(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.date) params.set('date', filters.date);
        if (filters.upcoming) params.set('upcoming', 'true');
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/appointments${query}`);
    },

    createAppointment(data) {
        return this.request('/appointments', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateAppointment(id, data) {
        return this.request(`/appointments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    deleteAppointment(id) {
        return this.request(`/appointments/${id}`, {
            method: 'DELETE',
        });
    },

    // ─── Calls ───────────────────────────────────────────────
    triggerCall(appointmentId, agentType) {
        return this.request('/trigger-call', {
            method: 'POST',
            body: JSON.stringify({
                appointment_id: appointmentId,
                agent_type: agentType,
            }),
        });
    },

    pollCallStatus(appointmentId) {
        return this.request(`/poll-call-status/${appointmentId}`);
    },

    getCallLogs() {
        return this.request('/call-logs');
    },

    // ─── Analytics ───────────────────────────────────────────
    getAnalytics() {
        return this.request('/analytics');
    },

    // ─── Health ──────────────────────────────────────────────
    healthCheck() {
        return this.request('/health');
    },
};
