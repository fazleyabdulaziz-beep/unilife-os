const CFG={VERSION:'2.0.0',ITER:3000,SESSION_DAYS:14,MAX_FAILS:5,LOCK_SEC:900,MAX_ROWS:100};
const WIDGETS=['academic','schedule','assignments','exams','finance','productivity'];
const FONTS=['Inter','Poppins','Roboto','Nunito','Plus Jakarta Sans','DM Sans','Lato'];
const SCHEMA={
  Users:['id','email','password_hash','salt','name','university','semester','academic_year','total_credits','created_at'],
  UserPreferences:['user_id','font','theme','lang','density','widget_order','widget_hidden','notif_json','extra_json'],
  Universities:['id','name','country'],
  Semesters:['id','user_id','sem','academic_year','credits','gpa'],
  Courses:['id','user_id','code','name','credit','grade'],
  Timetable:['id','user_id','course','day','start','end','room','lecturer'],
  Assignments:['id','user_id','course','title','due','priority','status','notes'],
  Examinations:['id','user_id','course','date','time','venue','revision'],
  Finance:['id','user_id','kind','type','cat','amount','date','title','target','saved'],
  Habits:['id','user_id','kind','name','title','days','done','progress'],
  Notifications:['id','user_id','type','ref_id','fire_at','sent_at','status','attempts'],
  PushSubscriptions:['id','user_id','endpoint','p256dh','auth','created_at'],
  ActivityLogs:['id','user_id','action','entity','at'],
  Sessions:['token_hash','user_id','expires_at'] // extra sheet: server-side sessions (token stored hashed)
};
// ---- validators: each returns the cleaned value or throws fail('invalid') ----
function mk(f,t,opt,def){f.t=t;f.opt=opt;f.def=def;return f}
function S(n,req){return mk(function(v){v=String(v==null?'':v).trim();if(v.length>n||(req&&!v))throw fail('invalid');return v},'s',!req)}
function N(a,b){return mk(function(v){if(v===''||v==null||typeof v==='boolean')throw fail('invalid');v=Number(v);if(v!==v||v<a||v>b)throw fail('invalid');return v},'n')}
function E(l){return mk(function(v){if(l.indexOf(v)<0)throw fail('invalid');return v},'s')}
const VD=mk(function(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||isNaN(new Date(v+'T00:00:00Z')))throw fail('invalid');return v},'s');
const VT=mk(function(v){if(typeof v!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))throw fail('invalid');return v},'s');
const VB=mk(function(v){if(typeof v!=='boolean')throw fail('invalid');return v},'b',false,false);
const V7=mk(function(v){if(!Array.isArray(v)||v.length!==7)throw fail('invalid');return v.map(function(x){return x?1:0})},'j',false,[0,0,0,0,0,0,0]);
const DAYS=['mon','tue','wed','thu','fri','sat','sun'];
// ---- collections exposed to the API (frontend name -> sheet + whitelisted fields) ----
const COLL={
  courses:{sheet:'Courses',f:{code:S(20,1),name:S(120,1),credit:N(1,12),grade:E(['A','A-','B+','B','B-','C+','C','F'])}},
  classes:{sheet:'Timetable',f:{course:S(20,1),day:E(DAYS),start:VT,end:VT,room:S(60,1),lecturer:S(80,0)}},
  assignments:{sheet:'Assignments',f:{course:S(20,1),title:S(160,1),due:VD,priority:E(['high','medium','low']),status:E(['pending','inprogress','done']),notes:S(500,0)}},
  exams:{sheet:'Examinations',f:{course:S(20,1),date:VD,time:VT,venue:S(80,1),revision:S(300,0)}},
  tx:{sheet:'Finance',kind:'tx',f:{type:E(['income','expense']),cat:E(['food','transport','books','rent','fun','other','allowance']),amount:N(0.01,1e7),date:VD}},
  sg:{sheet:'Finance',kind:'goal',f:{title:S(80,1),target:N(1,1e9),saved:N(0,1e9)}},
  habits:{sheet:'Habits',kind:'habit',f:{name:S(80,1),days:V7}},
  tasks:{sheet:'Habits',kind:'task',f:{title:S(160,1),done:VB}},
  goals:{sheet:'Habits',kind:'goal',f:{title:S(160,1),progress:N(0,100)}},
  semesters:{sheet:'Semesters',f:{sem:S(20,1),academic_year:S(20,0),credits:N(0,60),gpa:N(0,4)}}
};
function prop(k){return PropertiesService.getScriptProperties().getProperty(k)}
// Run ONCE from the editor (script must be bound to the target spreadsheet).
function setup(){
  var p=PropertiesService.getScriptProperties(),ss=SpreadsheetApp.getActiveSpreadsheet();
  p.setProperty('SPREADSHEET_ID',ss.getId());
  if(!p.getProperty('PASSWORD_PEPPER'))p.setProperty('PASSWORD_PEPPER',Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid());
  ensureSheets(ss);
  var u=ss.getSheetByName('Universities');
  if(u.getLastRow()<2)[['u1','Universiti Malaya','MY'],['u2','Universiti Kebangsaan Malaysia','MY'],['u3','Universiti Sains Malaysia','MY'],['u4','Universiti Teknologi Malaysia','MY']].forEach(function(r){append('Universities',{id:r[0],name:r[1],country:r[2]})});
  Logger.log('Setup complete. Sheets: '+Object.keys(SCHEMA).join(', '));
}
