/* UniLife OS - tiny visual effects (no dependencies). Mouse spotlight on cards. */
(function(){
  var sel='.aihub-tool-card,.aihub-document-card,.aihub-conversation-row';
  document.addEventListener('pointermove',function(e){
    var c=e.target.closest&&e.target.closest(sel);if(!c)return;
    var r=c.getBoundingClientRect();
    c.style.setProperty('--mx',(e.clientX-r.left)+'px');
    c.style.setProperty('--my',(e.clientY-r.top)+'px');
  },{passive:true});
})();
