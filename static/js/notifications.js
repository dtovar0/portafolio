/**
 * Global Notifications System (SweetAlert2)
 */

var Toast = window.Toast || Swal.mixin({
    toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    background: 'var(--bg-card)', color: 'var(--text-primary)',
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

function showNotify(type, title, message = '', customClass = '') {
    Toast.fire({
        icon: type,
        title: title,
        text: message,
        customClass: {
            popup: customClass
        }
    });
}
