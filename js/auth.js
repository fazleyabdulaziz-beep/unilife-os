/* UniLife OS — animated authentication screen. Keeps the existing API/auth contract. */
UL.auth={show(){return new Promise(res=>{
  const t=k=>UL.i18n.t(k);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let mode='login',email='',busy=false;
  const el=document.createElement('div');el.className='authwrap';el.setAttribute('role','presentation');
  document.body.append(el);
  const icons=()=>{if(window.lucide&&typeof window.lucide.createIcons==='function')window.lucide.createIcons({attrs:{'stroke-width':1.8}})};
  const draw=(err='')=>{
    const reg=mode==='register';
    el.innerHTML=`
      <div class="auth-atmosphere" aria-hidden="true">
        <span class="auth-orb auth-orb-a"></span><span class="auth-orb auth-orb-b"></span><span class="auth-orb auth-orb-c"></span>
        <span class="auth-grid"></span>
      </div>
      <div class="auth-shell">
        <section class="auth-showcase" aria-label="UniLife OS introduction">
          <div class="auth-brand"><span class="auth-brand-mark"><img src="assets/icons/icon-192.png" alt="UniLife OS logo"></span><span>UniLife <b>OS</b></span></div>
          <div class="auth-showcase-copy">
            <span class="auth-eyebrow"><i data-lucide="sparkles"></i> YOUR SPACE TO GROW</span>
            <h1>Make room for<br><span>what matters.</span></h1>
            <p>Your campus life, thoughtfully organised. Keep your plans clear, your goals close, and your progress moving.</p>
          </div>
          <div class="auth-preview" aria-hidden="true">
            <div class="auth-preview-top"><span class="auth-live-dot"></span><span>YOUR WEEK, IN FOCUS</span><i data-lucide="ellipsis"></i></div>
            <div class="auth-preview-title">A little progress adds up.</div>
            <div class="auth-preview-sub">Your study rhythm at a glance</div>
            <div class="auth-progress-row"><span>Weekly focus</span><b>72%</b></div>
            <div class="auth-progress"><i></i></div>
            <div class="auth-preview-bottom"><span><i data-lucide="calendar-check"></i> Classes organised</span><span><i data-lucide="target"></i> Goals in sight</span></div>
          </div>
          <div class="auth-footnote"><span>STUDY WITH INTENTION</span><span class="auth-footline"></span><span>GROW AT YOUR PACE</span></div>
        </section>
        <section class="auth-panel">
          <div class="auth-mobile-brand"><span class="auth-brand-mark"><img src="assets/icons/icon-192.png" alt="UniLife OS logo"></span><span>UniLife <b>OS</b></span></div>
          <div class="auth-card">
            <div class="auth-card-heading"><span class="auth-card-icon"><i data-lucide="${reg?'user-round-plus':'hand' }"></i></span><span class="auth-step">${reg?'GET STARTED':'WELCOME BACK'}</span></div>
            <h2>${reg?'Create your space':'Good to see you.'}</h2>
            <p class="auth-subtitle">${reg?'Set up your account and make campus life feel a little lighter.':'Sign in and pick up right where you left off.'}</p>
            <form class="auth-form" novalidate>
              ${reg?`<label class="auth-field"><span>${t('student')}</span><span class="auth-input-wrap"><i data-lucide="user-round"></i><input name="name" required maxlength="80" autocomplete="name" placeholder="Your name"></span></label>`:''}
              <label class="auth-field"><span>${t('email')}</span><span class="auth-input-wrap"><i data-lucide="mail"></i><input name="email" type="email" required maxlength="120" autocomplete="email" placeholder="you@example.com" value="${esc(email)}"></span></label>
              <label class="auth-field"><span>${t('pwd')}</span><span class="auth-input-wrap"><i data-lucide="lock-keyhole"></i><input name="password" id="auth-password" type="password" required minlength="${reg?10:1}" maxlength="128" autocomplete="${reg?'new-password':'current-password'}" placeholder="${reg?'Create a strong password':'Enter your password'}"><button class="auth-eye" type="button" aria-label="Show password" data-auth-eye><i data-lucide="eye"></i></button></span></label>
              ${reg?`<div class="auth-password-hint"><i data-lucide="shield-check"></i>${t('pwdHint')}</div>`:''}
              <p class="auth-error" role="alert" aria-live="polite">${esc(err)}</p>
              <button class="auth-submit" type="submit"><span>${t(mode)}</span><i data-lucide="arrow-right"></i></button>
            </form>
            <div class="auth-switch">${reg?'Already have an account?':'New to UniLife OS?'} <a href="#" id="auth-switch">${t(reg?'haveAccount':'noAccount')}</a></div>
          </div>
          <div class="auth-panel-footer"><span>UNI LIFE, IN BALANCE.</span><span>MADE FOR YOUR NEXT CHAPTER <i data-lucide="arrow-up-right"></i></span></div>
        </section>
      </div>`;
    icons();
    const switchLink=el.querySelector('#auth-switch');
    switchLink.onclick=e=>{e.preventDefault();if(busy)return;mode=reg?'login':'register';draw()};
    const eye=el.querySelector('[data-auth-eye]');
    eye.onclick=()=>{const input=el.querySelector('#auth-password'),show=input.type==='password';input.type=show?'text':'password';eye.setAttribute('aria-label',show?'Hide password':'Show password');eye.innerHTML=`<i data-lucide="${show?'eye-off':'eye'}"></i>`;icons()};
    const form=el.querySelector('form');
    form.onsubmit=async e=>{
      e.preventDefault();if(busy)return;
      const f=Object.fromEntries(new FormData(form));email=String(f.email||'').trim();
      if(!form.reportValidity())return;
      busy=true;const b=form.querySelector('.auth-submit');b.disabled=true;b.classList.add('is-loading');b.querySelector('span').textContent=reg?'Creating account…':'Signing in…';
      try{
        const body={email,password:f.password};
        if(reg){const p=UL.prefs;body.name=String(f.name||'').trim();body.prefs={font:p.font,theme:p.theme,lang:p.lang,density:p.density,order:p.order,hidden:p.hidden,notif:p.notif}}
        const r=await UL.api.call(mode,body);localStorage.setItem('ul_token',r.token);
        el.classList.add('auth-exit');setTimeout(()=>{el.remove();res()},220);
      }catch(x){busy=false;draw(t('err_'+((x&&x.code)||'server')))}
    };
  };
  draw();
})}};
