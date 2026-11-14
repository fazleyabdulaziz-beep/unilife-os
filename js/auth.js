/* UniLife OS — Calm, adaptive authentication */
UL.auth = {
  show() {
    return new Promise(res => {
      const t = k => UL.i18n.t(k);
      const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
      );

      let mode = 'login';
      let email = '';
      let busy = false;

      const setPreference = async (key, value) => {
        UL.prefs[key] = value;
        try {
          localStorage.setItem('ul_prefs', JSON.stringify(UL.prefs));
        } catch (_) {}
        if (key === 'lang') await UL.i18n.load(value);
        if (key === 'theme') {
          const root = document.documentElement;
          root.dataset.theme = value === 'dark' ? 'dark' : 'light';
          root.dataset.palette = UL.prefs.palette || 'lavender';
        }
        draw();
      };

      document.documentElement.dataset.palette = UL.prefs.palette || 'lavender';
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
          light: 'Cerah'
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
          light: 'Light'
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
                <h1>${reg ? copy.registerTitle : copy.loginTitle}</h1>
                <p>${reg ? copy.registerSub : copy.loginSub}</p>
              </div>

              <form class="auth-form" novalidate>
                ${reg ? `
                  <label class="auth-field">
                    <span>${copy.name}</span>
                    <input name="name" required maxlength="80"
                      autocomplete="name" placeholder="${copy.namePlaceholder}">
                  </label>
                ` : ''}

                <label class="auth-field">
                  <span>${copy.email}</span>
                  <input name="email" type="email" required maxlength="120"
                    autocomplete="email" placeholder="you@example.com"
                    value="${esc(email)}">
                </label>

                <label class="auth-field">
                  <span>${copy.password}</span>
                  <div class="auth-simple-password">
                    <input name="password" id="auth-password" type="password"
                      required minlength="${reg ? 10 : 1}" maxlength="128"
                      autocomplete="${reg ? 'new-password' : 'current-password'}"
                      placeholder="${copy.passwordPlaceholder}">
                    <button type="button" class="auth-eye" data-auth-eye
                      aria-label="Show password"><i data-lucide="eye"></i></button>
                  </div>
                </label>

                ${reg ? `<p class="auth-password-hint">${t('pwdHint')}</p>` : ''}
                <p class="auth-error" role="alert" aria-live="polite">${esc(err)}</p>

                <button class="auth-submit" type="submit">
                  <span>${reg ? copy.register : copy.login}</span>
                  <i data-lucide="arrow-right"></i>
                </button>
              </form>

              <div class="auth-switch">
                ${reg ? copy.existing : copy.new}
                <a href="#" id="auth-switch">${reg ? copy.switchLogin : copy.switchRegister}</a>
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
          mode = reg ? 'login' : 'register';
          draw();
        };

        const eye = el.querySelector('[data-auth-eye]');
        eye.onclick = () => {
          const input = el.querySelector('#auth-password');
          const show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          eye.innerHTML = `<i data-lucide="${show ? 'eye-off' : 'eye'}"></i>`;
          eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
          icons();
        };

        const form = el.querySelector('form');
        form.onsubmit = async e => {
          e.preventDefault();
          if (busy) return;
          const f = Object.fromEntries(new FormData(form));
          email = String(f.email || '').trim();
          if (!form.reportValidity()) return;

          busy = true;
          const btn = form.querySelector('.auth-submit');
          btn.disabled = true;
          btn.querySelector('span').textContent = reg ? copy.creating : copy.signing;

          try {
            const body = { email, password: f.password };
            if (reg) {
              const p = UL.prefs;
              body.name = String(f.name || '').trim();
              body.prefs = {
                font: p.font, theme: p.theme, lang: p.lang,
                density: p.density, order: p.order,
                hidden: p.hidden, notif: p.notif
              };
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
