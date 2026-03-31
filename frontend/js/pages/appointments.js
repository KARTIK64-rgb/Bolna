/* ═══════════════════════════════════════════════════════════
   MedCall AI — Appointments Page
   ═══════════════════════════════════════════════════════════ */

const AppointmentsPage = {
    appointments: [],
    patients: [],

    async render() {
        const today = new Date().toISOString().split('T')[0];
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
                                    <th>Call Status</th>
                                    <th>Action</th>
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

            return `
                <tr>
                    <td>
                        <div class="table-name">${apt.patient_name || 'Unknown'}</div>
                        <div class="table-secondary">${apt.patient_phone || ''}</div>
                    </td>
                    <td>${apt.doctor_name}</td>
                    <td>
                        <div class="table-name">${dateStr}</div>
                        <div class="table-secondary">${timeStr}</div>
                    </td>
                    <td><span class="badge badge-${apt.status}">${apt.status.replace('_', ' ')}</span></td>
                    <td><span class="badge badge-${apt.call_status}">${apt.call_status}</span></td>
                    <td>
                        <div class="flex gap-2 items-center">
                            ${callBtn}
                            <button class="btn btn-ghost btn-sm" onclick="AppointmentsPage.confirmDelete(${apt.id})" title="Delete" style="color:var(--danger-500)">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        lucide.createIcons({ nodes: [tbody] });
    },

    getCallButton(apt) {
        if (apt.call_status === 'calling') {
            return `<span class="badge badge-calling"><i data-lucide="loader" style="width:12px;height:12px;animation:spin 1s linear infinite"></i> Calling...</span>`;
        }

        if (apt.status === 'scheduled') {
            return `<button class="btn btn-success btn-call btn-sm" onclick="AppointmentsPage.handleCall(${apt.id}, 'confirm', '${(apt.patient_name || '').replace(/'/g, "\\'")}', '${apt.patient_phone || ''}')">
                <i data-lucide="phone-outgoing"></i> Confirm Call
            </button>`;
        }
        if (apt.status === 'no_show') {
            return `<button class="btn btn-warning btn-call btn-sm" onclick="AppointmentsPage.handleCall(${apt.id}, 'followup', '${(apt.patient_name || '').replace(/'/g, "\\'")}', '${apt.patient_phone || ''}')">
                <i data-lucide="phone-forwarded"></i> Follow-up
            </button>`;
        }
        if (apt.status === 'completed') {
            return `<button class="btn btn-primary btn-call btn-sm" onclick="AppointmentsPage.handleCall(${apt.id}, 'feedback', '${(apt.patient_name || '').replace(/'/g, "\\'")}', '${apt.patient_phone || ''}')">
                <i data-lucide="message-square"></i> Feedback
            </button>`;
        }
        return '';
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
                } catch (e) {
                    Toast.error(`Call failed: ${e.message}`);
                }
            }
        );
    },

    async showCreateModal() {
        // Load patients for dropdown
        try {
            this.patients = await Api.getPatients();
        } catch { this.patients = []; }

        const patientOptions = this.patients.map(p =>
            `<option value="${p.id}">${p.name} (${p.phone})</option>`
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
