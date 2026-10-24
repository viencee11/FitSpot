/* FitSpot shared helpers: API base, apiCall, escaping, and formatting.
   Loaded (with defer) after toast.js and before script.js / admin.js / user.js. */
(function () {
    'use strict';

    /* Relative base that works from the root, /pages/, and /pages/<area>/ pages. */
    const API = (function () {
        const parts = location.pathname.split('/').filter(Boolean);
        const i = parts.indexOf('pages');
        if (i !== -1) {
            return '../'.repeat(parts.length - i - 1) + 'api/';
        }
        return 'api/';
    })();

    window.SERVER_HINT = ' Could not reach the server - start it with: php -S localhost:8000';
    window.CSRF_TOKEN = '';

    window.apiCall = async function (method, file, body) {
        const options = { method: method, headers: {} };
        if (window.CSRF_TOKEN && ['POST', 'PUT', 'DELETE'].indexOf(method) !== -1) {
            options.headers['X-CSRF-Token'] = window.CSRF_TOKEN;
        }
        if (body !== undefined) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        let res;
        try {
            res = await fetch(API + file, options);
        } catch (networkError) {
            const error = new Error('Could not reach the server.');
            error.kind = 'network';
            throw error;
        }
        let data = null;
        try { data = await res.json(); } catch (parseError) {}
        if (data && data.csrf) window.CSRF_TOKEN = String(data.csrf);
        if (!res.ok) {
            const error = new Error((data && data.error) || '');
            error.status = res.status;
            error.apiMessage = data && data.error ? String(data.error) : '';
            if (res.status === 401 && error.apiMessage === 'Please log in first.') {
                error.sessionExpired = true;
            }
            throw error;
        }
        return data;
    };

    window.esc = function (value) {
        return String(value === null || value === undefined ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    window.peso = function (amount) {
        return '\u20B1' + Number(amount).toLocaleString('en-PH', { maximumFractionDigits: 0 });
    };
})();
