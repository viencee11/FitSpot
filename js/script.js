document.addEventListener('DOMContentLoaded', function () {
    const homeHeader = document.querySelector('body > header');
    const homeMenuToggle = document.querySelector('.home-menu-toggle');
    const homeNavigation = document.getElementById('home-navigation');

    if (homeHeader && homeMenuToggle && homeNavigation) {
        function closeHomeMenu() {
            homeHeader.classList.remove('is-menu-open');
            homeMenuToggle.setAttribute('aria-expanded', 'false');
            homeMenuToggle.setAttribute('aria-label', 'Open navigation menu');
        }

        homeMenuToggle.addEventListener('click', function (event) {
            event.stopPropagation();
            const isOpen = homeHeader.classList.toggle('is-menu-open');
            homeMenuToggle.setAttribute('aria-expanded', String(isOpen));
            homeMenuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
        });

        homeNavigation.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeHomeMenu);
        });

        document.addEventListener('click', function (event) {
            if (homeHeader.classList.contains('is-menu-open')
                && !homeHeader.contains(event.target)) {
                closeHomeMenu();
            }
        });
    }

    const overlays = document.querySelectorAll('.modal-overlay');

    function openModal(id) {
        const modal = document.getElementById(id);
        if (!modal || !modal.classList.contains('modal-overlay')) return;

        overlays.forEach(function (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        });

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');

        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }

    function closeModals() {
        overlays.forEach(function (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        });
    }

    document.querySelectorAll('a[href^="#"][href$="-popup"]').forEach(function (link) {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            openModal(link.getAttribute('href').slice(1));
        });
    });

    document.querySelectorAll('.modal-close').forEach(function (button) {
        button.addEventListener('click', closeModals);
    });

    overlays.forEach(function (overlay) {
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) closeModals();
        });
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeModals();
    });

    document.querySelectorAll('.modal form').forEach(function (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
        });
    });

    /* ===== API helpers (apiCall / esc / peso / SERVER_HINT come from js/api.js) ===== */

    function showMessage(element, text, ok) {
        if (!element) return;
        element.textContent = text;
        element.classList.toggle('is-success', Boolean(ok));
        element.hidden = false;
    }

    /* ===== Login ===== */

    function handleLogin(formId, messageId, paths) {
        const form = document.getElementById(formId);
        const message = document.getElementById(messageId);
        if (!form || !message) return;

        form.addEventListener('submit', async function (event) {
            event.preventDefault();

            const email = form.querySelector('input[type="email"]').value.trim().toLowerCase();
            const password = form.querySelector('input[type="password"]').value;

            let user;
            try {
                user = await apiCall('POST', 'login.php', { email: email, password: password });
            } catch (error) {
                showMessage(
                    message,
                    friendlyMessage(error, 'Unable to complete your request.', SERVER_HINT),
                    false
                );
                return;
            }

            showMessage(message, 'Login successful. Redirecting...', true);

            setTimeout(function () {
                window.location.href = paths[user.role] || paths.member;
            }, 500);
        });
    }

    handleLogin('popup-login-form', 'popup-login-message', {
        admin: 'pages/admin/dashboard.html',
        member: 'pages/users/dashboard.html'
    });
    handleLogin('page-login-form', 'page-login-message', {
        admin: 'admin/dashboard.html',
        member: 'users/dashboard.html'
    });

    /* ===== Register ===== */

    const registerForms = {
        'popup-register-form': {
            message: 'popup-register-message',
            fields: { name: 'popup-name', email: 'popup-reg-email', pass: 'popup-reg-password', confirm: 'popup-confirm-password' }
        },
        'page-register-form': {
            message: 'page-register-message',
            fields: { name: 'fullname', email: 'reg-email', pass: 'reg-password', confirm: 'confirm-password' }
        }
    };

    Object.keys(registerForms).forEach(function (formId) {
        const form = document.getElementById(formId);
        const config = registerForms[formId];
        if (!form) return;

        const message = document.getElementById(config.message);

        form.addEventListener('submit', async function (event) {
            event.preventDefault();

            const fullName = document.getElementById(config.fields.name).value.trim();
            const email = document.getElementById(config.fields.email).value.trim().toLowerCase();
            const password = document.getElementById(config.fields.pass).value;
            const confirm = document.getElementById(config.fields.confirm).value;

            if (password !== confirm) {
                showMessage(message, 'Passwords do not match.', false);
                return;
            }

            try {
                await apiCall('POST', 'register.php', {
                    full_name: fullName,
                    email: email,
                    password: password,
                    confirm: confirm
                });
            } catch (error) {
                showMessage(
                    message,
                    friendlyMessage(error, 'Unable to complete your request.', SERVER_HINT),
                    false
                );
                return;
            }

            showMessage(message, 'Account created. You can now log in.', true);
            form.reset();
        });
    });

    /* ===== Homepage: live plans, classes, and schedule ===== */

    function sectionError(sectionId, text) {
        const section = document.getElementById(sectionId);
        if (!section) return;
        let note = section.querySelector('.section-error');
        if (!note) {
            note = document.createElement('p');
            note.className = 'section-error form-message';
            section.appendChild(note);
        }
        note.textContent = text;
        note.hidden = false;
    }

    function loadHomepagePlans() {
        const section = document.getElementById('membership');
        if (!section) return;

        apiCall('GET', 'plans.php').then(function (data) {
            section.innerHTML = '<h2>Membership Plans</h2>' + data.plans.map(function (plan) {
                const firstLine = String(plan.inclusions).split(';')[0].trim();
                return '' +
                    '<article>' +
                        '<h3>' + esc(plan.name) + '</h3>' +
                        '<p>' + esc(firstLine) + '.</p>' +
                        '<p>' + peso(plan.price) + ' per month</p>' +
                        '<button type="button" data-home-plan="' + plan.id + '">Choose Plan</button>' +
                    '</article>';
            }).join('');
        }).catch(function (error) {
            sectionError('membership', friendlyMessage(error, 'Unable to load plans.', SERVER_HINT));
        });
    }

    function loadHomepageClasses() {
        const section = document.getElementById('classes');
        if (!section) return;

        apiCall('GET', 'classes.php').then(function (data) {
            section.innerHTML = '<h2>Fitness Classes</h2>' + data.classes.map(function (fitnessClass) {
                return '' +
                    '<article>' +
                        '<h3>' + esc(fitnessClass.name) + '</h3>' +
                        '<p>' + esc(fitnessClass.description || 'Fun and guided group session for all levels.') + '</p>' +
                        '<p>' + esc(fitnessClass.next_schedule || 'Schedule to be announced') + '</p>' +
                        '<button type="button" data-view-schedule>View Schedule</button>' +
                    '</article>';
            }).join('');
        }).catch(function (error) {
            sectionError('classes', friendlyMessage(error, 'Unable to load classes.', SERVER_HINT));
        });
    }

    function loadHomepageSchedule() {
        const section = document.getElementById('schedule');
        if (!section) return;

        apiCall('GET', 'schedules.php').then(function (data) {
            const items = data.schedules.map(function (slot) {
                const date = new Date(slot.date + 'T00:00:00');
                const label = date.toLocaleDateString('en-PH', {
                    weekday: 'long', month: 'short', day: 'numeric'
                });
                return '<li>' + esc(slot.class_name) + ' - ' + esc(label) + ' - ' +
                    slot.remaining + ' slots available</li>';
            });
            section.innerHTML = '<h2>Class Schedule</h2><ul>' +
                (items.join('') || '<li>No upcoming classes scheduled.</li>') + '</ul>';
        }).catch(function (error) {
            sectionError('schedule', friendlyMessage(error, 'Unable to load your schedule.', SERVER_HINT));
        });
    }

    loadHomepagePlans();
    loadHomepageClasses();
    loadHomepageSchedule();

    document.addEventListener('click', async function (event) {
        const scheduleButton = event.target.closest('[data-view-schedule]');
        if (scheduleButton) {
            const scheduleSection = document.getElementById('schedule');
            if (scheduleSection) scheduleSection.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        const planButton = event.target.closest('[data-home-plan]');
        if (!planButton) return;

        const planId = Number(planButton.dataset.homePlan);
        let message = planButton.parentNode.querySelector('.form-message');
        if (!message) {
            message = document.createElement('p');
            message.className = 'form-message';
            planButton.parentNode.appendChild(message);
        }

        try {
            await apiCall('GET', 'me.php');
        } catch (error) {
            if (error.message === 'Please log in first.') {
                openModal('login-popup');
                showMessage(document.getElementById('popup-login-message'),
                    'Log in with a member account to choose a plan.', false);
            } else {
                showMessage(message, friendlyMessage(error, 'Unable to complete your request.', SERVER_HINT), false);
            }
            return;
        }

        try {
            const result = await apiCall('POST', 'membership.php', { plan_id: planId });
            planButton.textContent = 'Plan Selected';
            planButton.disabled = true;
            showMessage(message, 'Your membership is now the ' + result.plan + '.', true);
            toast.success('Membership created successfully.');
        } catch (error) {
            showMessage(message, friendlyMessage(error, 'Unable to complete your request.'), false);
            toast.error(friendlyMessage(error, 'Unable to complete your request.'));
        }
    });

    /* ===== Homepage booking form ===== */

    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        const classSelect = document.getElementById('class');
        const dateInput = document.getElementById('date');
        const bookingMessage = document.getElementById('booking-form-message');

        if (dateInput) {
            dateInput.min = new Date().toISOString().slice(0, 10);
        }

        apiCall('GET', 'classes.php').then(function (data) {
            if (!classSelect) return;
            classSelect.innerHTML = data.classes.map(function (fitnessClass) {
                return '<option>' + esc(fitnessClass.name) + '</option>';
            }).join('');
        }).catch(function () {});

        bookingForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const name = document.getElementById('name').value.trim();
            const className = classSelect ? classSelect.value : '';
            const date = dateInput ? dateInput.value : '';

            if (!name || !className || !date) {
                showMessage(bookingMessage, 'Please fill in your name, class, and date.', false);
                return;
            }

            try {
                await apiCall('GET', 'me.php');
            } catch (error) {
                if (error.message === 'Please log in first.') {
                    openModal('login-popup');
                    showMessage(document.getElementById('popup-login-message'),
                        'Log in with a member account to book a class.', false);
                } else {
                    showMessage(bookingMessage, friendlyMessage(error, 'Something went wrong while booking your class.', SERVER_HINT), false);
                    toast.error(friendlyMessage(error, 'Something went wrong while booking your class.'));
                }
                return;
            }

            try {
                await apiCall('POST', 'bookings.php', {
                    class_name: className,
                    schedule_date: date
                });
            } catch (error) {
                showMessage(bookingMessage, friendlyMessage(error, 'Something went wrong while booking your class.'), false);
                toast.error(friendlyMessage(error, 'Something went wrong while booking your class.'));
                return;
            }

            showMessage(bookingMessage,
                'Booking request sent for ' + className + ' on ' + date + '. Awaiting confirmation.', true);
            toast.success('Booking confirmed successfully.');
            bookingForm.reset();
        });
    }

    /* ===== Hero carousel ===== */

    const carousel = document.getElementById('hero-carousel');

    if (carousel) {
        const slides = carousel.querySelectorAll('.hero-slide');
        const dots = document.querySelectorAll('.hero-dot');
        let currentSlide = 0;
        let autoplayTimer;

        function goToSlide(index) {
            currentSlide = (index + slides.length) % slides.length;

            slides.forEach(function (slide, i) {
                slide.classList.toggle('is-active', i === currentSlide);
            });

            dots.forEach(function (dot, i) {
                dot.classList.toggle('is-active', i === currentSlide);
            });
        }

        function nextSlide() {
            goToSlide(currentSlide + 1);
        }

        function startAutoplay() {
            autoplayTimer = setInterval(nextSlide, 3000);
        }

        function resetAutoplay() {
            clearInterval(autoplayTimer);
            startAutoplay();
        }

        dots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                goToSlide(parseInt(dot.dataset.slide, 10));
                resetAutoplay();
            });
        });

        startAutoplay();
    }
});
