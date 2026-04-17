// Requires: SweetAlert2 loaded, and Toast global from base-ui.js
// Jinja-dependent references: The URLs use dynamic request IDs,
// so this function builds them from the passed `id` parameter directly.

function processSingle(id, action) {
    const url = action === 'approve' ? `/admin/request/approve/${id}` : `/admin/request/reject/${id}`;
    fetch(url).then(res => res.json()).then(data => {
        if (data.success) {
            if (typeof Toast !== 'undefined') {
                Toast.fire({ icon: 'success', title: data.message });
            }
            setTimeout(() => location.reload(), 1500);
        }
    });
}

document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;

    const action = trigger.getAttribute('data-action');

    if (action === 'close-admin-platform-modal') {
        if (window.closeModal) window.closeModal('platformModal');
        return;
    }

    if (action === 'process-admin-request') {
        const id = trigger.getAttribute('data-request-id');
        const op = trigger.getAttribute('data-request-op');
        if (id && op) processSingle(id, op);
    }
});
