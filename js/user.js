document.addEventListener('DOMContentLoaded', async function () {
    /* ===== helpers (apiCall / esc / peso / SERVER_HINT come from js/api.js) ===== */

    function formatDate(value) {
        if (!value) return '—';
        return new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
        });
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value);
    }

    function initials(fullName) {
        return String(fullName || '')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(function (word) { return word[0].toUpperCase(); })
            .join('') || '?';
    }

    function setupMobileMenu() {
        const layout = document.querySelector('.admin-layout');
        const sidebar = document.querySelector('.sidebar');
        const topbar = document.querySelector('.topbar');
        if (!layout || !sidebar || !topbar) return;

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'menu-toggle';
        toggle.setAttribute('aria-label', 'Open navigation menu');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<span></span><span></span><span></span>';
        topbar.insertBefore(toggle, topbar.firstChild);

        function closeMenu() {
            layout.classList.remove('is-menu-open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'Open navigation menu');
        }

        toggle.addEventListener('click', function (event) {
            event.stopPropagation();
            const isOpen = layout.classList.toggle('is-menu-open');
            toggle.setAttribute('aria-expanded', String(isOpen));
            toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
        });

        sidebar.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('click', function (event) {
            if (layout.classList.contains('is-menu-open')
                && !sidebar.contains(event.target)
                && !toggle.contains(event.target)) {
                closeMenu();
            }
        });
    }

    setupMobileMenu();

    /* ===== auth guard ===== */

    let currentUser = null;

    try {
        currentUser = await apiCall('GET', 'me.php');
    } catch (error) {
        if (error.message === 'Please log in first.') {
            window.location.replace('../../index.html');
            return;
        }
        toast.error(friendlyMessage(error, 'Unable to load this page.', SERVER_HINT));
        return;
    }

    if (currentUser.role !== 'member') {
        window.location.replace('../../index.html');
        return;
    }

    const avatar = document.getElementById('user-avatar');
    if (avatar) avatar.textContent = initials(currentUser.full_name);

    /* ===== dropdown + logout ===== */

    const dropdown = document.getElementById('user-dropdown');
    const logoutButton = document.getElementById('user-logout');

    if (avatar && dropdown) {
        avatar.addEventListener('click', function (event) {
            event.stopPropagation();
            const isOpen = dropdown.hidden;
            dropdown.hidden = !isOpen;
            avatar.setAttribute('aria-expanded', String(isOpen));
        });

        document.addEventListener('click', function (event) {
            if (!dropdown.hidden && !dropdown.contains(event.target)) {
                dropdown.hidden = true;
                avatar.setAttribute('aria-expanded', 'false');
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async function () {
            const confirmed = await confirmDialog(
                'Confirm Logout',
                'Are you sure you want to logout?',
                'Logout'
            );
            if (!confirmed) return;
            try { await apiCall('POST', 'logout.php'); } catch (error) {}
            window.location.replace('../../index.html');
        });
    }

    /* ===== data loaders ===== */

    let profile = null;
    let myBookings = [];
    let classSchedules = [];

    function renderClassSchedules() {
        const grid = document.getElementById('class-grid');
        const search = document.getElementById('class-search');
        const filter = document.getElementById('class-filter');
        if (!grid) return;

        const query = search ? search.value.trim().toLowerCase() : '';
        const selectedFilter = filter ? filter.value : 'all';
        const schedules = classSchedules.filter(function (slot) {
            const text = (slot.name + ' ' + (slot.description || '')).toLowerCase();
            const booked = slot.my_status !== null;
            const full = slot.remaining <= 0;
            const matchesSearch = !query || text.indexOf(query) !== -1;
            const matchesFilter = selectedFilter === 'all'
                || (selectedFilter === 'available' && !booked && !full)
                || (selectedFilter === 'booked' && booked)
                || (selectedFilter === 'full' && full);
            return matchesSearch && matchesFilter;
        });

        if (!schedules.length) {
            grid.innerHTML = '<p class="empty-state">No classes match your search or filter.</p>';
            return;
        }

        grid.replaceChildren();
        schedules.forEach(function (slot) {
            const card = document.createElement('article');
            card.className = 'class-card';
            card.dataset.className = slot.name;
            card.dataset.description = slot.description || '';
            card.innerHTML = '<div class="class-card-head"><h3>' + esc(slot.name) +
                '</h3><span class="badge ' + slot.badge_color + '">' + esc(slot.badge_label) +
                '</span></div><p class="class-desc">' + esc(slot.description || '') +
                '</p><p class="class-schedule">' + esc(slot.schedule) +
                '</p><div class="slot-cell"><span class="slot-text">' + slot.booked + ' of ' +
                slot.capacity + ' slots booked</span><div class="slot-bar' +
                (slot.remaining <= 0 ? ' is-full' : '') + '"><span style="width: ' +
                (slot.capacity > 0 ? Math.round(slot.booked / slot.capacity * 100) : 0) +
                '%;"></span></div></div>';

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn-book';
            if (slot.my_status !== null) {
                button.disabled = true;
                button.textContent = 'Booked';
            } else if (slot.remaining <= 0) {
                button.disabled = true;
                button.textContent = 'Class Full';
            } else {
                button.dataset.book = slot.schedule_id;
                button.dataset.name = slot.name;
                button.dataset.remaining = slot.remaining;
                button.textContent = 'Book Class';
            }
            card.appendChild(button);
            grid.appendChild(card);
        });
    }

    async function loadProfile() {
        profile = await apiCall('GET', 'profile.php');
        return profile;
    }

    function applyPlan() {
        const planName = profile && profile.membership ? profile.membership.plan : null;

        document.querySelectorAll('.plan-card').forEach(function (card) {
            const isCurrent = Boolean(planName)
                && card.dataset.plan === planName
                && profile.membership.status === 'active';
            const tag = card.querySelector('.plan-tag');
            const choose = card.querySelector('.plan-choose');

            card.classList.toggle('is-current', isCurrent);
            if (tag) tag.hidden = !isCurrent;
            if (choose) {
                const active = Boolean(profile && profile.membership
                    && profile.membership.status === 'active');
                choose.hidden = false;
                choose.disabled = true;
                choose.textContent = isCurrent
                    ? 'Current Plan'
                    : (active ? 'Unavailable until renewal' : 'Admin assignment only');
                choose.title = active
                    ? 'This plan is unavailable until your current membership expires'
                    : 'Only an administrator can assign a membership plan';
            }
        });

        setText('stat-plan', planName || 'No plan');
        setText('profile-plan', planName || 'No plan');
    }

    async function loadOverview() {
        const tbody = document.getElementById('tbody-overview');
        if (!tbody) return;

        try {
            const [bookingData] = await Promise.all([
                apiCall('GET', 'bookings.php'),
                loadProfile()
            ]);
            myBookings = bookingData.bookings;

            const upcoming = myBookings.filter(function (booking) { return booking.is_upcoming; });

            const welcome = document.getElementById('welcome-heading');
            if (welcome) {
                const first = String(currentUser.full_name || '').split(/\s+/)[0];
                welcome.textContent = 'Welcome back, ' + first + '!';
            }

            if (!upcoming.length) {
                tbody.innerHTML = '<tr><td colspan="3">No upcoming bookings. Open Fitness Classes to reserve a slot.</td></tr>';
            } else {
                tbody.innerHTML = upcoming.slice(0, 5).map(function (booking) {
                    return '<tr>' +
                        '<td>' + esc(booking.class_name) + '</td>' +
                        '<td>' + esc(booking.schedule) + '</td>' +
                        '<td><span class="badge ' + booking.status_color + '">' + esc(booking.status_label) + '</span></td>' +
                        '</tr>';
                }).join('');
            }

            setText('stat-upcoming', upcoming.length);
            setText('stat-confirmed', upcoming.filter(function (booking) {
                return booking.status === 'confirmed';
            }).length);
            setText('stat-days', profile.membership ? profile.membership.days_left : '—');
            applyPlan();
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="3">' + esc(friendlyMessage(error, 'Unable to load bookings.', SERVER_HINT)) + '</td></tr>';
        }
    }

    async function loadClassesPage() {
        const grid = document.getElementById('class-grid');
        if (!grid) return;

        try {
            const data = await apiCall('GET', 'classes.php?upcoming=1');
            classSchedules = Array.isArray(data.schedules) ? data.schedules : [];
            if (!classSchedules.length) {
                grid.innerHTML = '<p class="empty-state">No upcoming classes are scheduled right now.</p>';
                return;
            }
            renderClassSchedules();
            const search = document.getElementById('class-search');
            const filter = document.getElementById('class-filter');
            if (search) search.addEventListener('input', renderClassSchedules);
            if (filter) filter.addEventListener('change', renderClassSchedules);
        } catch (error) {
            toast.error(friendlyMessage(error, 'Unable to load classes.', SERVER_HINT));
        }
    }

    async function loadBookingsPage() {
        const tbody = document.getElementById('tbody-bookings');
        if (!tbody) return;

        const params = new URLSearchParams(window.location.search);
        const bookedNote = params.get('booked');
        if (bookedNote) {
            toast.success('Booking confirmed successfully.');
            history.replaceState({}, '', window.location.pathname);
        }

        try {
            const data = await apiCall('GET', 'bookings.php');
            myBookings = data.bookings;

            const tableCard = document.getElementById('bookings-table');
            const emptyState = document.getElementById('bookings-empty');
            const hasBookings = myBookings.length > 0;
            if (tableCard) tableCard.hidden = !hasBookings;
            if (emptyState) emptyState.hidden = hasBookings;

            tbody.innerHTML = myBookings.map(function (booking) {
                const action = booking.status === 'cancelled'
                    ? ''
                    : '<button type="button" class="btn-sm btn-delete" data-cancel-booking="' + booking.id + '">Cancel</button>';

                return '' +
                    '<tr>' +
                        '<td>' + esc(booking.class_name) + '</td>' +
                        '<td>' + esc(booking.schedule) + '</td>' +
                        '<td class="status-cell"><span class="badge ' + booking.status_color + '">' + esc(booking.status_label) + '</span></td>' +
                        '<td>' + action + '</td>' +
                    '</tr>';
            }).join('');
        } catch (error) {
            toast.error(friendlyMessage(error, 'Unable to load bookings.', SERVER_HINT));
        }
    }

    async function loadPlansPage() {
        const grid = document.getElementById('plans-grid');
        if (!grid) return;

        try {
            const [plansData] = await Promise.all([
                apiCall('GET', 'plans.php'),
                loadProfile()
            ]);

            grid.innerHTML = plansData.plans.map(function (plan) {
                const bullets = String(plan.inclusions).split(';')
                    .map(function (line) { return line.trim(); })
                    .filter(Boolean)
                    .map(function (line) { return '<li>' + esc(line) + '</li>'; })
                    .join('');

                return '' +
                    '<article class="plan-card" data-plan="' + esc(plan.name) + '">' +
                        '<h3>' + esc(plan.name) + '</h3>' +
                        '<p class="plan-price">' + peso(plan.price) + '<span> / month</span></p>' +
                        '<ul>' + bullets + '</ul>' +
                        '<div class="plan-footer">' +
                            '<span class="badge badge-orange plan-tag" hidden>Current Plan</span>' +
                            '<button type="button" class="plan-choose" data-choose data-plan-id="' + plan.id + '">Choose Plan</button>' +
                        '</div>' +
                    '</article>';
            }).join('');

            applyPlan();
        } catch (error) {
            toast.error(friendlyMessage(error, 'Unable to load plans.', SERVER_HINT));
        }
    }

    async function loadProfilePage() {
        const profileForm = document.getElementById('profile-form');
        if (!profileForm) return;

        try {
            if (!profile) await loadProfile();

            const nameInput = document.getElementById('profile-name');
            const emailInput = document.getElementById('profile-email');
            const phoneInput = document.getElementById('profile-phone');
            const addressInput = document.getElementById('profile-address');

            if (nameInput) nameInput.value = profile.full_name || '';
            if (emailInput) emailInput.value = profile.email || '';
            if (phoneInput) phoneInput.value = profile.phone || '';
            if (addressInput) addressInput.value = profile.address || '';

            const membership = profile.membership;
            const statusWrap = document.getElementById('profile-status');
            if (statusWrap) {
                if (!membership) {
                    statusWrap.innerHTML = '<span class="badge badge-gray">No Membership</span>';
                } else if (membership.status === 'active') {
                    statusWrap.innerHTML = '<span class="badge badge-green">Active</span>';
                } else {
                    statusWrap.innerHTML = '<span class="badge badge-gray">Expired</span>';
                }
            }

            setText('profile-since', membership ? formatDate(membership.start_date) : formatDate(String(profile.created_at).slice(0, 10)));
            setText('profile-expires', membership ? formatDate(membership.end_date) : '—');
            applyPlan();
        } catch (error) {
            const message = document.getElementById('profile-message');
            if (message) {
                message.textContent = friendlyMessage(error, 'Unable to load your profile.', SERVER_HINT);
                message.classList.remove('is-success');
                message.hidden = false;
            }
        }
    }

    /* ===== actions ===== */

    const classGrid = document.getElementById('class-grid');
    if (classGrid) {
        classGrid.addEventListener('click', async function (event) {
            const button = event.target.closest('[data-book]');
            if (!button) return;

            button.disabled = true;

            if (Number(button.dataset.remaining) <= 1) {
                toast.warning('This class is almost full.');
            }

            try {
                await apiCall('POST', 'bookings.php', {
                    schedule_id: Number(button.dataset.book)
                });
            } catch (error) {
                button.disabled = false;
                toast.error(friendlyMessage(error, 'Something went wrong while booking your class.'));
                return;
            }

            window.setTimeout(function () {
                window.location.href = 'bookings.html?booked=' + encodeURIComponent(button.dataset.name);
            }, 700);
        });
    }

    const bookingsBody = document.getElementById('tbody-bookings');
    if (bookingsBody) {
        bookingsBody.addEventListener('click', async function (event) {
            const button = event.target.closest('[data-cancel-booking]');
            if (!button) return;

            const bookingId = Number(button.dataset.cancelBooking);
            const booking = myBookings.find(function (item) { return item.id === bookingId; });

            try {
                await apiCall('POST', 'bookings.php', { id: bookingId, action: 'cancel' });
            } catch (error) {
                toast.error(friendlyMessage(error, 'Unable to complete your request.'));
                return;
            }

            toast.success('Your booking for ' + (booking ? booking.class_name : 'the class') + ' was cancelled.');
            loadBookingsPage();
        });
    }

    const plansGrid = document.getElementById('plans-grid');
    if (plansGrid) {
        plansGrid.addEventListener('click', async function (event) {
            const button = event.target.closest('[data-choose]');
            if (!button) return;

            const card = button.closest('.plan-card');
            if (!card) return;

            button.disabled = true;

            try {
                const result = await apiCall('POST', 'membership.php', {
                    plan_id: Number(button.dataset.planId)
                });
                toast.success('Your membership is now the ' + result.plan + '.');
                await loadPlansPage();
            } catch (error) {
                button.disabled = false;
                toast.error(friendlyMessage(error, 'Unable to complete your request.'));
            }
        });
    }

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const message = document.getElementById('profile-message');
            const fullName = document.getElementById('profile-name').value.trim();
            const email = document.getElementById('profile-email').value.trim();
            const phone = document.getElementById('profile-phone').value.trim();
            const address = document.getElementById('profile-address').value.trim();

            try {
                await apiCall('POST', 'profile.php', {
                    full_name: fullName,
                    email: email,
                    phone: phone,
                    address: address
                });
            } catch (error) {
                if (message) {
                    message.textContent = friendlyMessage(error, 'Unable to complete your request.');
                    message.classList.remove('is-success');
                    message.hidden = false;
                }
                toast.error(friendlyMessage(error, 'Unable to complete your request.'));
                return;
            }

            currentUser.full_name = fullName;
            currentUser.email = email;
            currentUser.phone = phone;
            currentUser.address = address;
            if (avatar) avatar.textContent = initials(currentUser.full_name);

            if (message) {
                message.textContent = 'Profile updated successfully.';
                message.classList.add('is-success');
                message.hidden = false;
            }
            toast.success('Profile updated successfully.');
        });
    }

    /* ===== boot ===== */

    await Promise.all([
        loadOverview(),
        loadClassesPage(),
        loadBookingsPage(),
        loadPlansPage(),
        loadProfilePage()
    ]);
});
