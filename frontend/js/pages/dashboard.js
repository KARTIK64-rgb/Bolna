/* ═══════════════════════════════════════════════════════════
   MedCall AI — Dashboard Page
   ═══════════════════════════════════════════════════════════ */

let dashboardChart = null;

const DashboardPage = {
    async render() {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p class="page-subtitle">Welcome back! Here's your clinic overview for today.</p>
                </div>
                <span class="text-sm text-muted">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            <!-- Stats -->
            <div class="stats-grid" id="dash-stats">
                <div class="stat-card blue">
                    <div class="stat-card-top">
                        <span class="stat-label">Today's Appointments</span>
                        <div class="stat-icon blue"><i data-lucide="calendar"></i></div>
                    </div>
                    <div class="stat-value" id="stat-today">-</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-card-top">
                        <span class="stat-label">Confirmation Rate</span>
                        <div class="stat-icon green"><i data-lucide="check-circle"></i></div>
                    </div>
                    <div class="stat-value" id="stat-confirm">-<span class="stat-suffix">%</span></div>
                </div>
                <div class="stat-card orange">
                    <div class="stat-card-top">
                        <span class="stat-label">No-Show Rate</span>
                        <div class="stat-icon orange"><i data-lucide="alert-triangle"></i></div>
                    </div>
                    <div class="stat-value" id="stat-noshow">-<span class="stat-suffix">%</span></div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-card-top">
                        <span class="stat-label">Avg Patient Rating</span>
                        <div class="stat-icon yellow"><i data-lucide="star"></i></div>
                    </div>
                    <div class="stat-value" id="stat-rating">-<span class="stat-suffix">/5</span></div>
                </div>
            </div>

            <!-- Two Column -->
            <div class="two-col">
                <!-- Today's Appointments -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Today's Appointments</span>
                        <span class="text-sm text-muted" id="today-count">0 appointments</span>
                    </div>
                    <div class="card-body no-pad">
                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Patient</th>
                                        <th>Doctor</th>
                                        <th>Time</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="today-appointments">
                                    <tr><td colspan="5" class="text-center text-muted" style="padding:24px">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Recent Activity</span>
                        <span class="text-sm text-muted" id="calls-count">0 calls</span>
                    </div>
                    <div class="card-body">
                        <ul class="activity-list" id="recent-activity">
                            <li class="activity-item">
                                <span class="text-muted text-sm">Loading...</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Chart -->
            <div class="card">
                <div class="card-header">
                    <span class="card-title">Weekly Confirmation Trend</span>
                </div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas id="weekly-chart"></canvas>
                    </div>
                </div>
            </div>
        `;

        lucide.createIcons();
        await this.loadData();
    },

    async loadData() {
        try {
            const data = await Api.getAnalytics();

            // Stats
            const todayCount = data.today_appointments ? data.today_appointments.length : 0;
            document.getElementById('stat-today').textContent = todayCount;
            document.getElementById('stat-confirm').innerHTML = `${data.confirmation_rate}<span class="stat-suffix">%</span>`;
            document.getElementById('stat-noshow').innerHTML = `${data.no_show_rate}<span class="stat-suffix">%</span>`;
            document.getElementById('stat-rating').innerHTML = `${data.average_rating}<span class="stat-suffix">/5</span>`;

            // Today's Appointments
            this.renderTodayAppointments(data.today_appointments || []);
            document.getElementById('today-count').textContent = `${todayCount} appointment${todayCount !== 1 ? 's' : ''}`;

            // Recent Activity (call logs)
            const logs = await Api.getCallLogs();
            this.renderActivity(logs.slice(0, 8));
            document.getElementById('calls-count').textContent = `${data.total_calls_made} total calls`;

            // Chart
            this.renderChart(data.weekly_trend || []);
        } catch (error) {
            Toast.error('Failed to load dashboard data');
            console.error(error);
        }
    },

    renderTodayAppointments(appointments) {
        const tbody = document.getElementById('today-appointments');
        if (appointments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state" style="padding:24px">
                            <i data-lucide="calendar-off"></i>
                            <p>No appointments today</p>
                        </div>
                    </td>
                </tr>
            `;
            lucide.createIcons({ nodes: [tbody] });
            return;
        }

        tbody.innerHTML = appointments.map(apt => {
            const time = new Date(apt.date_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            const btn = this.getCallButton(apt);
            return `
                <tr>
                    <td>
                        <div class="table-name">${apt.patient_name}</div>
                        <div class="table-secondary">${apt.patient_phone}</div>
                    </td>
                    <td>${apt.doctor_name}</td>
                    <td><strong>${time}</strong></td>
                    <td><span class="badge badge-${apt.status}">${apt.status.replace('_', ' ')}</span></td>
                    <td>${btn}</td>
                </tr>
            `;
        }).join('');

        lucide.createIcons({ nodes: [tbody] });
    },

    getCallButton(apt) {
        if (apt.call_status === 'calling') {
            return `<span class="badge badge-calling"><i data-lucide="loader" style="width:12px;height:12px"></i> Calling...</span>`;
        }

        if (apt.status === 'scheduled') {
            return `<button class="btn btn-success btn-call btn-sm" onclick="DashboardPage.handleCall(${apt.id}, 'confirm', '${apt.patient_name}', '${apt.patient_phone}')">
                <i data-lucide="phone-outgoing"></i> Confirm
            </button>`;
        }
        if (apt.status === 'no_show') {
            return `<button class="btn btn-warning btn-call btn-sm" onclick="DashboardPage.handleCall(${apt.id}, 'followup', '${apt.patient_name}', '${apt.patient_phone}')">
                <i data-lucide="phone-forwarded"></i> Follow-up
            </button>`;
        }
        if (apt.status === 'completed') {
            return `<button class="btn btn-primary btn-call btn-sm" onclick="DashboardPage.handleCall(${apt.id}, 'feedback', '${apt.patient_name}', '${apt.patient_phone}')">
                <i data-lucide="message-square"></i> Feedback
            </button>`;
        }
        if (apt.status === 'confirmed') {
            return `<span class="badge badge-confirmed"><i data-lucide="check" style="width:12px;height:12px"></i> Ready</span>`;
        }
        return `<span class="text-muted text-sm">—</span>`;
    },

    handleCall(aptId, agentType, patientName, phone) {
        const typeLabels = { confirm: 'Confirmation', followup: 'Follow-up', feedback: 'Feedback' };
        showConfirmDialog(
            `Trigger ${typeLabels[agentType]} Call`,
            `Call ${patientName} at ${phone}?`,
            async () => {
                try {
                    await Api.triggerCall(aptId, agentType);
                    Toast.success(`${typeLabels[agentType]} call initiated to ${patientName}!`);
                    await this.loadData();
                } catch (e) {
                    Toast.error(`Failed to trigger call: ${e.message}`);
                }
            }
        );
    },

    renderActivity(logs) {
        const list = document.getElementById('recent-activity');
        if (logs.length === 0) {
            list.innerHTML = `<li class="activity-item"><span class="text-muted text-sm">No recent activity</span></li>`;
            return;
        }

        const dotColors = { confirm: 'green', followup: 'orange', feedback: 'blue' };
        const typeLabels = { confirm: 'Confirmation call', followup: 'Follow-up call', feedback: 'Feedback call' };

        list.innerHTML = logs.map(log => {
            const timeAgo = this.timeAgo(log.created_at);
            const color = dotColors[log.agent_type] || 'blue';
            return `
                <li class="activity-item">
                    <span class="activity-dot ${color}"></span>
                    <div>
                        <div class="activity-text">
                            <strong>${typeLabels[log.agent_type] || log.agent_type}</strong> to ${log.patient_name || 'Patient'}
                            — <span class="badge badge-${log.status}" style="font-size:0.7rem">${log.status}</span>
                        </div>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </li>
            `;
        }).join('');

        lucide.createIcons({ nodes: [list] });
    },

    timeAgo(dateStr) {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;
        const diffDays = Math.floor(diffHrs / 24);
        return `${diffDays}d ago`;
    },

    renderChart(weeklyTrend) {
        const ctx = document.getElementById('weekly-chart');
        if (!ctx) return;

        if (dashboardChart) dashboardChart.destroy();

        const labels = weeklyTrend.map(d => d.date);
        const confirmed = weeklyTrend.map(d => d.confirmed);
        const noShow = weeklyTrend.map(d => d.no_show);
        const cancelled = weeklyTrend.map(d => d.cancelled);

        dashboardChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Confirmed',
                        data: confirmed,
                        backgroundColor: 'rgba(13, 148, 136, 0.8)',
                        borderColor: '#0D9488',
                        borderWidth: 1,
                        borderRadius: 6,
                    },
                    {
                        label: 'No Show',
                        data: noShow,
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderColor: '#EF4444',
                        borderWidth: 1,
                        borderRadius: 6,
                    },
                    {
                        label: 'Cancelled',
                        data: cancelled,
                        backgroundColor: 'rgba(148, 163, 184, 0.7)',
                        borderColor: '#94A3B8',
                        borderWidth: 1,
                        borderRadius: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: { family: 'Inter', size: 12 },
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { family: 'Inter', size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.04)' },
                    },
                    x: {
                        ticks: { font: { family: 'Inter', size: 11 } },
                        grid: { display: false },
                    },
                },
            },
        });
    },
};
