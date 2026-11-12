
/* UniLife OS — Minimal Authentication */
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

      const el = document.createElement('div');
      el.className = 'authwrap auth-simple';
      document.body.append(el);

      const icons = () => {
        if (window.lucide?.createIcons) {
          window.lucide.createIcons({
            attrs: { 'stroke-width': 1.8 }
          });
        }
      };

      const draw = (err = '') => {
        const reg = mode === 'register';

        el.innerHTML = `
          <main class="auth-simple-shell">
            <div class="auth-simple-brand">
              <img src="assets/icons/icon-192.png"
                   alt="UniLife OS">
              <span>UniLife <b>OS</b></span>
            </div>

            <section class="auth-simple-card">
              <div class="auth-simple-heading">
                <span class="auth-simple-label">
                  ${reg ? 'GET STARTED' : 'WELCOME BACK'}
                </span>

                <h1>
                  ${reg ? 'Create your account.' : 'Good to see you.'}
                </h1>

                <p>
                  ${reg
                    ? 'Start organising your campus life.'
                    : 'Sign in to continue your journey.'}
                </p>
              </div>

              <form class="auth-form" novalidate>
                ${reg ? `
                  <label class="auth-field">
                    <span>${t('student')}</span>
                    <input name="name"
                      required maxlength="80"
                      autocomplete="name"
                      placeholder="Your name">
                  </label>
                ` : ''}

                <label class="auth-field">
                  <span>${t('email')}</span>
                  <input name="email"
                    type="email"
                    required maxlength="120"
                    autocomplete="email"
                    placeholder="you@example.com"
                    value="${esc(email)}">
                </label>

                <label class="auth-field">
                  <span>${t('pwd')}</span>
                  <div class="auth-simple-password">
                    <input name="password"
                      id="auth-password"
                      type="password"
                      required minlength="${reg ? 10 : 1}"
                      maxlength="128"
                      autocomplete="${reg ? 'new-password' : 'current-password'}"
                      placeholder="${reg ? 'Create a password' : 'Enter your password'}">

                    <button type="button"
                      class="auth-eye"
                      data-auth-eye
                      aria-label="Show password">
                      <i data-lucide="eye"></i>
                    </button>
                  </div>
                </label>

                ${reg ? `
                  <p class="auth-password-hint">
                    ${t('pwdHint')}
                  </p>
                ` : ''}

                <p class="auth-error"
                   role="alert"
                   aria-live="polite">${esc(err)}</p>

                <button class="auth-submit" type="submit">
                  <span>${t(mode)}</span>
                  <i data-lucide="arrow-right"></i>
                </button>
              </form>

              <div class="auth-switch">
                ${reg ? 'Already have an account?' : 'New to UniLife OS?'}
                <a href="#" id="auth-switch">
                  ${t(reg ? 'haveAccount' : 'noAccount')}
                </a>
              </div>
            </section>

            <footer class="auth-simple-footer">
              Made for your next chapter.
            </footer>
          </main>
        `;

        icons();

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
          btn.querySelector('span').textContent =
            reg ? 'Creating account…' : 'Signing in…';

          try {
            const body = {
              email,
              password: f.password
            };

            if (reg) {
              const p = UL.prefs;
              body.name = String(f.name || '').trim();
              body.prefs = {
                font: p.font,
                theme: p.theme,
                lang: p.lang,
                density: p.density,
                order: p.order,
                hidden: p.hidden,
                notif: p.notif
              };
            }

            const r = await UL.api.call(mode, body);
            localStorage.setItem('ul_token', r.token);

            el.classList.add('auth-exit');
            setTimeout(() => {
              el.remove();
              res();
            }, 180);

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
