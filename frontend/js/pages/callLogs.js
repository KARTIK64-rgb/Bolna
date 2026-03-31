/* ═══════════════════════════════════════════════════════════
   MedCall AI — Call Logs Page
   ═══════════════════════════════════════════════════════════ */

const CallLogsPage = {
    logs: [],
    expandedRow: null,

    async render() {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="page-header">
                <div>
                    <h1>Call Logs</h1>
                    <p class="page-subtitle">View all AI voice call history and transcripts</p>
                </div>
            </div>

            <div class="card">
                <div class="card-body no-pad">
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Date / Time</th>
                                    <th>Patient</th>
                                    <th>Agent Type</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                    <th>Outcome</th>
                                </tr>
                            </thead>
                            <tbody id="logs-tbody">
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

    async loadData() {
        try {
            this.logs = await Api.getCallLogs();
            this.renderTable();
        } catch (error) {
            Toast.error('Failed to load call logs');
        }
    },

    formatDuration(seconds) {
        if (!seconds) return '—';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    },

    getOutcome(log) {
        if (!log.extracted_data) return '—';
        try {
            const data = typeof log.extracted_data === 'string'
                ? JSON.parse(log.extracted_data)
                : log.extracted_data;
            return data.confirmation_status || data.feedback_rating || '—';
        } catch {
            return '—';
        }
    },

    renderTable() {
        const tbody = document.getElementById('logs-tbody');

        if (this.logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <i data-lucide="phone-off"></i>
                            <p>No call logs yet</p>
                        </div>
                    </td>
                </tr>
            `;
            lucide.createIcons({ nodes: [tbody] });
            return;
        }

        let html = '';
        this.logs.forEach((log, idx) => {
            const dt = new Date(log.created_at);
            const dateStr = dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            const outcome = this.getOutcome(log);
            const isExpanded = this.expandedRow === idx;

            html += `
                <tr class="expandable-row" onclick="CallLogsPage.toggleRow(${idx})" style="cursor:pointer">
                    <td style="width:30px">
                        <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" style="width:16px;height:16px;color:var(--gray-400)"></i>
                    </td>
                    <td>
                        <div class="table-name">${dateStr}</div>
                        <div class="table-secondary">${timeStr}</div>
                    </td>
                    <td class="table-name">${log.patient_name || 'Unknown'}</td>
                    <td><span class="badge badge-${log.agent_type}">${log.agent_type}</span></td>
                    <td>${this.formatDuration(log.duration)}</td>
                    <td><span class="badge badge-${log.status}">${log.status}</span></td>
                    <td><span class="badge badge-${outcome}">${outcome}</span></td>
                </tr>
            `;

            if (isExpanded) {
                html += `<tr><td colspan="7" style="padding:0">${this.renderExpanded(log)}</td></tr>`;
            }
        });

        tbody.innerHTML = html;
        lucide.createIcons({ nodes: [tbody] });
    },

    toggleRow(idx) {
        this.expandedRow = this.expandedRow === idx ? null : idx;
        this.renderTable();
    },

    renderExpanded(log) {
        let extractedHtml = '';
        if (log.extracted_data) {
            try {
                const data = typeof log.extracted_data === 'string'
                    ? JSON.parse(log.extracted_data)
                    : log.extracted_data;
                extractedHtml = `
                    <h4>Extracted Data</h4>
                    <div class="kv-grid">
                        ${Object.entries(data).map(([k, v]) => `
                            <span class="kv-key">${k.replace(/_/g, ' ')}</span>
                            <span class="kv-value">${v}</span>
                        `).join('')}
                    </div>
                `;
            } catch {}
        }

        return `
            <div class="expanded-content">
                ${log.summary ? `
                    <h4>AI Summary</h4>
                    <p style="font-size:0.85rem;color:var(--gray-600);line-height:1.6;margin-bottom:12px">${log.summary}</p>
                ` : ''}

                ${log.transcript ? `
                    <h4>Transcript</h4>
                    <div class="transcript-box">${log.transcript}</div>
                ` : '<p class="text-sm text-muted">No transcript available</p>'}

                ${extractedHtml}

                ${log.recording_url ? `
                    <h4>Recording</h4>
                    <a href="${log.recording_url}" target="_blank" class="btn btn-secondary btn-sm mt-2">
                        <i data-lucide="play-circle"></i> Listen to Recording
                    </a>
                ` : ''}
            </div>
        `;
    },
};
