// PWA registration + push subscription (Firebase Cloud Messaging). Permission is only ever requested from a user click.
UL.push={
 B:'https://www.gstatic.com/firebasejs/10.12.2/',deferred:null,
 isIOS:()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),
 standalone:()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true,
 platform(){return this.isIOS()?'ios':/android/i.test(navigator.userAgent)?'android':'desktop'},
 supported:()=>'Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window,
 configured:()=>!!(self.UL_PUSH&&UL_PUSH.vapidKey&&UL_PUSH.firebase.apiKey),
 init(){
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))
   addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').catch(()=>{}));
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();this.deferred=e});
 },
 async install(){if(!this.deferred)return;this.deferred.prompt();await this.deferred.userChoice;this.deferred=null},
 load(){const s=u=>new Promise((a,b)=>{const e=document.createElement('script');e.src=u;e.onload=a;e.onerror=b;document.head.append(e)});
  return this._l||(this._l=s(this.B+'firebase-app-compat.js').then(()=>s(this.B+'firebase-messaging-compat.js')))},
 async token(){await this.load();const reg=await navigator.serviceWorker.ready;
  firebase.apps.length||firebase.initializeApp(UL_PUSH.firebase);const m=firebase.messaging();
  
if (!this._fg) {
  this._fg = 1;

  m.onMessage(async p => {
    const d = p.data || {};
    const title = d.title || 'UniLife OS';
    const body = d.body || 'You have a new notification.';

    // Keep the in-app feedback
    UL.ui.toast(title + ': ' + body);

    // Also show native browser notification
    if (Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;

        await reg.showNotification(title, {
          body: body,
          tag: d.tag || 'unilife-notification',
          icon: './assets/icons/icon-192.png',
          badge: './assets/icons/icon-192.png',
          data: {
            url: d.url || '#/dashboard'
          }
        });
      } catch (e) {
        console.error('Native notification failed:', e);
      }
    }
  });
}
  return m.getToken({vapidKey:UL_PUSH.vapidKey,serviceWorkerRegistration:reg})},
 async enable(){
  if(!this.supported())return{error:this.isIOS()&&!this.standalone()?'iosInstall':'pushUnsupported'};
  if(!this.configured())return{error:'err_nopush'};
  const perm=await Notification.requestPermission(); // first await => still inside the click gesture (required by iOS Safari)
  if(perm!=='granted')return{error:'pushDenied'};
  try{const tok=await this.token();if(!tok)return{error:'pushFail'};
   await UL.api.call('pushSubscribe',{token:tok,platform:this.platform()});localStorage.setItem('ul_fcm',tok);return{}}
  catch(e){return{error:e&&e.code&&UL.i18n.dict['err_'+e.code]?'err_'+e.code:'pushFail'}}},
 async unlink(){const tok=localStorage.getItem('ul_fcm');if(!tok)return;
  try{await UL.api.call('pushUnsubscribe',{token:tok})}catch(e){}
  try{window.firebase&&firebase.apps.length&&await firebase.messaging().deleteToken()}catch(e){}
  localStorage.removeItem('ul_fcm')},
 async disable(){await this.unlink();return{}},
 async sync(){ // refresh the device token after login/app start if push is on
  if(!UL.prefs.notif.push||!this.supported()||!this.configured()||Notification.permission!=='granted')return;
  try{const tok=await this.token();if(tok&&tok!==localStorage.getItem('ul_fcm')){await UL.api.call('pushSubscribe',{token:tok,platform:this.platform()});localStorage.setItem('ul_fcm',tok)}}catch(e){}},
 panel(){const t=k=>UL.i18n.t(k);let m='';
  if(!this.configured())m=t('err_nopush');else if(this.isIOS()&&!this.standalone())m=t('iosInstall');
  else if(!this.supported())m=t('pushUnsupported');else if(Notification.permission==='denied')m=t('pushDenied');
  return`<p class="muted" style="margin-bottom:8px">${m||t('pushReady')}</p><div class="row" style="margin-bottom:8px">${UL.prefs.notif.push?`<button class="btn ghost" data-act="pushtest">${t('pushTest')}</button>`:''}${this.deferred?`<button class="btn ghost" data-act="install">${t('installApp')}</button>`:''}</div>`}
};
UL.push.init();
