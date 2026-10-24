document.addEventListener('DOMContentLoaded', async function () {
    setupMobileMenu();

    const modal = document.getElementById('gym-qr-modal');
    const showButton = document.getElementById('show-gym-qr');
    const closeButton = document.getElementById('close-gym-qr');

    showButton.addEventListener('click', function () {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
    });
    closeButton.addEventListener('click', function () {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    });
    modal.addEventListener('click', function (event) {
        if (event.target === modal) closeButton.click();
    });

    try {
        const data = await apiCall('GET', 'checkin.php?action=gym-qr');
        new QRCode(document.getElementById('gym-qr'), { text: data.payload, width: 220, height: 220 });
    } catch (error) {
        const message = document.getElementById('member-checkin-message');
        message.textContent = error.message || 'Unable to load the gym QR code.';
        message.hidden = false;
    }

    document.getElementById('start-member-scan').addEventListener('click', function () {
        startScan('member-qr-camera', 'member-checkin-message');
    });
    document.getElementById('member-qr-image').addEventListener('change', function (event) {
        scanImage(event.target.files[0], 'member-checkin-message');
    });
});

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

async function startScan(videoId, messageId) {
    const message = document.getElementById(messageId);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        message.textContent = 'Live camera scanning needs HTTPS or localhost. Use the image upload option below, or open this site over HTTPS.';
        message.hidden = false;
        return;
    }
    const video = document.getElementById(videoId);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        video.hidden = false;
        await video.play();
        const detector = 'BarcodeDetector' in window
            ? new BarcodeDetector({ formats: ['qr_code'] })
            : null;
        const scan = async function () {
            let payload = null;
            if (detector) {
                const codes = await detector.detect(video);
                payload = codes.length ? codes[0].rawValue : null;
            } else if (window.jsQR) {
                payload = scanVideoFrame(video);
            }
            if (!payload) return requestAnimationFrame(scan);
            stream.getTracks().forEach(function (track) { track.stop(); });
            try {
                await apiCall('POST', 'checkin.php', { payload: payload });
                message.textContent = 'Member check-in recorded successfully.';
            } catch (error) {
                showCheckinError(error, message, 'Unable to check in member.');
            }
            message.hidden = false;
        };
        requestAnimationFrame(scan);
    } catch (error) {
        message.textContent = 'Camera access was blocked. Allow camera permission, use HTTPS/localhost, or scan a QR image instead.';
        message.hidden = false;
    }
}

function showCheckinError(error, message, fallback) {
    const text = error.apiMessage || error.message || fallback;
    message.textContent = text;
    if (error.status === 409) {
        toast.warning(text);
    } else {
        toast.error(text);
    }
}

function scanVideoFrame(video) {
    const canvas = scanVideoFrame.canvas || (scanVideoFrame.canvas = document.createElement('canvas'));
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!canvas.width || !canvas.height) return null;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const result = window.jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    return result ? result.data : null;
}

function scanImage(file, messageId) {
    if (!file) return;
    const message = document.getElementById(messageId);
    if (!window.jsQR) {
        message.textContent = 'The QR image scanner could not load. Check your internet connection and try again.';
        message.hidden = false;
        return;
    }
    const reader = new FileReader();
    reader.onload = function () {
        const image = new Image();
        image.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(image, 0, 0);
            const result = window.jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
            if (!result) {
                message.textContent = 'No QR code was found in that image.';
                message.hidden = false;
                return;
            }
            apiCall('POST', 'checkin.php', { payload: result.data })
                .then(function () { message.textContent = 'Member check-in recorded successfully.'; })
                .catch(function (error) { showCheckinError(error, message, 'Unable to check in member.'); })
                .finally(function () { message.hidden = false; });
        };
        image.src = reader.result;
    };
    reader.readAsDataURL(file);
}
