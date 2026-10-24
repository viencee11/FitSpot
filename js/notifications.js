document.addEventListener('DOMContentLoaded', function () {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || actions.querySelector('.notification-menu')) return;

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
            '<div class="notification-list" aria-live="polite">' +
                '<p class="notification-status">Loading notifications...</p>' +
            '</div>' +
        '</div>';

    const button = wrapper.querySelector('.notification-button');
    const dropdown = wrapper.querySelector('.notification-dropdown');
    const list = wrapper.querySelector('.notification-list');
    const dot = wrapper.querySelector('.notification-dot');

    function renderNotifications(notifications) {
        list.replaceChildren();
        dot.hidden = notifications.length === 0;

        if (!notifications.length) {
            const empty = document.createElement('p');
            empty.className = 'notification-status';
            empty.textContent = 'You have no new notifications.';
            list.appendChild(empty);
            return;
        }

        notifications.forEach(function (notification) {
            const item = document.createElement('article');
            item.className = 'notification-item notification-item--' + notification.type;

            const message = document.createElement('strong');
            message.textContent = notification.message || 'New notification';
            item.appendChild(message);

            if (notification.detail) {
                const detail = document.createElement('span');
                detail.textContent = notification.detail;
                item.appendChild(detail);
            }
            list.appendChild(item);
        });
    }

    async function loadNotifications() {
        try {
            const data = await apiCall('GET', 'notifications.php');
            renderNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        } catch (error) {
            if (error && error.status === 401) return;
            list.replaceChildren();
            const failure = document.createElement('p');
            failure.className = 'notification-status notification-status--error';
            failure.textContent = 'Unable to load notifications.';
            list.appendChild(failure);
            dot.hidden = true;
        }
    }

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
    dot.hidden = true;
    loadNotifications();
    window.setInterval(loadNotifications, 30000);
});
