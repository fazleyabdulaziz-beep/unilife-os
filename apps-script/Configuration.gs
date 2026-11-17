const CFG = {
  VERSION: '2.0.0',
  ITER: 3000,
  SESSION_DAYS: 14,
  MAX_FAILS: 5,
  LOCK_SEC: 900,
  MAX_ROWS: 100
};
const WIDGETS = ['academic','schedule','calendar','assignments','exams','finance','productivity','todayFocus','quickAccess','notes'];
const FONTS = ['Inter','Poppins','Roboto','Nunito','Plus Jakarta Sans','DM Sans','Lato'];
const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];

const SCHEMA = {
  Users: ['id','email','password_hash','salt','name','university','semester','academic_year','total_credits','created_at','timezone'],
  UserPreferences: ['user_id','font','theme','lang','density','widget_order','widget_hidden','notif_json','extra_json'],
  Universities: ['id','name','country'],
  Semesters: ['id','user_id','sem','academic_year','credits','gpa'],
  Courses: ['id','user_id','code','name','credit','grade'],
  Timetable: ['id','user_id','course','day','start','end','room','lecturer','schedule_type','date'],
  Assignments: ['id','user_id','course','title','due','priority','status','notes'],
  Examinations: ['id','user_id','course','date','time','venue','revision'],
  Finance: ['id','user_id','kind','type','cat','amount','date','title','target','saved'],
  Habits: ['id','user_id','kind','name','title','days','done','progress'],
  Notifications: ['id','user_id','type','ref_id','fire_at','sent_at','status','attempts'],
  PushSubscriptions: ['id','user_id','token','platform','created_at'],
  ActivityLogs: ['id','user_id','action','entity','at'],
    CalendarEvents: [
    'id',
    'user_id',
    'source_type',
    'source_id',
    'google_event_id',
    'updated_at'
  ],
  Sessions: ['token_hash','user_id','expires_at'],
  PasswordResets: ['id','user_id','token_hash','expires_at','used_at','created_at'],
  Notes: ['id','user_id','title','content','created_at','updated_at','color','x','y','width','height']
};

function mk(f,t,opt,def){f.t=t;f.opt=opt;f.def=def;return f}
function S(n,req){return mk(function(v){v=String(v==null?'':v).trim();if(v.length>n||(req&&!v))throw fail('invalid');return v},'s',!req)}
function N(a,b){return mk(function(v){if(v===''||v==null||typeof v==='boolean')throw fail('invalid');v=Number(v);if(v!==v||v<a||v>b)throw fail('invalid');return v},'n')}
function E(l){return mk(function(v){if(l.indexOf(v)<0)throw fail('invalid');return v},'s')}
const VD = mk(function(v){
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))throw fail('invalid');
  var d=new Date(v+'T00:00:00Z');
  if(isNaN(d)||d.toISOString().slice(0,10)!==v)throw fail('invalid');
  return v;
},'s');
const VDO = mk(function(v){return v===''?'':VD(v)},'s',true);
const VDAY = mk(function(v){if(v==='')return '';if(DAYS.indexOf(v)<0)throw fail('invalid');return v},'s',true);
const VT = mk(function(v){if(typeof v!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))throw fail('invalid');return v},'s');
const VB = mk(function(v){if(typeof v!=='boolean')throw fail('invalid');return v},'b',false,false);
const V7 = mk(function(v){if(!Array.isArray(v)||v.length!==7)throw fail('invalid');return v.map(function(x){return x?1:0})},'j',false,[0,0,0,0,0,0,0]);

const COLL = {
  courses:{sheet:'Courses',f:{code:S(20,1),name:S(120,1),credit:N(1,12),grade:E(['A','A-','B+','B','B-','C+','C','F'])}},
  classes:{sheet:'Timetable',f:{
    course:S(80,1),day:VDAY,start:VT,end:VT,room:S(60,1),lecturer:S(80,0),
    schedule_type:mk(function(v){if(['recurring','one_time'].indexOf(v)<0)throw fail('invalid');return v},'s',false,'recurring'),
    date:VDO
  }},
  assignments:{sheet:'Assignments',f:{course:S(20,1),title:S(160,1),due:VD,priority:E(['high','medium','low']),status:E(['pending','inprogress','done']),notes:S(500,0)}},
  exams:{sheet:'Examinations',f:{course:S(20,1),date:VD,time:VT,venue:S(80,1),revision:S(300,0)}},
  tx:{sheet:'Finance',kind:'tx',f:{type:E(['income','expense']),cat:E(['food','transport','books','rent','fun','other','allowance']),amount:N(0.01,1e7),date:VD}},
  sg:{sheet:'Finance',kind:'goal',f:{title:S(80,1),target:N(1,1e9),saved:N(0,1e9)}},
  habits:{sheet:'Habits',kind:'habit',f:{name:S(80,1),days:V7}},
  tasks:{sheet:'Habits',kind:'task',f:{title:S(160,1),done:VB}},
  goals:{sheet:'Habits',kind:'goal',f:{title:S(160,1),progress:N(0,100)}},
  semesters:{sheet:'Semesters',f:{sem:S(20,1),academic_year:S(20,0),credits:N(0,60),gpa:N(0,4)}},
  notes:{sheet:'Notes',f:{title:S(80,1),content:S(2000,1),created_at:S(40,0),updated_at:S(40,0),color:mk(function(v){if(['yellow','pink','blue','green','purple','orange'].indexOf(v)<0)throw fail('invalid');return v},'s',true,'yellow'),x:mk(N(0,5000),'n',true,24),y:mk(N(0,5000),'n',true,250),width:mk(N(200,520),'n',true,250),height:mk(N(160,620),'n',true,230)}}
};

function prop(k){return PropertiesService.getScriptProperties().getProperty(k)}