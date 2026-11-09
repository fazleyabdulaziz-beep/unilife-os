function SS(){return SpreadsheetApp.openById(prop('SPREADSHEET_ID'))}
function locked(f){var l=LockService.getScriptLock();l.waitLock(15000);try{return f()}finally{l.releaseLock()}}
function safeJson(v,f){try{var x=JSON.parse(v);return x==null?f:x}catch(e){return f}}
// Every cell is plain text ('@'): blocks formula injection and date auto-conversion. Values are coerced on read.
function ensureSheets(ss){
  Object.keys(SCHEMA).forEach(function(n){
    var s=ss.getSheetByName(n)||ss.insertSheet(n),h=SCHEMA[n];
    s.getRange(1,1,s.getMaxRows(),h.length).setNumberFormat('@');
    s.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold');
    s.setFrozenRows(1);
  });
  var d=ss.getSheetByName('Sheet1');if(d&&d.getLastRow()===0&&ss.getSheets().length>1)ss.deleteSheet(d);
}
function table(n){
  var s=SS().getSheetByName(n),v=s.getDataRange().getValues(),h=v.shift();
  return{s:s,h:h,rows:v.map(function(r,i){var o={_r:i+2};h.forEach(function(k,j){o[k]=r[j]});return o})};
}
function append(n,o){
  var s=SS().getSheetByName(n),h=SCHEMA[n],r=s.getLastRow()+1;
  if(r>s.getMaxRows())s.insertRowsAfter(s.getMaxRows(),100);
  var g=s.getRange(r,1,1,h.length);g.setNumberFormat('@');
  g.setValues([h.map(function(k){return o[k]==null?'':o[k]})]);
}
function ser(v,x){return v.t==='b'?String(x):v.t==='j'?JSON.stringify(x):x}
function clean(c,item,partial){
  if(!item||typeof item!=='object')throw fail('invalid');
  var o={};
  Object.keys(c.f).forEach(function(k){
    var v=c.f[k];
    if(item[k]===undefined){
      if(partial)return;
      if(v.def!==undefined){o[k]=ser(v,v.def);return}
      if(!v.opt)throw fail('invalid');
      return;
    }
    o[k]=ser(v,v(item[k]));
  });
  return o;
}
function out(c,r){
  var o={id:String(r.id)};
  Object.keys(c.f).forEach(function(k){
    var t=c.f[k].t,v=r[k];
    o[k]=t==='n'?Number(v):t==='b'?String(v).toLowerCase()==='true':t==='j'?safeJson(v,[]):String(v==null?'':v);
  });
  return o;
}
function mine(c,r,uid){return r.user_id===uid&&(!c.kind||r.kind===c.kind)}
function dbList(cn,uid){var c=COLL[cn];return table(c.sheet).rows.filter(function(r){return mine(c,r,uid)}).map(function(r){return out(c,r)})}
function newId(){return Utilities.getUuid().replace(/-/g,'').slice(0,12)}
function dbCreate(cn,uid,item,rows){
  var c=COLL[cn],o=clean(c,item,false),id=item.id;
  if(typeof id==='string'&&/^[a-z0-9]{6,20}$/.test(id)){
    if(table(c.sheet).rows.some(function(r){return String(r.id)===id}))throw fail('conflict');
  }else id=newId();
  o.id=id;o.user_id=uid;if(c.kind)o.kind=c.kind;
  append(c.sheet,o);return id;
}
function findRow(cn,uid,id){
  var c=COLL[cn],t=table(c.sheet);
  var r=typeof id==='string'?t.rows.filter(function(r){return String(r.id)===id&&mine(c,r,uid)})[0]:null;
  if(!r)throw fail('notfound');
  return{c:c,t:t,r:r};
}
function dbUpdate(cn,uid,item){
  if(!item)throw fail('invalid');
  var f=findRow(cn,uid,item.id),o=clean(f.c,item,true),h=f.t.h;
  var row=h.map(function(k){return o[k]!==undefined?o[k]:f.r[k]});
  f.t.s.getRange(f.r._r,1,1,h.length).setValues([row]);
}
function dbDelete(cn,uid,id){var f=findRow(cn,uid,id);f.t.s.deleteRow(f.r._r)}
function audit(uid,action,entity){try{append('ActivityLogs',{id:newId(),user_id:uid,action:action,entity:entity,at:new Date().toISOString()})}catch(e){console.error(e)}}
