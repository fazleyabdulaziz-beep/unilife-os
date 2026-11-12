/* UniLife OS UI polish + FocusMate-style focus timer */
(()=>{
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let remaining=25*60, initial=25*60, running=false, interval=null;
 const paint=()=>{const el=document.getElementById('focus-time');if(el)el.textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');
  const b=document.querySelector('[data-act="timer-toggle"]');if(b)b.textContent=running?'Pause focus':'Start focus'};
 const stop=()=>{running=false;if(interval)clearInterval(interval);interval=null;paint()};
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  if(b.dataset.act==='timer-toggle'){
   if(running){stop();return}
   if(remaining<=0)remaining=initial;
   running=true;paint();interval=setInterval(()=>{remaining=Math.max(0,remaining-1);paint();if(!remaining)stop()},1000)
  }else if(b.dataset.act==='timer-reset'){stop();remaining=initial;paint()}
  else if(b.dataset.act==='timer-plus'||b.dataset.act==='timer-minus'){
   if(running)return;
   initial=Math.max(5*60,Math.min(60*60,initial+(b.dataset.act==='timer-plus'?5*60:-5*60)));
   remaining=initial;paint()
  }
 });
 const bar=document.createElement('div');bar.id='topload';document.body.prepend(bar);
 window.UI={busy:on=>document.body.classList.toggle('busy',!!on),toastOut:(el,ms=300)=>{if(!el)return;el.classList.add('out');setTimeout(()=>el.remove(),reduce?0:ms)}};
 if(!reduce){
  const ease=t=>1-Math.pow(1-t,4);
  function count(el){if(el.dataset.counted||el.childNodes.length!==1||el.firstChild.nodeType!==3)return;
   const m=el.textContent.trim().match(/^(-?\d+(?:\.\d+)?)(\D*)$/);if(!m)return;
   el.dataset.counted='1';const end=parseFloat(m[1]),dec=(m[1].split('.')[1]||'').length,suf=m[2],node=el.firstChild,t0=performance.now(),dur=700;
   (function tick(now){const p=Math.min(1,(now-t0)/dur);node.nodeValue=(end*ease(p)).toFixed(dec)+suf;if(p<1)requestAnimationFrame(tick)})(t0)}
  const scan=()=>document.querySelectorAll('.stats b:not([data-counted])').forEach(count);
  const view=document.getElementById('view');if(view)new MutationObserver(()=>requestAnimationFrame(scan)).observe(view,{childList:true,subtree:true});scan()
 }
})();
