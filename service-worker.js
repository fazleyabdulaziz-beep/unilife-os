// Bump V on every deploy so clients drop the old app shell.
const V='unilife-v3',FB='https://www.gstatic.com/firebasejs/10.12.2/';
const SHELL=['./','index.html','manifest.json','css/themes.css','css/main.css','js/config.js','js/push-config.js','js/data.js','js/api.js','js/i18n.js','js/auth.js','js/importer.js','js/notifications.js','js/app.js','locales/en.json','locales/ms.json','assets/icons/icon-192.png','assets/icons/icon-512.png'];
const CDN=['unpkg.com','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com','www.gstatic.com'];
try{importScripts('js/push-config.js')}catch(e){}
try{importScripts(FB+'firebase-app-compat.js',FB+'firebase-messaging-compat.js');
 if(self.UL_PUSH&&self.UL_PUSH.firebase.apiKey){firebase.initializeApp(self.UL_PUSH.firebase);
  // Always show a notification for every push (iOS revokes permission for silent pushes).
  firebase.messaging().onBackgroundMessage(p=>{const d=p.data||{};
   return self.registration.showNotification(d.title||'UniLife OS',{body:d.body||'',tag:d.tag||undefined,icon:'assets/icons/icon-192.png',badge:'assets/icons/icon-192.png',data:{url:d.url||'#/dashboard'}})})}
}catch(e){}
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.allSettled(SHELL.map(u=>c.add(u)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
const swr=(r)=>caches.match(r).then(h=>{const n=fetch(r).then(x=>{if(x.ok||x.type==='opaque')caches.open(V).then(k=>k.put(r,x.clone()));return x}).catch(()=>h);return h||n});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.origin===location.origin){
  if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(V).then(k=>k.put('index.html',c));return x}).catch(()=>caches.match('index.html')));return}
  e.respondWith(swr(r));return}
 if(CDN.includes(u.hostname))e.respondWith(swr(r)); // API calls (script.google.com, FCM) are never cached
});
self.addEventListener('notificationclick',e=>{e.notification.close();
 const url=new URL((e.notification.data&&e.notification.data.url)||'#/dashboard',self.registration.scope).href;
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
  for(const c of l)if(c.url.startsWith(self.registration.scope)&&'focus' in c){if(c.navigate)c.navigate(url);return c.focus()}
  return self.clients.openWindow(url)}))});
