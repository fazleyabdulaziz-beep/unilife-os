/* Optional, non-destructive polish for the Student Life OS.
   Add before </body>:  <script src="ui.js" defer></script>
   - count-up animation for numbers in .stats b
   - UI.busy(true/false) drives the top loading bar
   - UI.toastOut(el) fades a toast out before you remove it
   Nothing here touches your data, auth or Apps Script calls. */
(()=>{
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let bar=document.getElementById('topload');
  if(!bar){bar=document.createElement('div');bar.id='topload';document.body.prepend(bar)}
  window.UI={
    busy:on=>document.body.classList.toggle('busy',!!on),
    toastOut:(el,ms=300)=>{if(!el)return;el.classList.add('out');setTimeout(()=>el.remove(),reduce?0:ms)}
  };
  if(reduce)return;
  const ease=t=>1-Math.pow(1-t,4);
  function count(el){
    if(el.dataset.counted||el.childNodes.length!==1||el.firstChild.nodeType!==3)return;
    const m=el.textContent.trim().match(/^(-?\d+(?:\.\d+)?)(\D*)$/);
    if(!m)return;
    el.dataset.counted='1';
    const end=parseFloat(m[1]),dec=(m[1].split('.')[1]||'').length,suf=m[2],node=el.firstChild,t0=performance.now(),dur=900;
    (function tick(now){
      const p=Math.min(1,(now-t0)/dur),v=end*ease(p);
      node.nodeValue=v.toFixed(dec)+suf;
      if(p<1)requestAnimationFrame(tick);
    })(t0);
  }
  const scan=()=>document.querySelectorAll('.stats b:not([data-counted])').forEach(count);
  const view=document.getElementById('view');
  if(view)new MutationObserver(()=>requestAnimationFrame(scan)).observe(view,{childList:true,subtree:true});
  scan();
})();