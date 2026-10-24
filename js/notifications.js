document.addEventListener('DOMContentLoaded', function () {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || actions.querySelector('.notification-menu')) return;

    const isAdmin = actions.querySelector('.admin-badge')
        && actions.querySelector('.admin-badge').textContent.trim().toLowerCase() === 'administrator';
    const wrapper = document.createElement('div');
    wrapper.className = 'notification-menu';
    wrapper.innerHTML =
        '<button type="button" class="notification-button" aria-label="Open notifications"' +
            ' aria-haspopup="true" aria-expanded="false" title="Notifications">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
                '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>' +
                '<path d="M10 21h4"/>' +
            '</svg>' +
            '<span class="notification-dot" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="notification-dropdown" hidden>' +
            '<strong>Notifications</strong>' +
            '<p>' + (isAdmin ? 'Membership and check-in activity will appear here.' : 'Booking and membership updates will appear here.') + '</p>' +
        '</div>';

    const button = wrapper.querySelector('.notification-button');
    const dropdown = wrapper.querySelector('.notification-dropdown');
    button.addEventListener('click', function (event) {
        event.stopPropagation();
        const isOpen = dropdown.hidden;
        dropdown.hidden = !isOpen;
        button.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', function (event) {
        if (!dropdown.hidden && !wrapper.contains(event.target)) {
            dropdown.hidden = true;
            button.setAttribute('aria-expanded', 'false');
        }
    });

    actions.insertBefore(wrapper, actions.firstChild);
});
