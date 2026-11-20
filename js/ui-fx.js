/* UniLife OS - cursor spotlight on cards (pure visual, no dependencies) */
(function(){
  var sel='.card,.campus-card,.aihub-suggestion,.aihub-document-card';
  document.addEventListener('pointermove',function(e){
    var c=e.target.closest&&e.target.closest(sel);if(!c)return;
    var r=c.getBoundingClientRect();
    c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px');
  },{passive:true});
})();
