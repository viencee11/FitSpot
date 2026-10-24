document.addEventListener('DOMContentLoaded', async function () {
    /* ===== helpers (apiCall / esc / peso / SERVER_HINT come from js/api.js) ===== */

    function errorRow(tbody, colspan, message) {
        tbody.innerHTML = '<tr><td colspan="' + colspan + '">' + esc(message) + '</td></tr>';
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

    if (currentUser.role !== 'admin') {
        window.location.replace('../../index.html');
        return;
    }

    const avatar = document.getElementById('admin-avatar');
    if (avatar) avatar.textContent = initials(currentUser.full_name);

    /* ===== avatar dropdown + logout ===== */

    const dropdown = document.getElementById('admin-dropdown');
    const logoutButton = document.getElementById('logout-btn');

    let closeDropdown = function () {};

    if (avatar && dropdown) {
        closeDropdown = function () {
            dropdown.hidden = true;
            avatar.setAttribute('aria-expanded', 'false');
        };

        avatar.addEventListener('click', function (event) {
            event.stopPropagation();
            const isOpen = dropdown.hidden;
            dropdown.hidden = !isOpen;
            avatar.setAttribute('aria-expanded', String(isOpen));
        });

        document.addEventListener('click', function (event) {
            if (!dropdown.hidden && !dropdown.contains(event.target)) {
                closeDropdown();
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

    /* ===== page data loaders ===== */

    async function loadDashboard() {
        const membersEl = document.getElementById('stat-total-members');
        if (!membersEl) return;

        try {
            const data = await apiCall('GET', 'stats.php');
            membersEl.textContent = data.stats.total_members;
            document.getElementById('stat-total-plans').textContent = data.stats.total_plans;
            document.getElementById('stat-total-classes').textContent = data.stats.total_classes;
            document.getElementById('stat-pending').textContent = data.stats.pending_reservations;

            const tbody = document.getElementById('tbody-recent');
            if (tbody) {
                if (!data.recent.length) {
                    errorRow(tbody, 4, 'No reservations yet.');
                } else {
                    tbody.innerHTML = data.recent.map(function (row) {
                        return '<tr>' +
                            '<td>' + esc(row.member) + '</td>' +
                            '<td>' + esc(row.class_name) + '</td>' +
                            '<td>' + esc(row.schedule) + '</td>' +
                            '<td><span class="badge ' + row.status_color + '">' + esc(row.status_label) + '</span></td>' +
                            '</tr>';
                    }).join('');
                }
            }
        } catch (error) {
            toast.error(friendlyMessage(error, 'Unable to load the dashboard.', SERVER_HINT));
        }
    }

    async function loadPlans() {
        const tbody = document.getElementById('tbody-plans');
        if (!tbody) return;

        try {
            const data = await apiCall('GET', 'plans.php');
            if (!data.plans.length) {
                errorRow(tbody, 4, 'No membership plans yet. Use "+ Add Plan" to create one.');
                return;
            }
            tbody.innerHTML = data.plans.map(function (plan) {
                return '<tr data-id="' + plan.id + '">' +
                    '<td data-field="name">' + esc(plan.name) + '</td>' +
                    '<td data-field="price">' + peso(plan.price) + '</td>' +
                    '<td data-field="inclusions">' + esc(plan.inclusions) + '</td>' +
                    '<td>' +
                        '<button type="button" class="btn-sm btn-edit" data-edit>Edit</button>' +
                        '<button type="button" class="btn-sm btn-delete" data-delete>Delete</button>' +
                    '</td>' +
                    '</tr>';
            }).join('');
        } catch (error) {
            errorRow(tbody, 4, friendlyMessage(error, 'Unable to load plans.', SERVER_HINT));
        }
    }

    async function loadClasses() {
        const tbody = document.getElementById('tbody-classes');
        if (!tbody) return;

        try {
            const data = await apiCall('GET', 'classes.php');
            if (!data.classes.length) {
                errorRow(tbody, 4, 'No fitness classes yet. Use "+ Add Class" to create one.');
                return;
            }
            tbody.innerHTML = data.classes.map(function (fitnessClass) {
                return '<tr data-id="' + fitnessClass.id + '">' +
                    '<td data-field="name">' + esc(fitnessClass.name) + '</td>' +
                    '<td data-field="description">' + esc(fitnessClass.description) + '</td>' +
                    '<td data-field="capacity">' + fitnessClass.capacity + ' slots</td>' +
                    '<td>' +
                        '<button type="button" class="btn-sm btn-edit" data-edit>Edit</button>' +
                        '<button type="button" class="btn-sm btn-delete" data-delete>Delete</button>' +
                    '</td>' +
                    '</tr>';
            }).join('');
        } catch (error) {
            errorRow(tbody, 4, friendlyMessage(error, 'Unable to load classes.', SERVER_HINT));
        }
    }

    async function loadSchedules() {
        const tbody = document.getElementById('tbody-schedules');
        if (!tbody) return;

        try {
            const data = await apiCall('GET', 'schedules.php?all=1');
            if (!data.schedules.length) {
                errorRow(tbody, 5, 'No class schedules yet. Use "+ Add Schedule" to create one.');
                return;
            }
            tbody.innerHTML = data.schedules.map(function (slot) {
                return '<tr data-id="' + slot.schedule_id + '">' +
                    '<td>' + esc(slot.class_name) + '</td>' +
                    '<td>' + esc(slot.schedule) + '</td>' +
                    '<td class="slot-cell">' +
                        '<span class="slot-text">' + slot.booked + ' of ' + slot.capacity + ' booked</span>' +
                        '<div class="slot-bar' + (slot.percent >= 100 ? ' is-full' : '') + '">' +
                            '<span style="width: ' + slot.percent + '%;"></span>' +
                        '</div>' +
                    '</td>' +
                    '<td class="status-cell"><span class="badge ' + slot.status_color + '">' + esc(slot.status_label) + '</span></td>' +
                    '<td>' +
                        '<button type="button" class="btn-sm ' + (slot.status === 'open' ? 'btn-delete' : 'btn-confirm') + '" data-toggle-schedule>' +
                            (slot.status === 'open' ? 'Close' : 'Open') +
                        '</button>' +
                        '<button type="button" class="btn-sm btn-delete" data-delete>Delete</button>' +
                    '</td>' +
                    '</tr>';
            }).join('');
        } catch (error) {
            errorRow(tbody, 5, friendlyMessage(error, 'Unable to load schedules.', SERVER_HINT));
        }
    }

    async function loadMembers() {
        const tbody = document.getElementById('tbody-members');
        if (!tbody) return;

        try {
            const data = await apiCall('GET', 'members.php');
            if (!data.members.length) {
                errorRow(tbody, 5, 'No members registered yet.');
                return;
            }
            tbody.innerHTML = data.members.map(function (member) {
                return '<tr data-id="' + member.id + '">' +
                    '<td>' + esc(member.full_name) + '</td>' +
                    '<td>' + esc(member.email) + '</td>' +
                    '<td>' + esc(member.plan) + '</td>' +
                    '<td><span class="badge ' + member.status_color + '">' + esc(member.status_label) + '</span></td>' +
                    '<td>' +
                        (member.can_assign_plan
                            ? '<button type="button" class="btn-sm btn-confirm" data-assign-plan>Assign Plan</button>'
                            : '<button type="button" class="btn-sm" disabled title="Available after membership expiry or at renewal">Plan Active</button>') +
                        '<button type="button" class="btn-sm btn-delete" data-delete>Remove</button>' +
                    '</td>' +
                    '</tr>';
            }).join('');
        } catch (error) {
            errorRow(tbody, 5, friendlyMessage(error, 'Unable to load members.', SERVER_HINT));
        }
    }

    async function loadReservations() {
        const tbody = document.getElementById('tbody-reservations');
        if (!tbody) return;

        try {
            const data = await apiCall('GET', 'reservations.php');
            if (!data.reservations.length) {
                errorRow(tbody, 5, 'No reservations yet.');
                return;
            }
            tbody.innerHTML = data.reservations.map(function (row) {
                const done = row.status !== 'pending';
                return '<tr data-id="' + row.id + '">' +
                    '<td>' + esc(row.member) + '</td>' +
                    '<td>' + esc(row.class_name) + '</td>' +
                    '<td>' + esc(row.schedule) + '</td>' +
                    '<td class="status-cell"><span class="badge ' + row.status_color + '">' + esc(row.status_label) + '</span></td>' +
                    '<td>' +
                        '<button type="button" class="btn-sm btn-confirm" data-confirm' + (done ? ' disabled' : '') + '>Confirm</button>' +
                        '<button type="button" class="btn-sm btn-delete" data-cancel' + (done ? ' disabled' : '') + '>Cancel</button>' +
                    '</td>' +
                    '</tr>';
            }).join('');
        } catch (error) {
            errorRow(tbody, 5, friendlyMessage(error, 'Unable to load reservations.', SERVER_HINT));
        }
    }

    /* ===== form modal ===== */

    const modal = document.getElementById('admin-form-modal');
    const modalTitle = document.getElementById('admin-modal-title');
    const form = document.getElementById('admin-form');
    const fieldsWrap = form.querySelector('.form-fields');

    const modalMessage = document.createElement('p');
    modalMessage.className = 'form-message';
    modalMessage.id = 'admin-modal-message';
    modalMessage.hidden = true;
    modal.querySelector('.modal-body').insertBefore(modalMessage, form);

    let currentType = null;
    let currentRow = null;

    const configs = {
        plan: {
            label: 'Membership Plan',
            fields: [
                { key: 'name', label: 'Plan Name', type: 'text', placeholder: 'e.g. Premium Plan' },
                { key: 'price', label: 'Price per Month', type: 'number', placeholder: 'e.g. 1499' },
                { key: 'inclusions', label: 'Inclusions', type: 'text', placeholder: 'e.g. Gym access plus selected classes' }
            ]
        },
        class: {
            label: 'Fitness Class',
            fields: [
                { key: 'name', label: 'Class Name', type: 'text', placeholder: 'e.g. Pilates' },
                { key: 'description', label: 'Description', type: 'text', placeholder: 'e.g. Core-focused low impact workout.' },
                { key: 'capacity', label: 'Available Slots', type: 'number', placeholder: 'e.g. 10' }
            ]
        },
        schedule: {
            label: 'Class Schedule',
            fields: [
                { key: 'class_id', label: 'Class', type: 'select' },
                { key: 'schedule_date', label: 'Date', type: 'date' },
                { key: 'start_time', label: 'Start Time', type: 'time' },
                { key: 'end_time', label: 'End Time', type: 'time' },
                { key: 'capacity', label: 'Slots', type: 'number', placeholder: 'e.g. 10' }
            ]
        },
        profile: {
            label: 'My Profile',
            formTitle: 'My Profile',
            fields: [
                { key: 'full_name', label: 'Full Name', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'phone', label: 'Contact Number', type: 'text' }
            ]
        },
        settings: {
            label: 'Settings',
            formTitle: 'Settings',
            fields: [
                { key: 'gym', label: 'Gym Name', type: 'text', value: 'FitSpot' },
                { key: 'hours', label: 'Operating Hours', type: 'text', value: 'Monday - Saturday, 6:00 AM - 9:00 PM' },
                { key: 'slots', label: 'Max Slots per Class', type: 'number', value: '10' }
            ]
        },
        memberPlan: {
            label: 'Member Plan',
            fields: [
                { key: 'plan_id', label: 'Membership Plan', type: 'select' }
            ]
        }
    };

    function openModal() {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        const firstInput = fieldsWrap.querySelector('input, select');
        if (firstInput) firstInput.focus();
    }

    function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        currentType = null;
        currentRow = null;
        modalMessage.hidden = true;
    }

    function setModalMessage(text, ok) {
        modalMessage.textContent = text;
        modalMessage.classList.toggle('is-success', Boolean(ok));
        modalMessage.hidden = false;
    }

    async function openForm(type, row) {
        const config = configs[type];
        if (!config) return;

        currentType = type;
        currentRow = row || null;
        modalTitle.textContent = row
            ? 'Edit ' + config.label
            : (config.formTitle || 'Add ' + config.label);
        fieldsWrap.innerHTML = '';
        modalMessage.hidden = true;

        let selectOptions = null;
        if (type === 'schedule') {
            try {
                const data = await apiCall('GET', 'classes.php');
                selectOptions = data.classes.map(function (fitnessClass) {
                    return { value: String(fitnessClass.id), label: fitnessClass.name };
                });
            } catch (error) {
                setModalMessage(friendlyMessage(error, 'Unable to load classes.', SERVER_HINT), false);
            }
        }
        if (type === 'memberPlan') {
            try {
                const data = await apiCall('GET', 'plans.php');
                selectOptions = data.plans
                    .filter(function (plan) { return plan.is_active; })
                    .map(function (plan) {
                        return { value: String(plan.id), label: plan.name };
                    });
            } catch (error) {
                setModalMessage(friendlyMessage(error, 'Unable to load plans.', SERVER_HINT), false);
            }
        }

        for (const field of config.fields) {
            const inputId = 'admin-field-' + field.key;

            const label = document.createElement('label');
            label.setAttribute('for', inputId);
            label.textContent = field.label + ':';

            let input;

            if (field.type === 'select') {
                input = document.createElement('select');
                (selectOptions || []).forEach(function (optionData) {
                    const option = document.createElement('option');
                    option.value = optionData.value;
                    option.textContent = optionData.label;
                    input.appendChild(option);
                });
                if (!selectOptions) {
                    const option = document.createElement('option');
                    option.textContent = 'No classes available';
                    input.appendChild(option);
                }
            } else {
                input = document.createElement('input');
                input.type = field.type;
                if (field.placeholder) input.placeholder = field.placeholder;
                if (field.type === 'number') input.min = '0';
            }

            input.id = inputId;
            input.name = field.key;
            input.required = true;

            if (row) {
                const cell = row.querySelector('[data-field="' + field.key + '"]');
                if (cell) {
                    input.value = field.type === 'number'
                        ? cell.textContent.replace(/\D/g, '')
                        : cell.textContent;
                }
            } else if (type === 'profile' && currentUser) {
                input.value = currentUser[field.key] || '';
            } else if (field.value !== undefined) {
                input.value = field.value;
            }

            fieldsWrap.appendChild(label);
            fieldsWrap.appendChild(input);
        }

        openModal();
    }

    async function saveForm() {
        const config = configs[currentType];
        if (!config) return;

        const values = {};
        let valid = true;

        config.fields.forEach(function (field) {
            const input = form.elements[field.key];
            values[field.key] = input ? String(input.value).trim() : '';
            if (!values[field.key]) valid = false;
        });

        if (!valid) {
            setModalMessage('Please fill in all fields.', false);
            return;
        }

        const isUpdate = Boolean(currentRow);

        try {
            if (currentType === 'plan') {
                const body = {
                    name: values.name,
                    price: values.price,
                    inclusions: values.inclusions
                };
                if (currentRow) {
                    body.id = Number(currentRow.dataset.id);
                    await apiCall('PUT', 'plans.php', body);
                } else {
                    await apiCall('POST', 'plans.php', body);
                }
                toast.success(isUpdate ? 'Updated successfully.' : 'Saved successfully.');
                closeModal();
                loadPlans();
                return;
            }

            if (currentType === 'class') {
                const body = {
                    name: values.name,
                    description: values.description,
                    capacity: values.capacity
                };
                if (currentRow) {
                    body.id = Number(currentRow.dataset.id);
                    await apiCall('PUT', 'classes.php', body);
                } else {
                    await apiCall('POST', 'classes.php', body);
                }
                toast.success(isUpdate ? 'Updated successfully.' : 'Saved successfully.');
                closeModal();
                loadClasses();
                return;
            }

            if (currentType === 'schedule') {
                await apiCall('POST', 'schedules.php', {
                    class_id: Number(values.class_id),
                    schedule_date: values.schedule_date,
                    start_time: values.start_time,
                    end_time: values.end_time,
                    capacity: values.capacity
                });
                toast.success('Saved successfully.');
                closeModal();
                loadSchedules();
                return;
            }

            if (currentType === 'memberPlan') {
                await apiCall('POST', 'membership.php', {
                    member_id: Number(currentRow.dataset.id),
                    plan_id: Number(values.plan_id)
                });
                toast.success('Member plan assigned successfully.');
                closeModal();
                loadMembers();
                return;
            }

            if (currentType === 'profile') {
                const updated = await apiCall('POST', 'profile.php', {
                    full_name: values.full_name,
                    email: values.email,
                    phone: values.phone,
                    address: currentUser.address || ''
                });
                currentUser.full_name = values.full_name;
                currentUser.email = values.email;
                currentUser.phone = values.phone;
                if (avatar) avatar.textContent = initials(currentUser.full_name);
                setModalMessage('Profile updated successfully.', true);
                toast.success('Profile updated successfully.');
                return;
            }

            if (currentType === 'settings') {
                setModalMessage('Settings are not stored yet - there is no settings table in the database.', false);
                return;
            }
        } catch (error) {
            setModalMessage(friendlyMessage(error, 'Unable to complete your request.'), false);
            toast.error(friendlyMessage(error, 'Unable to complete your request.'));
        }
    }

    /* ===== actions ===== */

    async function deleteEntity(entity, id) {
        const endpoints = {
            plan: { file: 'plans.php', noun: 'plan' },
            class: { file: 'classes.php', noun: 'class' },
            schedule: { file: 'schedules.php', noun: 'schedule' },
            member: { file: 'members.php', noun: 'member' }
        };
        const endpoint = endpoints[entity];
        if (!endpoint) return;

        const confirmed = await confirmDialog(
            'Confirm Delete',
            'Delete this ' + endpoint.noun + '? This cannot be undone.',
            'Delete'
        );
        if (!confirmed) return;

        try {
            await apiCall('DELETE', endpoint.file, { id: id });
        } catch (error) {
            toast.error(friendlyMessage(error, 'Unable to complete your request.'));
            return;
        }

        if (entity === 'plan') loadPlans();
        if (entity === 'class') loadClasses();
        if (entity === 'schedule') loadSchedules();
        if (entity === 'member') loadMembers();
    }

    async function setReservation(row, action) {
        try {
            const data = await apiCall('POST', 'reservations.php', {
                id: Number(row.dataset.id),
                action: action
            });
            const statusCell = row.querySelector('.status-cell');
            if (statusCell) {
                statusCell.innerHTML = '<span class="badge ' + data.status_color + '">' +
                    esc(data.status_label) + '</span>';
            }
            row.querySelectorAll('[data-confirm], [data-cancel]').forEach(function (button) {
                button.disabled = true;
            });
        } catch (error) {
            toast.error(friendlyMessage(error, 'Unable to complete your request.'));
        }
    }

    document.addEventListener('click', async function (event) {
        const formButton = event.target.closest('[data-open-form]');
        if (formButton) {
            closeDropdown();
            openForm(formButton.dataset.openForm, null);
            return;
        }

        const addButton = event.target.closest('[data-add]');
        if (addButton) {
            openForm(addButton.dataset.add, null);
            return;
        }

        const editButton = event.target.closest('[data-edit]');
        if (editButton) {
            const row = editButton.closest('tr');
            const table = row.closest('table');
            openForm(table.dataset.entity, row);
            return;
        }

        const deleteButton = event.target.closest('[data-delete]');
        if (deleteButton) {
            const row = deleteButton.closest('tr');
            const table = row.closest('table');
            deleteEntity(table.dataset.entity, Number(row.dataset.id));
            return;
        }

        const assignPlanButton = event.target.closest('[data-assign-plan]');
        if (assignPlanButton) {
            openForm('memberPlan', assignPlanButton.closest('tr'));
            return;
        }

        const toggleScheduleButton = event.target.closest('[data-toggle-schedule]');
        if (toggleScheduleButton) {
            const row = toggleScheduleButton.closest('tr');
            try {
                const data = await apiCall('POST', 'schedules.php', {
                    id: Number(row.dataset.id),
                    action: 'toggle_status'
                });
                const statusCell = row.querySelector('.status-cell');
                if (statusCell) {
                    statusCell.innerHTML = '<span class="badge ' + data.status_color + '">' +
                        esc(data.status_label) + '</span>';
                }
                toggleScheduleButton.className = 'btn-sm ' +
                    (data.status === 'open' ? 'btn-delete' : 'btn-confirm');
                toggleScheduleButton.textContent = data.status === 'open' ? 'Close' : 'Open';
                toast.success('Schedule is now ' + data.status_label.toLowerCase() + '.');
            } catch (error) {
                toast.error(friendlyMessage(error, 'Unable to update the schedule status.'));
            }
            return;
        }

        const confirmButton = event.target.closest('[data-confirm]');
        if (confirmButton) {
            const confirmed = await confirmDialog(
                'Confirm Reservation',
                'Are you sure you want to confirm this reservation?',
                'Confirm'
            );
            if (!confirmed) return;
            setReservation(confirmButton.closest('tr'), 'confirm');
            return;
        }

        const cancelButton = event.target.closest('[data-cancel]');
        if (cancelButton) {
            setReservation(cancelButton.closest('tr'), 'cancel');
            return;
        }

        if (event.target.closest('[data-close]')) {
            closeModal();
        }
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        saveForm();
    });

    /* ===== boot ===== */

    await Promise.all([
        loadDashboard(),
        loadPlans(),
        loadClasses(),
        loadSchedules(),
        loadMembers(),
        loadReservations()
    ]);
});
