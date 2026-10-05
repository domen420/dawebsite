/*
 * Enquiry forms (contact.html, about.html) -> Web3Forms.
 *
 * Paste the Web3Forms access key below. It is a public key by design
 * (Web3Forms only ever emails it to the inbox it was issued for), so it is
 * safe to ship in the page.
 *
 * Markup contract: <form data-enquiry-form> containing a hidden honeypot
 * <input name="botcheck">, a submit button, and <p class="form-status">.
 * ?type=rental | purchase | custom | general | press preselects the
 * enquiry type.
 */
(function () {
    var ACCESS_KEY = 'YOUR_WEB3FORMS_ACCESS_KEY';
    var ENDPOINT = 'https://api.web3forms.com/submit';
    var FALLBACK_EMAIL = 'info@dainnovations.com';

    // Page language (<html lang>) picks the strings; English is the fallback.
    var LANG = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    var STRINGS = {
        en: {
            // URL ?type= value -> enquiry type, exactly as the <option> text reads
            types: { general: 'General', purchase: 'Product enquiry', product: 'Product enquiry',
                     custom: 'Custom build', rental: 'Rental', press: 'Press' },
            fallbackType: 'General',
            sent: 'Thank you. Your enquiry has been sent.',
            sentReply: 'Thank you. Your enquiry has been sent and an engineer will reply within two working days.',
            notConnected: 'The form is not connected yet. Please email %s directly.',
            failed: 'Sorry, the enquiry could not be sent. Please try again, or email %s directly.',
            sending: 'Sending…',
            subject: 'Website enquiry: '
        },
        sl: {
            types: { general: 'Splošno', purchase: 'Povpraševanje o izdelku', product: 'Povpraševanje o izdelku',
                     custom: 'Izdelava po meri', rental: 'Najem', press: 'Mediji' },
            fallbackType: 'Splošno',
            sent: 'Hvala. Vaše povpraševanje je bilo poslano.',
            sentReply: 'Hvala. Vaše povpraševanje je bilo poslano, inženir vam bo odgovoril v dveh delovnih dneh.',
            notConnected: 'Obrazec še ni povezan. Pišite nam neposredno na %s.',
            failed: 'Povpraševanja žal ni bilo mogoče poslati. Poskusite znova ali pišite neposredno na %s.',
            sending: 'Pošiljanje…',
            subject: 'Povpraševanje s spletne strani (SL): '
        }
    };
    var T = STRINGS[LANG] || STRINGS.en;
    var TYPES = T.types;

    function preselectType(form) {
        var field = form.querySelector('[name="enquiry_type"]');
        var match = /[?&]type=([^&#]*)/.exec(window.location.search);
        if (!field || !match) return;
        var label = TYPES[decodeURIComponent(match[1]).toLowerCase()];
        if (!label) return;
        if (field.tagName === 'SELECT' || !field.value) field.value = label;
    }

    function setStatus(el, kind, text) {
        el.textContent = text;
        el.className = 'form-status is-' + kind;
        el.hidden = false;
    }

    function enquiryLabel(form) {
        var field = form.querySelector('[name="enquiry_type"]');
        return (field && field.value.trim()) || T.fallbackType;
    }

    function init(form) {
        var button = form.querySelector('[type="submit"]');
        var status = form.querySelector('.form-status');
        var idleLabel = button.textContent;
        preselectType(form);

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Honeypot: real visitors never see or tick this checkbox. Bots get
            // a fake success so they don't retry.
            var trap = form.querySelector('[name="botcheck"]');
            if (trap && trap.checked) {
                form.reset();
                preselectType(form);
                setStatus(status, 'success', T.sent);
                return;
            }

            if (ACCESS_KEY.indexOf('YOUR_') === 0) {
                setStatus(status, 'error', T.notConnected.replace('%s', FALLBACK_EMAIL));
                return;
            }

            var data = {};
            new FormData(form).forEach(function (value, key) {
                if (key !== 'botcheck') data[key] = value;
            });
            data.access_key = ACCESS_KEY;
            data.subject = T.subject + enquiryLabel(form);
            data.from_name = 'D&A Innovations website';
            data.page = window.location.pathname.split('/').slice(-2).join('/') || 'index.html';

            button.disabled = true;
            button.textContent = T.sending;
            status.hidden = true;

            fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(data)
            })
                .then(function (res) {
                    return res.json().catch(function () { return {}; }).then(function (body) {
                        if (!res.ok || !body.success) throw new Error(body.message || 'HTTP ' + res.status);
                    });
                })
                .then(function () {
                    form.reset();
                    preselectType(form);
                    setStatus(status, 'success', T.sentReply);
                })
                .catch(function () {
                    setStatus(status, 'error', T.failed.replace('%s', FALLBACK_EMAIL));
                })
                .then(function () {
                    button.disabled = false;
                    button.textContent = idleLabel;
                });
        });
    }

    var forms = document.querySelectorAll('form[data-enquiry-form]');
    for (var i = 0; i < forms.length; i++) init(forms[i]);
})();
