function coll(c){if(typeof c!=='string'||!Object.prototype.hasOwnProperty.call(COLL,c))throw fail('invalid');return c}
function handle(req){
  var a=req.action,d=req.data&&typeof req.data==='object'?req.data:{};
  if(a==='register')return register(d);
  if(a==='login')return login(d);
  var uid=authUser(req.token); // user id ALWAYS comes from the session, never from the request body
  switch(a){
    case 'logout':return logout(req.token);
    case 'bootstrap':return bootstrap(uid);
    case 'create':{var cn=coll(d.c),id=locked(function(){return dbCreate(cn,uid,d.item)});audit(uid,'create',cn);return{id:id}}
    case 'update':{var cu=coll(d.c);locked(function(){dbUpdate(cu,uid,d.item)});audit(uid,'update',cu);return{}}
    case 'delete':{var cd=coll(d.c);locked(function(){dbDelete(cd,uid,d.item&&d.item.id)});audit(uid,'delete',cd);return{}}
    case 'batchCreate':{
      var cb=coll(d.c),items=d.items;
      if(!Array.isArray(items)||!items.length||items.length>CFG.MAX_ROWS)throw fail('invalid');
      items.forEach(function(i){clean(COLL[cb],i,false)}); // validate everything before writing anything
      locked(function(){items.forEach(function(i){dbCreate(cb,uid,{...i,id:undefined})})});
      audit(uid,'import',cb);return{count:items.length};
    }
    case 'savePrefs':locked(function(){savePrefs(uid,d)});return{};
    case 'updateProfile':return locked(function(){return updateProfile(uid,d)});
    case 'changePassword':return locked(function(){return changePassword(uid,req.token,d)});
    default:throw fail('invalid');
  }
}
function userOut(u){return{name:u.name,email:u.email,university:u.university,semester:u.semester,year:u.academic_year,totalCredits:Number(u.total_credits)||120}}
function bootstrap(uid){
  var u=table('Users').rows.filter(function(r){return r.id===uid})[0];if(!u)throw fail('auth');
  var p=getPrefs(uid),data={};
  Object.keys(COLL).forEach(function(k){data[k]=dbList(k,uid)});
  data.budget=p.extra.budget;data.study=p.extra.study;
  return{user:userOut(u),prefs:p.prefs,data:data};
}
function getPrefs(uid){
  var base={font:'Inter',theme:'light',lang:'en',density:'comfortable',order:WIDGETS.slice(),hidden:[],notif:{push:false,assignments:true,classes:true,exams:true,finance:true}};
  var ex={budget:800,study:[0,0,0,0,0,0,0]};
  var r=uid?table('UserPreferences').rows.filter(function(x){return x.user_id===uid})[0]:null;
  if(!r)return{prefs:base,extra:ex};
  return{prefs:{font:r.font||base.font,theme:r.theme||base.theme,lang:r.lang||base.lang,density:r.density||base.density,order:safeJson(r.widget_order,base.order),hidden:safeJson(r.widget_hidden,[]),notif:Object.assign({},base.notif,safeJson(r.notif_json,{}))},extra:Object.assign({},ex,safeJson(r.extra_json,{}))};
}
function savePrefs(uid,d){
  var cur=getPrefs(uid);
  function list(v){if(!Array.isArray(v)||v.length>WIDGETS.length)throw fail('invalid');v.forEach(function(x){if(WIDGETS.indexOf(x)<0)throw fail('invalid')});return v.filter(function(x,i){return v.indexOf(x)===i})}
  var n=d.notif||{},notif={};
  ['push','assignments','classes','exams','finance'].forEach(function(k){if(typeof n[k]!=='boolean')throw fail('invalid');notif[k]=n[k]});
  var ex=cur.extra;
  if(d.extra){
    if(!Array.isArray(d.extra.study)||d.extra.study.length!==7)throw fail('invalid');
    ex={budget:N(0,1e7)(d.extra.budget),study:d.extra.study.map(N(0,24))};
  }
  var o={user_id:uid,font:E(FONTS)(d.font),theme:E(['light','dark','system'])(d.theme),lang:E(['en','ms'])(d.lang),density:E(['comfortable','compact'])(d.density),
    widget_order:JSON.stringify(list(d.order)),widget_hidden:JSON.stringify(list(d.hidden)),notif_json:JSON.stringify(notif),extra_json:JSON.stringify(ex)};
  var t=table('UserPreferences'),r=t.rows.filter(function(x){return x.user_id===uid})[0],h=SCHEMA.UserPreferences;
  if(r)t.s.getRange(r._r,1,1,h.length).setValues([h.map(function(k){return o[k]})]);else append('UserPreferences',o);
}
function updateProfile(uid,d){
  var v={name:S(80,1)(d.name),university:S(120,0)(d.university),semester:S(40,0)(d.semester),academic_year:S(20,0)(d.year)};
  var t=table('Users'),u=t.rows.filter(function(r){return r.id===uid})[0],h=SCHEMA.Users;
  if(!u)throw fail('auth');
  t.s.getRange(u._r,1,1,h.length).setValues([h.map(function(k){return v[k]!==undefined?v[k]:u[k]})]);
  u=Object.assign({},u,v);audit(uid,'profile','user');return userOut(u);
}
