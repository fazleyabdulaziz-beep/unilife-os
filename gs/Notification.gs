// Push notifications via Firebase Cloud Messaging (HTTP v1).
// One-time setup (see PUSH_SETUP.md):
//   1. Script Properties > FCM_SERVICE_ACCOUNT = the full service-account JSON from Firebase (Project settings > Service accounts).
//   2. Run installTriggers() once from the editor.
// The service-account key lives ONLY in Script Properties. Never put it in the repo.

var PUSH={MAX_TOKENS:5,TEST_COOLDOWN_SEC:30,WINDOW_MIN:30,DIGEST_HOUR:8,KEEP_DAYS:30};
var PUSH_TXT={
  en:{assign:'Assignment due',assignBody:function(t,c,d){return t+(c?' ('+c+')':'')+(d===0?' is due today':' is due tomorrow')},
      cls:'Class starting soon',clsBody:function(c,s,r){return c+' at '+s+(r?' · '+r:'')},
      exam:'Exam coming up',examBody:function(c,d,tm,v){return c+(d===0?' today':d===1?' tomorrow':' in '+d+' days')+' at '+tm+(v?' · '+v:'')},
      fin:'Budget alert',finBody:function(s,b){return 'You have spent RM'+s.toFixed(2)+' this month, over your RM'+b.toFixed(2)+' budget'},
      test:'UniLife OS',testBody:'Push notifications are working'},
  ms:{assign:'Tugasan akan tamat',assignBody:function(t,c,d){return t+(c?' ('+c+')':'')+(d===0?' perlu dihantar hari ini':' perlu dihantar esok')},
      cls:'Kelas bakal bermula',clsBody:function(c,s,r){return c+' pada '+s+(r?' · '+r:'')},
      exam:'Peperiksaan hampir tiba',examBody:function(c,d,tm,v){return c+(d===0?' hari ini':d===1?' esok':' dalam '+d+' hari')+' pada '+tm+(v?' · '+v:'')},
      fin:'Amaran bajet',finBody:function(s,b){return 'Anda telah berbelanja RM'+s.toFixed(2)+' bulan ini, melebihi bajet RM'+b.toFixed(2)},
      test:'UniLife OS',testBody:'Pemberitahuan push berfungsi'}
};

// ---------- API actions ----------
function pushSubscribe(uid,d){
  var tok=d&&d.token,pl=d&&d.platform;
  if(typeof tok!=='string'||tok.length<20||tok.length>4096||/\s/.test(tok))throw fail('invalid');
  if(['ios','android','desktop'].indexOf(pl)<0)throw fail('invalid');
  var t=table('PushSubscriptions'),h=SCHEMA.PushSubscriptions;
  var same=t.rows.filter(function(r){return r.token===tok})[0];
  if(same){ // token already known: (re)assign to this user
    var row={id:same.id,user_id:uid,token:tok,platform:pl,created_at:same.created_at||new Date().toISOString()};
    t.s.getRange(same._r,1,1,h.length).setValues([h.map(function(k){return row[k]})]);
    return;
  }
  var mine=t.rows.filter(function(r){return r.user_id===uid});
  if(mine.length>=PUSH.MAX_TOKENS)t.s.deleteRow(mine[0]._r); // drop the oldest device
  append('PushSubscriptions',{id:newId(),user_id:uid,token:tok,platform:pl,created_at:new Date().toISOString()});
}
function pushUnsubscribe(uid,d){
  var tok=d&&d.token;if(typeof tok!=='string')throw fail('invalid');
  var t=table('PushSubscriptions');
  t.rows.filter(function(r){return r.user_id===uid&&r.token===tok}).map(function(r){return r._r}).sort(function(a,b){return b-a}).forEach(function(r){t.s.deleteRow(r)});
}
function pushTest(uid){
  var cache=CacheService.getScriptCache(),k='pushtest:'+uid;
  if(cache.get(k))throw fail('tooSoon');
  if(!prop('FCM_SERVICE_ACCOUNT'))throw fail('nopush');
  var toks=table('PushSubscriptions').rows.filter(function(r){return r.user_id===uid});
  if(!toks.length)throw fail('nodevice');
  cache.put(k,'1',PUSH.TEST_COOLDOWN_SEC);
  var L=PUSH_TXT[getPrefs(uid).prefs.lang]||PUSH_TXT.en,ok=0;
  toks.forEach(function(r){if(fcmSend(r.token,{title:L.test,body:L.testBody,tag:'test',url:'#/settings'}))ok++});
  if(!ok)throw fail('server');
  return{sent:ok};
}

