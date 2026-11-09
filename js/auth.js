UL.auth={show(){return new Promise(res=>{
  const t=k=>UL.i18n.t(k),q=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  let mode='login',email='';const el=document.createElement('div');el.className='authwrap';document.body.append(el);
  const draw=(err='')=>{const reg=mode==='register';
   el.innerHTML=`<form class="dlg"><h3>UniLife OS</h3><p class="muted" style="margin-bottom:14px">${t('tagline')}</p>${reg?`<label class="field">${t('student')}<input name="name" required maxlength="80" autocomplete="name"></label>`:''}<label class="field">${t('email')}<input name="email" type="email" required maxlength="120" autocomplete="email" value="${q(email)}"></label><label class="field">${t('pwd')}<input name="password" type="password" required minlength="${reg?10:1}" maxlength="128" autocomplete="${reg?'new-password':'current-password'}"></label>${reg?`<small class="muted">${t('pwdHint')}</small>`:''}<p class="bad" role="alert" style="min-height:1.4em">${err}</p><button class="btn" style="width:100%;justify-content:center">${t(mode)}</button><p style="margin-top:14px"><a href="#" id="sw">${t(reg?'haveAccount':'noAccount')}</a></p></form>`;
   el.querySelector('#sw').onclick=e=>{e.preventDefault();mode=reg?'login':'register';draw()};
   el.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('.btn');b.disabled=true;
    const f=Object.fromEntries(new FormData(e.target));email=f.email.trim();
    try{const body={email,password:f.password};
     if(reg){const p=UL.prefs;body.name=f.name.trim();body.prefs={font:p.font,theme:p.theme,lang:p.lang,density:p.density,order:p.order,hidden:p.hidden,notif:p.notif}}
     const r=await UL.api.call(mode,body);localStorage.setItem('ul_token',r.token);el.remove();res()}
    catch(x){draw(t('err_'+(x.code||'server')))}}};
  draw()})}};
