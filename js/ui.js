/* UniLife OS — fluid interaction layer
   Visual-only enhancements. Does not modify API, auth, data or storage. */
(()=>{
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const view=document.getElementById('view');
  const topbar=document.querySelector('.topbar');
  const bar=document.createElement('div');
  bar.id='topload';
  if(!document.getElementById('topload'))document.body.prepend(bar);

  window.UI={
    busy:on=>document.body.classList.toggle('busy',!!on),
    toastOut:(el,ms=260)=>{
      if(!el)return;
      el.classList.add('out');
      window.setTimeout(()=>el.remove(),reduce?0:ms);
    }
  };

  if(topbar){
    const update=()=>topbar.classList.toggle('scrolled',window.scrollY>12);
    window.addEventListener('scroll',update,{passive:true});
    update();
  }

  if(!view||reduce)return;
  let frame=0;
  const animateView=()=>{
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      view.classList.remove('ui-enter');
      void view.offsetWidth;
      view.classList.add('ui-enter');
      view.querySelectorAll('.card').forEach((card,index)=>{
        card.style.setProperty('--i',Math.min(index,8));
      });
    });
  };
  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.addedNodes.length))animateView();
  });
  observer.observe(view,{childList:true});
  animateView();

  // Gentle count-up for plain numeric dashboard values only.
  const counted=new WeakSet();
  const countUp=el=>{
    if(counted.has(el)||el.children.length||!el.textContent.trim())return;
    const match=el.textContent.trim().match(/^(-?\d+(?:\.\d+)?)(\D*)$/);
    if(!match)return;
    counted.add(el);
    const end=Number(match[1]),decimals=(match[1].split('.')[1]||'').length,suffix=match[2];
    const start=performance.now(),duration=650;
    const tick=now=>{
      const p=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-p,4);
      el.textContent=(end*eased).toFixed(decimals)+suffix;
      if(p<1)requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const scan=()=>view.querySelectorAll('.stats b').forEach(countUp);
  new MutationObserver(()=>requestAnimationFrame(scan)).observe(view,{childList:true,subtree:true});
  scan();
})();
