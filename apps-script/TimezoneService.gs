function phase1ValidTimezone(value){
  if(typeof value!=='string')throw fail('invalid');
  var timezone=value.trim();
  if(!timezone||timezone.length>64||!/^[A-Za-z0-9_+\-]+(?:\/[A-Za-z0-9_+\-]+)*$/.test(timezone))throw fail('invalid');
  try{Utilities.formatDate(new Date(),timezone,'yyyy-MM-dd HH:mm:ss');}catch(e){throw fail('invalid');}
  return timezone;
}
function phase1MigrateTimezone(){
  var ss=SS(),sheet=ss.getSheetByName('Users');
  if(!sheet)throw new Error('Users sheet not found. Check SPREADSHEET_ID.');
  var lastCol=Math.max(sheet.getLastColumn(),1);
  var headers=sheet.getRange(1,1,1,lastCol).getDisplayValues()[0].map(function(v){return String(v||'').trim();});
  var index=headers.indexOf('timezone');
  if(index>=0)return{changed:false,column:index+1,users:Math.max(0,sheet.getLastRow()-1)};
  var newCol=lastCol+1;sheet.getRange(1,newCol).setNumberFormat('@').setValue('timezone');sheet.setFrozenRows(1);
  return{changed:true,column:newCol,users:Math.max(0,sheet.getLastRow()-1)};
}
function phase1AuditTimezone(){
  var sheet=SS().getSheetByName('Users');if(!sheet)throw new Error('Users sheet not found.');
  var lastCol=Math.max(sheet.getLastColumn(),1),headers=sheet.getRange(1,1,1,lastCol).getDisplayValues()[0];
  var index=headers.indexOf('timezone');
  return{timezoneColumnExists:index>=0,timezoneColumn:index>=0?index+1:null,userRows:Math.max(0,sheet.getLastRow()-1)};
}
function setUserTimezone(uid,data){
  var timezone=phase1ValidTimezone(data&&data.timezone);
  return locked(function(){
    var t=table('Users'),user=t.rows.filter(function(r){return r.id===uid;})[0];
    if(!user)throw fail('auth');
    var col=t.h.indexOf('timezone');if(col<0)throw fail('migration');
    t.s.getRange(user._r,col+1).setNumberFormat('@').setValue(timezone);
    return{timezone:timezone};
  });
}