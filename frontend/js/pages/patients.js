/* ═══════════════════════════════════════════════════════════
   MedCall AI — Patients Page
   ═══════════════════════════════════════════════════════════ */

const PatientsPage = {
    patients: [],
    searchTimeout: null,

    async render() {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="page-header">
                <div>
                    <h1>Patients</h1>
                    <p class="page-subtitle">Manage your patient directory</p>
                </div>
                <button class="btn btn-primary" onclick="PatientsPage.showAddModal()">
                    <i data-lucide="user-plus"></i> Add Patient
                </button>
            </div>

            <!-- Search -->
            <div class="search-bar mb-6">
                <i data-lucide="search"></i>
                <input type="text" class="form-input" id="patient-search"
                    placeholder="Search by name or phone..." oninput="PatientsPage.handleSearch(this.value)">
            </div>

            <!-- Table -->
            <div class="card">
                <div class="card-body no-pad">
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Language</th>
                                    <th>Appointments</th>
                                    <th>Last Visit</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="patients-tbody">
                                <tr><td colspan="7" class="text-center text-muted" style="padding:24px">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        lucide.createIcons();
        await this.loadData();
    },

    async loadData(search = '') {
        try {
            this.patients = await Api.getPatients(search);
            this.renderTable();
        } catch (error) {
            Toast.error('Failed to load patients');
        }
    },

    handleSearch(value) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadData(value), 300);
    },

    renderTable() {
        const tbody = document.getElementById('patients-tbody');

        if (this.patients.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <i data-lucide="users"></i>
                            <p>No patients found</p>
                        </div>
                    </td>
                </tr>
            `;
            lucide.createIcons({ nodes: [tbody] });
            return;
        }

        const langMap = { en: 'English', hi: 'Hindi', hinglish: 'Hinglish' };

        tbody.innerHTML = this.patients.map(p => {
            const lastVisit = p.last_visit
                ? new Date(p.last_visit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—';
            const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            return `
                <tr>
                    <td>
                        <div class="flex items-center gap-3">
                            <div class="feedback-avatar">${initials}</div>
                            <span class="table-name">${p.name}</span>
                        </div>
                    </td>
                    <td>${p.phone}</td>
                    <td class="table-secondary">${p.email || '—'}</td>
                    <td><span class="badge badge-confirmed">${langMap[p.language] || p.language}</span></td>
                    <td class="text-center">${p.appointment_count || 0}</td>
                    <td class="table-secondary">${lastVisit}</td>
                    <td>
                        <div class="flex gap-2">
                            <button class="btn btn-ghost btn-sm" onclick="PatientsPage.showEditModal(${p.id})" title="Edit">
                                <i data-lucide="pencil"></i>
                            </button>
                            <button class="btn btn-ghost btn-sm" onclick="PatientsPage.confirmDelete(${p.id}, '${p.name.replace(/'/g, "\\'")}')" title="Delete" style="color:var(--danger-500)">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        lucide.createIcons({ nodes: [tbody] });
    },

    showAddModal() {
        const body = `
            <form id="patient-form" onsubmit="PatientsPage.handleAdd(event)">
                <div class="form-group">
                    <label class="form-label">Full Name *</label>
                    <input type="text" class="form-input" name="name" required placeholder="e.g. Rahul Sharma">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Phone Number *</label>
                        <input type="tel" class="form-input" name="phone" required placeholder="+919876543210">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" name="email" placeholder="patient@email.com">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Preferred Language</label>
                    <select class="form-select" name="language">
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="hinglish">Hinglish</option>
                    </select>
                </div>
                <div class="modal-footer" style="padding:0;border:0;margin-top:20px">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Patient</button>
                </div>
            </form>
        `;
        showModal('Add New Patient', body);
    },

    async handleAdd(e) {
        e.preventDefault();
        const form = e.target;
        const data = {
            name: form.name.value.trim(),
            phone: form.phone.value.trim(),
            email: form.email.value.trim() || null,
            language: form.language.value,
        };

        try {
            await Api.createPatient(data);
            Toast.success(`Patient ${data.name} added successfully`);
            closeModal();
            await this.loadData();
        } catch (error) {
            Toast.error(`Failed to add patient: ${error.message}`);
        }
    },

    async showEditModal(id) {
        const patient = this.patients.find(p => p.id === id);
        if (!patient) return;

        const body = `
            <form id="edit-patient-form" onsubmit="PatientsPage.handleEdit(event, ${id})">
                <div class="form-group">
                    <label class="form-label">Full Name *</label>
                    <input type="text" class="form-input" name="name" required value="${patient.name}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Phone Number *</label>
                        <input type="tel" class="form-input" name="phone" required value="${patient.phone}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" name="email" value="${patient.email || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Preferred Language</label>
                    <select class="form-select" name="language">
                        <option value="en" ${patient.language === 'en' ? 'selected' : ''}>English</option>
                        <option value="hi" ${patient.language === 'hi' ? 'selected' : ''}>Hindi</option>
                        <option value="hinglish" ${patient.language === 'hinglish' ? 'selected' : ''}>Hinglish</option>
                    </select>
                </div>
                <div class="modal-footer" style="padding:0;border:0;margin-top:20px">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        `;
        showModal('Edit Patient', body);
    },

    async handleEdit(e, id) {
        e.preventDefault();
        const form = e.target;
        const data = {
            name: form.name.value.trim(),
            phone: form.phone.value.trim(),
            email: form.email.value.trim() || null,
            language: form.language.value,
        };

        try {
            await Api.updatePatient(id, data);
            Toast.success('Patient updated successfully');
            closeModal();
            await this.loadData();
        } catch (error) {
            Toast.error(`Failed to update: ${error.message}`);
        }
    },

    confirmDelete(id, name) {
        showConfirmDialog(
            'Delete Patient',
            `Are you sure you want to delete ${name}? This action cannot be undone.`,
            async () => {
                try {
                    await Api.deletePatient(id);
                    Toast.success(`${name} deleted`);
                    await this.loadData();
                } catch (e) {
                    Toast.error(`Failed to delete: ${e.message}`);
                }
            }
        );
    },
};
