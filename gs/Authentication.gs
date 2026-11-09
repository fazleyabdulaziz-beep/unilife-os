function sha(s){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8))}
function hmac(m,k){return Utilities.computeHmacSha256Signature(m,k)}
// PBKDF2-HMAC-SHA256 (one 32-byte block) + server-side pepper. Stored as "iterations$hash" so ITER can be raised later.
function hashPw(pw,salt,iter){
  var k=Utilities.newBlob(pw).getBytes(),u=hmac(Utilities.newBlob(salt).getBytes().concat([0,0,0,1]),k),t=u.slice();
  for(var i=1;i<iter;i++){u=hmac(u,k);for(var j=0;j<t.length;j++)t[j]^=u[j]}
  return iter+'$'+Utilities.base64Encode(hmac(t,Utilities.newBlob(prop('PASSWORD_PEPPER')).getBytes()));
}
function verifyPw(pw,salt,stored){
  var iter=parseInt(String(stored).split('$')[0],10)||CFG.ITER,a=hashPw(pw,salt,iter),b=String(stored),d=a.length^b.length;
  for(var i=0;i<a.length;i++)d|=a.charCodeAt(i)^(b.charCodeAt(i)||0);
  return d===0;
}
function testHashTiming(){var t=Date.now();hashPw('Timing123test','salt',CFG.ITER);Logger.log(CFG.ITER+' iterations: '+(Date.now()-t)+' ms')}
function checkPw(p){if(typeof p!=='string'||p.length<10||p.length>128||!/[A-Za-z]/.test(p)||!/\d/.test(p))throw fail('weak')}
function checkEmail(e){if(typeof e!=='string')throw fail('invalid');e=e.trim().toLowerCase();if(e.length>120||!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e))throw fail('invalid');return e}
function newSession(uid){
  var token=Utilities.getUuid()+Utilities.getUuid(),exp=new Date(Date.now()+CFG.SESSION_DAYS*864e5).toISOString();
  append('Sessions',{token_hash:sha(token),user_id:uid,expires_at:exp});
  return token;
}
function authUser(token){
  if(typeof token!=='string'||token.length<30)throw fail('auth');
  var h=sha(token),cache=CacheService.getScriptCache(),c=cache.get('s:'+h);
  if(c)return c;
  var r=table('Sessions').rows.filter(function(x){return x.token_hash===h})[0];
  if(!r||new Date(r.expires_at)<new Date())throw fail('auth');
  cache.put('s:'+h,r.user_id,600);return r.user_id;
}
function logout(token){
  var h=sha(token);CacheService.getScriptCache().remove('s:'+h);
  locked(function(){var t=table('Sessions');t.rows.filter(function(r){return r.token_hash===h}).forEach(function(r){t.s.deleteRow(r._r)})});
  return{};
}
function purgeExpired(){var t=table('Sessions'),now=new Date();t.rows.filter(function(r){return new Date(r.expires_at)<now}).reverse().forEach(function(r){t.s.deleteRow(r._r)})}
function register(d){
  var email=checkEmail(d.email),name=S(80,1)(d.name);checkPw(d.password);
  return locked(function(){
    if(table('Users').rows.some(function(u){return u.email===email}))throw fail('exists');
    var id='u'+newId(),salt=Utilities.getUuid(),y=new Date().getFullYear();
    append('Users',{id:id,email:email,password_hash:hashPw(d.password,salt,CFG.ITER),salt:salt,name:name,university:'',semester:'Semester 1',academic_year:y+'/'+(y+1),total_credits:120,created_at:new Date().toISOString()});
    var base=getPrefs(null).prefs;try{savePrefs(id,d.prefs||{font:base.font,theme:base.theme,lang:base.lang,density:base.density,order:base.order,hidden:[],notif:base.notif})}catch(e){savePrefs(id,{font:base.font,theme:base.theme,lang:base.lang,density:base.density,order:base.order,hidden:[],notif:base.notif})}
    audit(id,'register','user');
    return{token:newSession(id)};
  });
}
function login(d){
  var email=checkEmail(d.email),pw=typeof d.password==='string'?d.password:'';
  if(!pw||pw.length>128)throw fail('credentials');
  var cache=CacheService.getScriptCache(),key='f:'+sha(email),fails=Number(cache.get(key)||0);
  if(fails>=CFG.MAX_FAILS)throw fail('rate');
  var u=table('Users').rows.filter(function(x){return x.email===email})[0];
  var ok=u?verifyPw(pw,u.salt,u.password_hash):(hashPw(pw,'dummy-salt',CFG.ITER),false);
  if(!ok){cache.put(key,String(fails+1),CFG.LOCK_SEC);throw fail('credentials')}
  cache.remove(key);
  var tok=locked(function(){purgeExpired();return newSession(u.id)});audit(u.id,'login','user');
  return{token:tok};
}
function changePassword(uid,token,d){
  checkPw(d.next);
  var t=table('Users'),u=t.rows.filter(function(r){return r.id===uid})[0];
  if(!u||!verifyPw(String(d.current||''),u.salt,u.password_hash))throw fail('credentials');
  var salt=Utilities.getUuid(),h=SCHEMA.Users,row=h.map(function(k){return k==='salt'?salt:k==='password_hash'?hashPw(d.next,salt,CFG.ITER):u[k]});
  t.s.getRange(u._r,1,1,h.length).setValues([row]);
  var keep=sha(token),st=table('Sessions'),cache=CacheService.getScriptCache();
  st.rows.filter(function(r){return r.user_id===uid&&r.token_hash!==keep}).reverse().forEach(function(r){cache.remove('s:'+r.token_hash);st.s.deleteRow(r._r)});
  audit(uid,'password','user');return{};
}
