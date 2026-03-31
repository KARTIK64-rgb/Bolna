/* ═══════════════════════════════════════════════════════════
   MedCall AI — Analytics Page
   ═══════════════════════════════════════════════════════════ */

let analyticsCharts = {};

const AnalyticsPage = {
    async render() {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="page-header">
                <div>
                    <h1>Analytics</h1>
                    <p class="page-subtitle">Insights into your clinic's performance and patient satisfaction</p>
                </div>
            </div>

            <!-- Summary Stats -->
            <div class="stats-grid" id="analytics-stats">
                <div class="stat-card blue">
                    <div class="stat-card-top">
                        <span class="stat-label">Total Calls Made</span>
                        <div class="stat-icon blue"><i data-lucide="phone"></i></div>
                    </div>
                    <div class="stat-value" id="a-total-calls">-</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-card-top">
                        <span class="stat-label">Total Appointments</span>
                        <div class="stat-icon green"><i data-lucide="calendar"></i></div>
                    </div>
                    <div class="stat-value" id="a-total-apts">-</div>
                </div>
                <div class="stat-card teal">
                    <div class="stat-card-top">
                        <span class="stat-label">Confirmation Rate</span>
                        <div class="stat-icon teal"><i data-lucide="trending-up"></i></div>
                    </div>
                    <div class="stat-value" id="a-confirm-rate">-<span class="stat-suffix">%</span></div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-card-top">
                        <span class="stat-label">Average Rating</span>
                        <div class="stat-icon yellow"><i data-lucide="star"></i></div>
                    </div>
                    <div class="stat-value" id="a-avg-rating">-<span class="stat-suffix">/5</span></div>
                </div>
            </div>

            <!-- Charts Row 1 -->
            <div class="two-col mb-6">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Weekly Confirmation Trend</span>
                    </div>
                    <div class="card-body">
                        <div class="chart-container">
                            <canvas id="analytics-trend-chart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Patient Satisfaction</span>
                    </div>
                    <div class="card-body">
                        <div class="chart-container">
                            <canvas id="analytics-satisfaction-chart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Row 2 -->
            <div class="two-col">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Appointment Status Breakdown</span>
                    </div>
                    <div class="card-body">
                        <div class="chart-container">
                            <canvas id="analytics-status-chart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Recent Patient Feedback</span>
                    </div>
                    <div class="card-body no-pad" id="feedback-list">
                        <p class="text-muted text-sm" style="padding:20px">Loading...</p>
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
            document.getElementById('a-total-calls').textContent = data.total_calls_made;
            document.getElementById('a-total-apts').textContent = data.total_appointments;
            document.getElementById('a-confirm-rate').innerHTML = `${data.confirmation_rate}<span class="stat-suffix">%</span>`;
            document.getElementById('a-avg-rating').innerHTML = `${data.average_rating}<span class="stat-suffix">/5</span>`;

            // Charts
            this.renderTrendChart(data.weekly_trend || []);
            this.renderSatisfactionChart(data.feedback_distribution || []);
            this.renderStatusChart(data);
            this.renderFeedbackList(data.recent_feedback || []);
        } catch (error) {
            Toast.error('Failed to load analytics');
            console.error(error);
        }
    },

    destroyChart(name) {
        if (analyticsCharts[name]) {
            analyticsCharts[name].destroy();
            analyticsCharts[name] = null;
        }
    },

    renderTrendChart(trend) {
        const ctx = document.getElementById('analytics-trend-chart');
        if (!ctx) return;
        this.destroyChart('trend');

        analyticsCharts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trend.map(d => d.date),
                datasets: [
                    {
                        label: 'Confirmed',
                        data: trend.map(d => d.confirmed),
                        borderColor: '#0D9488',
                        backgroundColor: 'rgba(13, 148, 136, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#0D9488',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                    },
                    {
                        label: 'No Show',
                        data: trend.map(d => d.no_show),
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#EF4444',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { family: 'Inter', size: 12 } },
                    },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Inter' } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                    x: { ticks: { font: { family: 'Inter' } }, grid: { display: false } },
                },
            },
        });
    },

    renderSatisfactionChart(distribution) {
        const ctx = document.getElementById('analytics-satisfaction-chart');
        if (!ctx) return;
        this.destroyChart('satisfaction');

        const colors = ['#EF4444', '#F97316', '#F59E0B', '#22C55E', '#0D9488'];

        analyticsCharts.satisfaction = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: distribution.map(d => `${d.rating} ★`),
                datasets: [{
                    label: 'Count',
                    data: distribution.map(d => d.count),
                    backgroundColor: colors.map(c => c + 'CC'),
                    borderColor: colors,
                    borderWidth: 1,
                    borderRadius: 8,
                    maxBarThickness: 50,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Inter' } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                    x: { ticks: { font: { family: 'Inter', size: 13 } }, grid: { display: false } },
                },
            },
        });
    },

    renderStatusChart(data) {
        const ctx = document.getElementById('analytics-status-chart');
        if (!ctx) return;
        this.destroyChart('status');

        analyticsCharts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Confirmed', 'Completed', 'Scheduled', 'No Show', 'Cancelled'],
                datasets: [{
                    data: [
                        data.confirmed_count,
                        data.completed_count,
                        data.scheduled_count,
                        data.no_show_count,
                        data.cancelled_count,
                    ],
                    backgroundColor: [
                        '#0D9488',
                        '#2563EB',
                        '#F59E0B',
                        '#EF4444',
                        '#94A3B8',
                    ],
                    borderWidth: 0,
                    hoverOffset: 8,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { family: 'Inter', size: 12 } },
                    },
                },
            },
        });
    },

    renderFeedbackList(feedback) {
        const container = document.getElementById('feedback-list');

        if (feedback.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:24px">
                    <i data-lucide="message-square"></i>
                    <p>No feedback yet</p>
                </div>
            `;
            lucide.createIcons({ nodes: [container] });
            return;
        }

        container.innerHTML = feedback.map(fb => {
            const initials = (fb.patient_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const date = fb.date ? new Date(fb.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
            const stars = this.renderStars(fb.rating);

            return `
                <div class="feedback-item">
                    <div class="feedback-avatar">${initials}</div>
                    <div class="feedback-content">
                        <div class="feedback-header">
                            <span class="feedback-name">${fb.patient_name}</span>
                            <span class="feedback-date">${date}</span>
                        </div>
                        <div class="stars mb-2">${stars}</div>
                        <p class="feedback-text">${fb.comments || 'No comments'}</p>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons({ nodes: [container] });
    },

    renderStars(rating) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                html += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
            } else {
                html += '<svg class="star-empty" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
            }
        }
        return html;
    },
};