// ---------- FCM transport ----------
function b64url(s){return Utilities.base64EncodeWebSafe(s).replace(/=+$/,'')}
function fcmAccount(){var raw=prop('FCM_SERVICE_ACCOUNT');if(!raw)throw fail('nopush');try{return JSON.parse(raw)}catch(e){throw fail('nopush')}}
function fcmAccessToken(){
  var cache=CacheService.getScriptCache(),c=cache.get('fcm_at');if(c)return c;
  var sa=fcmAccount(),now=Math.floor(Date.now()/1000);
  var head=b64url(JSON.stringify({alg:'RS256',typ:'JWT'})),
      claim=b64url(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})),
      sig=b64url(Utilities.computeRsaSha256Signature(head+'.'+claim,sa.private_key));
  var r=UrlFetchApp.fetch('https://oauth2.googleapis.com/token',{method:'post',muteHttpExceptions:true,payload:{grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:head+'.'+claim+'.'+sig}});
  var j=JSON.parse(r.getContentText());
  if(!j.access_token){console.error('FCM auth failed: '+r.getContentText());throw fail('server')}
  cache.put('fcm_at',j.access_token,3300);return j.access_token;
}
// Data-only message: the service worker always shows the notification (required on iOS).
function fcmSend(token,m){
  var sa=fcmAccount();
  var r=UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/'+sa.project_id+'/messages:send',{
    method:'post',contentType:'application/json',muteHttpExceptions:true,headers:{Authorization:'Bearer '+fcmAccessToken()},
    payload:JSON.stringify({message:{token:token,data:{title:String(m.title),body:String(m.body),tag:String(m.tag||''),url:String(m.url||'#/dashboard')},webpush:{headers:{Urgency:'high',TTL:'3600'}}}})});
  var code=r.getResponseCode();
  if(code===200)return true;
  if(code===404||code===400&&/UNREGISTERED|INVALID_ARGUMENT/.test(r.getContentText())){removeToken(token);return false} // dead token
  console.error('FCM '+code+': '+r.getContentText());return false;
}
function removeToken(tok){var t=table('PushSubscriptions');t.rows.filter(function(r){return r.token===tok}).map(function(r){return r._r}).sort(function(a,b){return b-a}).forEach(function(r){t.s.deleteRow(r)})}

