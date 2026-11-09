// Run selfTest() from the Apps Script editor, then read View > Logs. It calls the real handlers against your real sheet.
// It leaves two "@test.local" users in Users (delete those rows afterwards).
function selfTest(){
  var log=[];
  function ok(n,c){log.push((c?'PASS ':'FAIL ')+n);if(!c){Logger.log(log.join('\n'));throw new Error('FAIL '+n)}}
  function em(){return 't'+Date.now()+Math.random().toString(36).slice(2,6)+'@test.local'}
  function rq(t,a,d){return handle({action:a,token:t.token,data:d})}
  function code(f){try{f();return null}catch(e){return e.code||String(e)}}
  var A=handle({action:'register',data:{email:em(),password:'Testpass123',name:'A'}}),B=handle({action:'register',data:{email:em(),password:'Testpass123',name:'B'}});
  var id='tst'+Date.now().toString(36),item={id:id,course:'X1',title:'T',due:'2030-01-01',priority:'high',status:'pending',notes:''};
  rq(A,'create',{c:'assignments',item:item});
  ok('create then list',rq(A,'bootstrap').data.assignments.some(function(x){return x.id===id}));
  ok('user B cannot see A data',!rq(B,'bootstrap').data.assignments.some(function(x){return x.id===id}));
  ok('B cannot update A row',code(function(){rq(B,'update',{c:'assignments',item:{id:id,title:'hack'}})})==='notfound');
  ok('B cannot delete A row',code(function(){rq(B,'delete',{c:'assignments',item:{id:id}})})==='notfound');
  ok('bad date rejected',code(function(){rq(A,'create',{c:'assignments',item:{course:'X',title:'T',due:'bad',priority:'high',status:'pending'}})})==='invalid');
  ok('unknown collection rejected',code(function(){rq(A,'create',{c:'Users',item:{}})})==='invalid');
  ok('user_id in body is ignored',(function(){var i2='tst2'+Date.now().toString(36);rq(A,'create',{c:'tasks',user_id:'other',item:{id:i2,title:'t',done:false,user_id:'other'}});return rq(A,'bootstrap').data.tasks.some(function(x){return x.id===i2})&&!rq(B,'bootstrap').data.tasks.some(function(x){return x.id===i2})})());
  ok('bad token rejected',code(function(){handle({action:'bootstrap',token:'nope',data:{}})})==='auth');
  ok('wrong password rejected',code(function(){handle({action:'login',data:{email:'nobody@test.local',password:'wrongwrong1'}})})==='credentials');
  rq(A,'update',{c:'assignments',item:{id:id,status:'done'}});
  ok('update',rq(A,'bootstrap').data.assignments.filter(function(x){return x.id===id})[0].status==='done');
  rq(A,'delete',{c:'assignments',item:{id:id}});
  ok('delete',!rq(A,'bootstrap').data.assignments.some(function(x){return x.id===id}));
  ok('batch import',rq(A,'batchCreate',{c:'exams',items:[{course:'C1',date:'2030-02-01',time:'09:00',venue:'V'}]}).count===1);
  rq(A,'logout',{});ok('logout invalidates token',code(function(){rq(A,'bootstrap')})==='auth');
  Logger.log(log.join('\n'));
}
