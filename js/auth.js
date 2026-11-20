/* UniLife OS — Calm, adaptive authentication */
UL.auth = {
  show() {
    return new Promise(res => {
      const t = k => UL.i18n.t(k);
      const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
      );

      let resetToken = new URLSearchParams(location.search).get('reset') || '';
      let mode = resetToken ? 'reset' : 'login';
      let email = '';
      let busy = false;
      let notice = '';
      let resendUntil = 0;
      let resendTimer = null;

      const setPreference = async (key, value) => {
        UL.prefs[key] = value;
        try {
          localStorage.setItem('ul_prefs', JSON.stringify(UL.prefs));
        } catch (_) {}
        if (key === 'lang') { localStorage.setItem('ul_auth_lang_override', value); await UL.i18n.load(value); }
        if (key === 'theme') {
          const root = document.documentElement;
          root.dataset.theme = value === 'dark' ? 'dark' : 'light';
          root.dataset.palette = window.ULPalette(UL.prefs.palette);
        }
        draw();
      };

      document.documentElement.dataset.palette = window.ULPalette(UL.prefs.palette);
      const el = document.createElement('div');
      el.className = 'authwrap auth-simple';
      document.body.append(el);

      const icons = () => {
        if (window.lucide?.createIcons) {
          window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
        }
      };

      const draw = (err = '') => {
        const reg = mode === 'register';
        const forgot = mode === 'forgot';
        const reset = mode === 'reset';
        const lang = UL.prefs.lang || 'en';
        const dark = document.documentElement.dataset.theme === 'dark';
        const copy = lang === 'ms' ? {
          welcome: 'Selamat kembali',
          start: 'Mulakan perjalanan',
          loginTitle: 'Hai, selamat kembali.',
          registerTitle: 'Cipta akaun anda.',
          loginSub: 'Kelas, tugasan dan kehidupan kampus — semuanya di satu tempat.',
          registerSub: 'Kelas, tugasan dan kehidupan kampus — semuanya di satu tempat.',
          name: 'Nama',
          namePlaceholder: 'Nama anda',
          email: 'E-mel',
          password: 'Kata laluan',
          passwordPlaceholder: reg ? 'Cipta kata laluan' : 'Masukkan kata laluan',
          login: 'Log masuk',
          register: 'Daftar akaun',
          signing: 'Sedang log masuk…',
          creating: 'Sedang mencipta akaun…',
          new: 'Pengguna baharu UniLife OS?',
          existing: 'Sudah mempunyai akaun?',
          switchLogin: 'Log masuk',
          switchRegister: 'Daftar sekarang',
          footer: 'Ruang kecil untuk kemajuan besar.',
          language: 'Bahasa',
          theme: 'Tema',
          dark: 'Gelap',
          light: 'Cerah',
          forgot: 'Lupa kata laluan?', resetTitle: 'Tetapkan kata laluan baharu.',
          forgotTitle: 'Lupa kata laluan?', forgotSub: 'Masukkan e-mel akaun anda. Kami akan menghantar pautan untuk menetapkan semula kata laluan.',
          resetSub: 'Pilih kata laluan baharu untuk akaun UniLife OS anda.',
          newPassword: 'Kata laluan baharu', confirmPassword: 'Sahkan kata laluan',
          sendReset: 'Hantar pautan reset', savePassword: 'Simpan kata laluan baharu',
          resetSent: 'Jika akaun wujud untuk e-mel ini, pautan reset telah dihantar. Sila semak peti masuk anda.',
          resetDone: 'Kata laluan berjaya dikemas kini. Sila log masuk.', backLogin: 'Kembali ke log masuk',
          resendReset: 'Hantar semula pautan', resendWait: 'Hantar semula dalam {seconds}s', invalidEmail: 'Sila masukkan alamat e-mel yang sah.',
          passwordMismatch: 'Kata laluan tidak sepadan.', showPassword: 'Papar kata laluan', hidePassword: 'Sembunyikan kata laluan'
        } : {
          welcome: 'WELCOME BACK',
          start: 'A FRESH START',
          loginTitle: 'Good to see you.',
          registerTitle: 'Create your account.',
          loginSub: 'Classes, tasks and campus life — all in one place.',
          registerSub: 'Classes, tasks and campus life — all in one place.',
          name: 'Name',
          namePlaceholder: 'Your name',
          email: 'Email address',
          password: 'Password',
          passwordPlaceholder: reg ? 'Create a password' : 'Enter your password',
          login: 'Sign in',
          register: 'Create account',
          signing: 'Signing in…',
          creating: 'Creating account…',
          new: 'New to UniLife OS?',
          existing: 'Already have an account?',
          switchLogin: 'Sign in',
          switchRegister: 'Create an account',
          footer: 'A little progress, every day.',
          language: 'Language',
          theme: 'Appearance',
          dark: 'Dark',
          light: 'Light',
          forgot: 'Forgot password?', resetTitle: 'Set a new password.',
          forgotTitle: 'Forgot your password?', forgotSub: 'Enter your account email. We will send you a link to reset your password.',
          resetSub: 'Choose a new password for your UniLife OS account.',
          newPassword: 'New password', confirmPassword: 'Confirm password',
          sendReset: 'Send reset link', savePassword: 'Save new password',
          resetSent: 'If an account exists for this email, a reset link has been sent. Please check your inbox.',
          resetDone: 'Your password has been updated. Please sign in.', backLogin: 'Back to sign in',
          resendReset: 'Resend reset link', resendWait: 'Resend in {seconds}s', invalidEmail: 'Please enter a valid email address.',
          passwordMismatch: 'Passwords do not match.', showPassword: 'Show password', hidePassword: 'Hide password'
        };

        el.innerHTML = `
          <div class="auth-ambient" aria-hidden="true">
            <span class="auth-orb auth-orb-one"></span>
            <span class="auth-orb auth-orb-two"></span>
            <span class="auth-orb auth-orb-three"></span>
          </div>

          <div class="auth-preferences" aria-label="Login appearance and language">
            <label class="auth-language">
              <i data-lucide="languages"></i>
              <span class="sr-only">${copy.language}</span>
              <select id="auth-language" aria-label="${copy.language}">
                <option value="en" ${lang === 'en' ? 'selected' : ''}>EN</option>
                <option value="ms" ${lang === 'ms' ? 'selected' : ''}>BM</option>
              </select>
            </label>
            <button type="button" class="auth-theme" id="auth-theme"
              aria-label="${copy.theme}: ${dark ? copy.dark : copy.light}"
              title="${copy.theme}: ${dark ? copy.dark : copy.light}">
              <i data-lucide="${dark ? 'moon' : 'sun'}"></i>
              <span>${dark ? copy.dark : copy.light}</span>
            </button>
          </div>

          <main class="auth-simple-shell">
            <div class="auth-simple-brand">
              <img class="logo-light" src="assets/icons/logo-light.png" alt="UniLife OS logo"><img class="logo-dark" src="assets/icons/logo-dark.png" alt="UniLife OS logo">
              <span>UniLife <b>OS</b></span>
            </div>

            <section class="auth-simple-card">
              <div class="auth-simple-heading">
                <span class="auth-simple-label">${reg ? copy.start : copy.welcome}</span>
                <h1>${reg ? copy.registerTitle : forgot ? copy.forgotTitle : reset ? copy.resetTitle : copy.loginTitle}</h1>
                <p>${forgot ? copy.forgotSub : reset ? copy.resetSub : reg ? copy.registerSub : copy.loginSub}</p>
              </div>

              <form class="auth-form" novalidate>
                ${reg ? `
                  <label class="auth-field">
                    <span>${copy.name}</span>
                    <input name="name" required maxlength="80"
                      autocomplete="name" placeholder="${copy.namePlaceholder}">
                  </label>
                ` : ''}

                ${reset ? '' : `<label class="auth-field">
                  <span>${copy.email}</span>
                  <input name="email" type="email" required maxlength="120"
                    autocomplete="email" placeholder="you@example.com"
                    value="${esc(email)}">
                </label>`}

                ${forgot ? '' : `<label class="auth-field">
                  <span>${reset ? copy.newPassword : copy.password}</span>
                  <div class="auth-simple-password">
                    <input name="password" id="auth-password" type="password"
                      required minlength="${reg || reset ? 10 : 1}" maxlength="128"
                      autocomplete="${reg || reset ? 'new-password' : 'current-password'}"
                      placeholder="${reset ? copy.newPassword : copy.passwordPlaceholder}">
                    <button type="button" class="auth-eye" data-auth-eye
                      aria-label="${copy.showPassword}"><i data-lucide="eye"></i></button>
                  </div>
                </label>`}
                ${reset ? `<label class="auth-field"><span>${copy.confirmPassword}</span><input name="confirmPassword" type="password" required minlength="10" maxlength="128" autocomplete="new-password"></label>` : ''}

                ${reg ? `<p class="auth-password-hint">${t('pwdHint')}</p>` : ''}
                <p class="auth-error" role="alert" aria-live="polite">${esc(err)}</p>
                <p class="auth-success" role="status" aria-live="polite">${esc(notice)}</p>

                <button class="auth-submit" type="submit" ${forgot && resendUntil > Date.now() ? 'disabled' : ''}>
                  <span>${reg ? copy.register : forgot ? (resendUntil ? (Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000)) > 0 ? copy.resendWait.replace('{seconds}', Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000))) : copy.resendReset) : copy.sendReset) : reset ? copy.savePassword : copy.login}</span>
                  <i data-lucide="arrow-right"></i>
                </button>
              </form>

              ${!reg && !forgot && !reset ? `<div class="auth-forgot"><a href="#" id="auth-forgot">${copy.forgot}</a></div>` : ''}
              <div class="auth-switch">
                ${forgot || reset ? '' : reg ? copy.existing : copy.new}
                <a href="#" id="auth-switch">${forgot || reset ? copy.backLogin : reg ? copy.switchLogin : copy.switchRegister}</a>
              </div>
            </section>

            <footer class="auth-simple-footer">${copy.footer}</footer>
          </main>
        `;

        icons();

        el.querySelector('#auth-language').onchange = e =>
          setPreference('lang', e.target.value);
        el.querySelector('#auth-theme').onclick = () =>
          setPreference('theme', dark ? 'light' : 'dark');

        el.querySelector('#auth-switch').onclick = e => {
          e.preventDefault();
          if (busy) return;
          mode = (forgot || reset) ? 'login' : reg ? 'login' : 'register';
          notice = '';
          if (reset) { resetToken = ''; history.replaceState({}, '', location.pathname + location.hash); }
          draw();
        };

        const forgotLink = el.querySelector('#auth-forgot');
        if (forgotLink) forgotLink.onclick = e => { e.preventDefault(); if (busy) return; mode = 'forgot'; notice = ''; resendUntil = 0; draw(); };

        const eye = el.querySelector('[data-auth-eye]');
        if (eye) eye.onclick = () => {
          const input = el.querySelector('#auth-password');
          const show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          eye.innerHTML = `<i data-lucide="${show ? 'eye-off' : 'eye'}"></i>`;
          eye.setAttribute('aria-label', show ? copy.hidePassword : copy.showPassword);
          icons();
        };

        const form = el.querySelector('form');
        form.onsubmit = async e => {
          e.preventDefault();
          if (busy) return;
          const f = Object.fromEntries(new FormData(form));
          if (!form.reportValidity()) return;
          if (!reset) email = String(f.email || '').trim();
          if (forgot && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { draw(copy.invalidEmail || (lang === 'ms' ? 'Sila masukkan alamat e-mel yang sah.' : 'Please enter a valid email address.')); return; }
          if (reset && f.password !== f.confirmPassword) { draw(copy.passwordMismatch); return; }

          busy = true;
          const btn = form.querySelector('.auth-submit');
          btn.disabled = true;
          btn.querySelector('span').textContent = reg ? copy.creating : copy.signing;

          try {
            if (forgot) {
              await UL.api.call('requestPasswordReset', { email });
              busy = false; notice = copy.resetSent;
              resendUntil = Date.now() + 60000;
              draw();
              if (resendTimer) clearInterval(resendTimer);
              resendTimer = setInterval(() => {
                const resendBtn = el.querySelector('.auth-submit');
                if (!resendBtn || mode !== 'forgot') { clearInterval(resendTimer); resendTimer = null; return; }
                const left = Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000));
                resendBtn.disabled = left > 0;
                resendBtn.querySelector('span').textContent = left > 0 ? copy.resendWait.replace('{seconds}', left) : copy.resendReset;
                if (!left) { clearInterval(resendTimer); resendTimer = null; }
              }, 250);
              return;
            }
            if (reset) {
              await UL.api.call('resetPassword', { token: resetToken, password: f.password });
              busy = false; resetToken = ''; history.replaceState({}, '', location.pathname + location.hash);
              mode = 'login'; notice = copy.resetDone; draw(); return;
            }
            const body = { email, password: f.password, timezone: UL.timezone ? UL.timezone.detect() : '' };
            if (reg) {
              const p = UL.prefs;
              body.name = String(f.name || '').trim();
              body.prefs = { font: p.font, theme: p.theme, lang: p.lang, density: p.density, order: p.order, hidden: p.hidden, notif: p.notif };
            }
            const r = await UL.api.call(mode, body);
            localStorage.setItem('ul_token', r.token);
            el.classList.add('auth-exit');
            setTimeout(() => { el.remove(); res(); }, 220);
          } catch (x) {
            busy = false;
            draw(t('err_' + ((x && x.code) || 'server')));
          }
        };
      };

      draw();
    });
  }
};
