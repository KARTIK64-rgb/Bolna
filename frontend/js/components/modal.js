/* ═══════════════════════════════════════════════════════════
   MedCall AI — Modal & Confirm Dialog
   ═══════════════════════════════════════════════════════════ */

// ─── Confirm Dialog ──────────────────────────────────────────

let confirmDialogCallback = null;

function showConfirmDialog(title, message, onConfirm) {
    const overlay = document.getElementById('confirm-dialog-overlay');
    document.getElementById('confirm-dialog-title').textContent = title;
    document.getElementById('confirm-dialog-message').textContent = message;
    overlay.classList.remove('hidden');

    const confirmBtn = document.getElementById('confirm-dialog-confirm');
    // Clone to remove old listeners
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.id = 'confirm-dialog-confirm';

    newBtn.addEventListener('click', async () => {
        newBtn.classList.add('btn-loading');
        newBtn.disabled = true;
        try {
            await onConfirm();
        } catch (e) {
            console.error(e);
        }
        closeConfirmDialog();
        newBtn.classList.remove('btn-loading');
        newBtn.disabled = false;
    });

    lucide.createIcons({ nodes: [overlay] });
}

function closeConfirmDialog() {
    const overlay = document.getElementById('confirm-dialog-overlay');
    overlay.classList.add('hidden');
}

// ─── Modal ───────────────────────────────────────────────────

function showModal(title, bodyHTML, width) {
    const overlay = document.getElementById('modal-overlay');
    const card = document.getElementById('modal-card');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;

    if (width) {
        card.style.maxWidth = width;
    } else {
        card.style.maxWidth = '520px';
    }

    overlay.classList.remove('hidden');
    lucide.createIcons({ nodes: [overlay] });
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
}

// Close modal/dialog on overlay click
document.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
    if (e.target.id === 'confirm-dialog-overlay') closeConfirmDialog();
});

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeConfirmDialog();
    }
});