// ---------- scheduled reminders (time-driven trigger, every 15 min) ----------
function processReminders(){locked(runReminders)} // lock: row positions must not shift under concurrent API writes
function runReminders(){
  if(!prop('FCM_SERVICE_ACCOUNT'))return;
  var tz=Session.getScriptTimeZone(),now=new Date(),
      today=Utilities.formatDate(now,tz,'yyyy-MM-dd'),hour=Number(Utilities.formatDate(now,tz,'H')),
      mins=hour*60+Number(Utilities.formatDate(now,tz,'m')),dow=DAYS[Number(Utilities.formatDate(now,tz,'u'))-1],month=today.slice(0,7);
  function addDays(n){return Utilities.formatDate(new Date(now.getTime()+n*864e5),tz,'yyyy-MM-dd')}
  function diff(d){return Math.round((new Date(d+'T00:00:00Z')-new Date(today+'T00:00:00Z'))/864e5)}
  var subs=table('PushSubscriptions').rows;if(!subs.length)return;
  var users={};subs.forEach(function(s){(users[s.user_id]=users[s.user_id]||[]).push(s.token)});
  var prefRows=table('UserPreferences').rows,
      A=table('Assignments').rows,X=table('Examinations').rows,C=table('Timetable').rows,F=table('Finance').rows,
      nt=table('Notifications'),sent={};
  nt.rows.forEach(function(r){sent[r.user_id+'|'+r.ref_id]=1});
  var queue=[];
  Object.keys(users).forEach(function(uid){
    var pr=prefRows.filter(function(r){return r.user_id===uid})[0],pf=getPrefs(uid),n=pf.prefs.notif;
    if(!pr||!n.push)return;
    var L=PUSH_TXT[pf.prefs.lang]||PUSH_TXT.en;
    function add(type,key,title,body,url){var k=type+':'+key;if(sent[uid+'|'+k])return;queue.push({uid:uid,type:type,key:k,title:title,body:body,url:url,tokens:users[uid]})}
    if(hour>=PUSH.DIGEST_HOUR){
      if(n.assignments)A.filter(function(r){return r.user_id===uid&&r.status!=='done'&&/^\d{4}-\d{2}-\d{2}$/.test(r.due)}).forEach(function(r){var d=diff(r.due);if(d===0||d===1)add('assign',r.id+':'+r.due+':'+today,L.assign,L.assignBody(r.title,r.course,d),'#/assignments')});
      if(n.exams)X.filter(function(r){return r.user_id===uid&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)}).forEach(function(r){var d=diff(r.date);if(d>=0&&d<=2)add('exam',r.id+':'+r.date+':'+d,L.exam,L.examBody(r.course,d,r.time,r.venue),'#/exams')});
      if(n.finance){
        var spent=0;F.forEach(function(r){if(r.user_id===uid&&r.kind==='tx'&&r.type==='expense'&&String(r.date).slice(0,7)===month)spent+=Number(r.amount)||0});
        var bud=Number(pf.extra.budget)||0;
        if(bud>0&&spent>bud)add('fin',month,L.fin,L.finBody(spent,bud),'#/finance');
      }
    }
    if(n.classes)C.filter(function(r){return r.user_id===uid&&r.day===dow&&/^\d{2}:\d{2}$/.test(r.start)}).forEach(function(r){
      var s=Number(r.start.slice(0,2))*60+Number(r.start.slice(3)),left=s-mins;
      if(left>0&&left<=PUSH.WINDOW_MIN)add('cls',r.id+':'+today,L.cls,L.clsBody(r.course,r.start,r.room),'#/timetable')});
  });
  queue.forEach(function(q){
    var ok=false;
    q.tokens.forEach(function(tk){try{if(fcmSend(tk,{title:q.title,body:q.body,tag:q.key,url:q.url}))ok=true}catch(e){console.error(e)}});
    append('Notifications',{id:newId(),user_id:q.uid,type:q.type,ref_id:q.key,fire_at:today,sent_at:new Date().toISOString(),status:ok?'sent':'failed',attempts:1});
  });
  purgeNotifications(nt,addDays(-PUSH.KEEP_DAYS));
}
function purgeNotifications(nt,cutoff){
  var old=nt.rows.filter(function(r){return r.fire_at&&String(r.fire_at)<cutoff}).map(function(r){return r._r}).sort(function(a,b){return b-a});
  old.forEach(function(r){nt.s.deleteRow(r)});
}
// Run ONCE from the editor.
function installTriggers(){
  ScriptApp.getProjectTriggers().forEach(function(t){var f=t.getHandlerFunction();if(f==='processReminders'||f==='purgeExpired')ScriptApp.deleteTrigger(t)});
  ScriptApp.newTrigger('processReminders').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('purgeExpired').timeBased().everyDays(1).atHour(3).create();
  Logger.log('Triggers installed.');
}
