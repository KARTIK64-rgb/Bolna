/* ═══════════════════════════════════════════════════════════
   MedCall AI — Appointments Page
   ═══════════════════════════════════════════════════════════ */

const AppointmentsPage = {
    appointments: [],
    patients: [],
    pollingTimer: null,

    async render() {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="page-header">
                <div>
                    <h1>Appointments</h1>
                    <p class="page-subtitle">Schedule and manage patient appointments</p>
                </div>
                <button class="btn btn-primary" onclick="AppointmentsPage.showCreateModal()">
                    <i data-lucide="calendar-plus"></i> New Appointment
                </button>
            </div>

            <!-- Filters -->
            <div class="filter-bar mb-6">
                <input type="date" class="form-input" id="apt-filter-date" value="" onchange="AppointmentsPage.applyFilters()">
                <select class="form-select" id="apt-filter-status" onchange="AppointmentsPage.applyFilters()">
                    <option value="">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="no_show">No Show</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rescheduled">Rescheduled</option>
                </select>
                <button class="btn btn-secondary btn-sm" onclick="AppointmentsPage.clearFilters()">
                    <i data-lucide="x"></i> Clear
                </button>
            </div>

            <!-- Appointments Table -->
            <div class="card">
                <div class="card-body no-pad">
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Doctor</th>
                                    <th>Date & Time</th>
                                    <th>Status</th>
                                    <th>AI Call</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="apt-tbody">
                                <tr><td colspan="6" class="text-center text-muted" style="padding:24px">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        lucide.createIcons();
        this.stopPolling();
        await this.loadData();
    },

    async loadData(filters = {}) {
        try {
            this.appointments = await Api.getAppointments(filters);
            this.renderTable();
        } catch (error) {
            Toast.error('Failed to load appointments');
        }
    },

    applyFilters() {
        const date = document.getElementById('apt-filter-date').value;
        const status = document.getElementById('apt-filter-status').value;
        this.loadData({ date: date || undefined, status: status || undefined });
    },

    clearFilters() {
        document.getElementById('apt-filter-date').value = '';
        document.getElementById('apt-filter-status').value = '';
        this.loadData();
    },

    renderTable() {
        const tbody = document.getElementById('apt-tbody');
        if (!tbody) return;

        if (this.appointments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <i data-lucide="calendar-off"></i>
                            <p>No appointments found</p>
                        </div>
                    </td>
                </tr>
            `;
            lucide.createIcons({ nodes: [tbody] });
            return;
        }

        tbody.innerHTML = this.appointments.map(apt => {
            const dt = new Date(apt.date_time);
            const dateStr = dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
            const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            const callBtn = this.getCallButton(apt);
            const safeId = apt.id;

            return `
                <tr>
                    <td>
                        <div class="table-name">${this.escapeHtml(apt.patient_name || 'Unknown')}</div>
                        <div class="table-secondary">${this.escapeHtml(apt.patient_phone || '')}</div>
                    </td>
                    <td>${this.escapeHtml(apt.doctor_name)}</td>
                    <td>
                        <div class="table-name">${dateStr}</div>
                        <div class="table-secondary">${timeStr}</div>
                    </td>
                    <td>
                        <select class="form-select badge-select badge-${apt.status}" onchange="AppointmentsPage.changeStatus(${safeId}, this.value)" style="padding:4px 8px;font-size:0.75rem;min-width:110px">
                            <option value="scheduled" ${apt.status==='scheduled'?'selected':''}>Scheduled</option>
                            <option value="confirmed" ${apt.status==='confirmed'?'selected':''}>Confirmed</option>
                            <option value="completed" ${apt.status==='completed'?'selected':''}>Completed</option>
                            <option value="no_show" ${apt.status==='no_show'?'selected':''}>No Show</option>
                            <option value="cancelled" ${apt.status==='cancelled'?'selected':''}>Cancelled</option>
                            <option value="rescheduled" ${apt.status==='rescheduled'?'selected':''}>Rescheduled</option>
                        </select>
                    </td>
                    <td>${callBtn}</td>
                    <td>
                        <button class="btn btn-ghost btn-sm" data-delete-id="${safeId}" title="Delete" style="color:var(--danger-500)">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach delete handlers via event delegation (prevents call button conflict)
        tbody.querySelectorAll('[data-delete-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const id = parseInt(btn.getAttribute('data-delete-id'));
                AppointmentsPage.confirmDelete(id);
            });
        });

        lucide.createIcons({ nodes: [tbody] });
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    getCallButton(apt) {
        if (apt.call_status === 'calling') {
            return `<span class="badge badge-calling" style="display:inline-flex;align-items:center;gap:4px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                Calling...
            </span>`;
        }

        const id = apt.id;

        if (apt.status === 'scheduled') {
            return `<button class="btn btn-success btn-call btn-sm" data-call-id="${id}" data-call-type="confirm">
                <i data-lucide="phone-outgoing"></i> Confirm
            </button>`;
        }
        if (apt.status === 'no_show') {
            return `<button class="btn btn-warning btn-call btn-sm" data-call-id="${id}" data-call-type="followup">
                <i data-lucide="phone-forwarded"></i> Follow-up
            </button>`;
        }
        if (apt.status === 'completed') {
            return `<button class="btn btn-primary btn-call btn-sm" data-call-id="${id}" data-call-type="feedback">
                <i data-lucide="message-square"></i> Feedback
            </button>`;
        }
        if (apt.status === 'confirmed') {
            return `<span class="badge badge-confirmed" style="display:inline-flex;align-items:center;gap:4px">
                <i data-lucide="check" style="width:12px;height:12px"></i> Ready
            </span>`;
        }
        return `<span class="text-muted text-sm">—</span>`;
    },

    // Attach call button handlers after render
    attachCallHandlers() {
        const tbody = document.getElementById('apt-tbody');
        if (!tbody) return;

        tbody.querySelectorAll('[data-call-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const aptId = parseInt(btn.getAttribute('data-call-id'));
                const agentType = btn.getAttribute('data-call-type');
                const apt = AppointmentsPage.appointments.find(a => a.id === aptId);
                if (apt) {
                    AppointmentsPage.handleCall(aptId, agentType, apt.patient_name, apt.patient_phone);
                }
            });
        });
    },

    handleCall(aptId, agentType, name, phone) {
        const labels = { confirm: 'Confirmation', followup: 'Follow-up', feedback: 'Feedback' };
        showConfirmDialog(
            `Trigger ${labels[agentType]} Call`,
            `Call ${name} at ${phone}?`,
            async () => {
                try {
                    await Api.triggerCall(aptId, agentType);
                    Toast.success(`${labels[agentType]} call initiated to ${name}!`);
                    await this.loadData();
                    // Start polling for status changes
                    this.startPolling();
                } catch (e) {
                    Toast.error(`Call failed: ${e.message}`);
                }
            }
        );
    },

    async changeStatus(aptId, newStatus) {
        try {
            await Api.updateAppointment(aptId, { status: newStatus });
            Toast.success(`Status changed to ${newStatus.replace('_', ' ')}`);
            await this.loadData();
        } catch (e) {
            Toast.error(`Failed to update: ${e.message}`);
            await this.loadData(); // Revert dropdown
        }
    },

    // Poll for status updates every 5 seconds after a call is triggered
    startPolling() {
        this.stopPolling();
        let attempts = 0;
        this.pollingTimer = setInterval(async () => {
            attempts++;
            try {
                const oldStatuses = this.appointments.map(a => `${a.id}:${a.status}:${a.call_status}`);
                await this.loadData();
                const newStatuses = this.appointments.map(a => `${a.id}:${a.status}:${a.call_status}`);

                // Check if any status changed
                const changed = oldStatuses.some((s, i) => s !== newStatuses[i]);
                if (changed) {
                    Toast.info('📞 Call status updated!');
                    this.stopPolling();
                }
            } catch {}

            // Stop after 2 minutes (24 tries × 5 seconds)
            if (attempts >= 24) {
                this.stopPolling();
            }
        }, 5000);
    },

    stopPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
    },

    async showCreateModal() {
        // Load patients for dropdown
        try {
            this.patients = await Api.getPatients();
        } catch { this.patients = []; }

        const patientOptions = this.patients.map(p =>
            `<option value="${p.id}">${this.escapeHtml(p.name)} (${p.phone})</option>`
        ).join('');

        const timeSlots = [];
        for (let h = 9; h < 17; h++) {
            for (let m of [0, 30]) {
                const dt = new Date(2000, 0, 1, h, m);
                const label = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                timeSlots.push(`<option value="${val}">${label}</option>`);
            }
        }

        const today = new Date().toISOString().split('T')[0];

        const body = `
            <form id="apt-form" onsubmit="AppointmentsPage.handleCreate(event)">
                <div class="form-group">
                    <label class="form-label">Patient *</label>
                    <select class="form-select" name="patient_id" required>
                        <option value="">Select a patient</option>
                        ${patientOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Doctor *</label>
                    <select class="form-select" name="doctor_name" required>
                        <option value="">Select a doctor</option>
                        <option value="Dr. Sharma">Dr. Sharma</option>
                        <option value="Dr. Patel">Dr. Patel</option>
                        <option value="Dr. Gupta">Dr. Gupta</option>
                        <option value="Dr. Reddy">Dr. Reddy</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Date *</label>
                        <input type="date" class="form-input" name="date" required min="${today}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Time *</label>
                        <select class="form-select" name="time" required>
                            <option value="">Select time</option>
                            ${timeSlots.join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea class="form-textarea" name="notes" placeholder="Any special notes..."></textarea>
                </div>
                <div class="modal-footer" style="padding:0;border:0;margin-top:20px">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Appointment</button>
                </div>
            </form>
        `;
        showModal('New Appointment', body);
    },

    async handleCreate(e) {
        e.preventDefault();
        const form = e.target;
        const dateTime = `${form.date.value}T${form.time.value}:00`;

        const data = {
            patient_id: parseInt(form.patient_id.value),
            doctor_name: form.doctor_name.value,
            date_time: dateTime,
            notes: form.notes.value.trim() || null,
        };

        try {
            await Api.createAppointment(data);
            Toast.success('Appointment created successfully');
            closeModal();
            await this.loadData();
        } catch (error) {
            Toast.error(`Failed to create appointment: ${error.message}`);
        }
    },

    confirmDelete(id) {
        showConfirmDialog(
            'Delete Appointment',
            'Are you sure you want to delete this appointment?',
            async () => {
                try {
                    await Api.deleteAppointment(id);
                    Toast.success('Appointment deleted');
                    await this.loadData();
                } catch (e) {
                    Toast.error(`Failed to delete: ${e.message}`);
                }
            }
        );
    },
};

// Override renderTable to also attach call handlers
const _origRenderTable = AppointmentsPage.renderTable.bind(AppointmentsPage);
AppointmentsPage.renderTable = function() {
    _origRenderTable();
    AppointmentsPage.attachCallHandlers();
};
