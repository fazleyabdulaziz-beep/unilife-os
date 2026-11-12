(()=>{
const U=UL,D=U.data,$=(s,e=document)=>e.querySelector(s),$$=(s,e=document)=>[...e.querySelectorAll(s)];
const t=k=>U.i18n.t(k),fmt=U.i18n;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const iso=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const left=d=>Math.round((new Date(d+'T00:00')-new Date().setHours(0,0,0,0))/864e5);
const DAYS=['mon','tue','wed','thu','fri','sat','sun'],JS=['sun','mon','tue','wed','thu','fri','sat'];
const GP={'A':4,'A-':3.67,'B+':3.33,'B':3,'B-':2.67,'C+':2.33,'C':2,'F':0};
const CATS=['food','transport','books','rent','fun','other'];
// ---------- preferences ----------
const def={font:'Inter',theme:'light',lang:'en',density:'comfortable',order:['academic','schedule','assignments','exams','finance','productivity'],hidden:[],welcomeTitle:'Your campus, your pace.',welcomeSubtitle:'A little progress every day adds up. Keep your goals in sight.',notif:{push:false,assignments:true,classes:true,exams:true,finance:true}};
let saved={};try{saved=JSON.parse(localStorage.getItem('ul_prefs')||'{}')}catch(e){}
U.prefs={...def,...saved,notif:{...def.notif,...(saved.notif||{})}};
let tm;
const local=()=>localStorage.setItem('ul_prefs',JSON.stringify(U.prefs));
const store=()=>{local();clearTimeout(tm);tm=setTimeout(pushPrefs,600)};
const errMsg=e=>t('err_'+((e&&e.code)||'server'));
function pushPrefs(){if(!U.api.token())return;const p=U.prefs;
 U.api.call('savePrefs',{font:p.font,theme:p.theme,lang:p.lang,density:p.density,order:p.order,hidden:p.hidden,notif:p.notif,extra:{budget:D.finance.budget,study:D.study,welcomeTitle:p.welcomeTitle,welcomeSubtitle:p.welcomeSubtitle}}).catch(e=>toast(errMsg(e)))}
const mq=matchMedia('(prefers-color-scheme:dark)');
function apply(){const p=U.prefs,r=document.documentElement;
 r.dataset.theme=p.theme==='dark'||(p.theme==='system'&&mq.matches)?'dark':'light';
 r.dataset.density=p.density;r.lang=p.lang;r.style.setProperty('--font',`'${p.font}',system-ui,sans-serif`);
 $('#search').placeholder=t('search')}
mq.addEventListener('change',apply);
// ---------- calculations ----------
const gpa=cs=>{const c=cs.reduce((a,x)=>a+x.credit,0);return c?cs.reduce((a,x)=>a+GP[x.grade]*x.credit,0)/c:0};
const curCr=()=>D.courses.reduce((a,x)=>a+x.credit,0);
const credits=()=>D.history.reduce((a,x)=>a+x.credits,0)+curCr();
const cgpa=()=>{const c=credits();return c?(D.history.reduce((a,x)=>a+x.gpa*x.credits,0)+gpa(D.courses)*curCr())/c:0};
const fin=()=>{const m=new Date().toISOString().slice(0,7),tx=D.finance.tx.filter(x=>x.date.startsWith(m)||true);
 const spent=tx.filter(x=>x.type==='expense').reduce((a,x)=>a+x.amount,0),inc=tx.filter(x=>x.type==='income').reduce((a,x)=>a+x.amount,0);
 const g=D.finance.goals,tg=g.reduce((a,x)=>a+x.target,0),sv=g.reduce((a,x)=>a+x.saved,0);
 return{spent,inc,rem:D.finance.budget-spent,pct:tg?sv/tg*100:0}};
const todayCls=()=>{const ds=iso(0),k=JS[new Date().getDay()];return D.classes.filter(c=>(c.schedule_type==='one_time'?d10(c.date)===ds:dk(c)===k)).sort((a,b)=>a.start.localeCompare(b.start))};
const asgState=a=>a.status!=='done'&&left(a.due)<0?'overdue':a.status;
// ---------- calendar data helpers (tolerant of "Monday"/"MON" and ISO timestamps) ----------
const d10=x=>String(x||'').slice(0,10);
const dk=c=>String(c.day||'').slice(0,3).toLowerCase();
const ymd=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const eventsOn=ds=>{const [y,m,d]=ds.split('-').map(Number),k=JS[new Date(y,m-1,d).getDay()];
 return{cls:D.classes.filter(c=>(c.schedule_type==='one_time'?d10(c.date)===ds:dk(c)===k)).sort((a,b)=>String(a.start).localeCompare(String(b.start))),
  asg:D.assignments.filter(a=>d10(a.due)===ds),exm:D.exams.filter(e=>d10(e.date)===ds)}};
// ---------- UI helpers ----------
const card=(h,b,x='')=>`<section class="card ${x}">${h?`<h3>${h}</h3>`:''}${b}</section>`;
const bar=p=>`<div class="bar"><i style="width:${Math.max(0,Math.min(100,p))}%"></i></div>`;
const stat=(l,v,c='')=>`<div><small>${l}</small><b class="${c}">${v}</b></div>`;
const badge=(k,c)=>`<span class="badge ${c||k}">${t(k)}</span>`;
const empty=()=>`<div class="empty"><i data-lucide="inbox"></i><p>${t('empty')}</p></div>`;
const ctl=(m,id)=>`<button class="icon-btn" data-act="edit" data-m="${m}" data-id="${id}" aria-label="${t('edit')}"><i data-lucide="pencil"></i></button><button class="icon-btn" data-act="del" data-m="${m}" data-id="${id}" aria-label="${t('delete')}"><i data-lucide="trash-2"></i></button>`;
const head=(k,m,x='')=>`<div class="ph"><h1>${t(k)}</h1><div class="row">${x}${['assign','exam','cls'].includes(m)?`<button class="btn ghost" data-act="import" data-m="${m}"><i data-lucide="upload"></i>${t('import')}</button>`:''}${m?`<button class="btn" data-act="new" data-m="${m}"><i data-lucide="plus"></i>${t('add')}</button>`:''}</div></div>`;
const chart=(vals,labels)=>{const mx=Math.max(...vals,1);return`<div class="chart">${vals.map((v,i)=>`<div><i style="height:${v/mx*85}%" title="${v}"></i>${labels[i]}</div>`).join('')}</div>`};
const toast=m=>{const e=document.createElement('div');e.className='toast';e.textContent=m;$('#toasts').append(e);setTimeout(()=>e.remove(),2600)};
const sel=(n,opts,v,extra='')=>`<select ${extra} ${n}>${opts.map(o=>`<option value="${o}" ${v==o?'selected':''}>${t(o)}</option>`).join('')}</select>`;
// ---------- CRUD config (generic modal forms) ----------
const M={
 assign:{l:()=>D.assignments,t:'assignment',f:[{n:'title',l:'title'},{n:'course',l:'course'},{n:'due',l:'due',t:'date'},{n:'priority',l:'priority',o:['high','medium','low']},{n:'status',l:'status',o:['pending','inprogress','done']},{n:'notes',l:'notes',r:0}],d:()=>({priority:'medium',status:'pending',due:iso(3)})},
 hist:{l:()=>D.history,t:'semester',f:[{n:'sem',l:'semester'},{n:'credits',l:'credits',t:'number',min:0},{n:'gpa',l:'gpa',t:'number',min:0}],d:()=>({})},
 cls:{l:()=>D.classes,t:'class',f:[{n:'course',l:'course'},{n:'day',l:'date',o:DAYS},{n:'start',l:'start',t:'time'},{n:'end',l:'end',t:'time'},{n:'room',l:'room'},{n:'lecturer',l:'lecturer',r:0}],d:()=>({day:'mon',start:'09:00',end:'11:00'})},
 exam:{l:()=>D.exams,t:'exam',f:[{n:'course',l:'course'},{n:'date',l:'date',t:'date'},{n:'time',l:'time',t:'time'},{n:'venue',l:'venue'},{n:'revision',l:'revision',r:0}],d:()=>({date:iso(14),time:'09:00'})},
 tx:{l:()=>D.finance.tx,t:'transaction',f:[{n:'type',l:'type',o:['income','expense']},{n:'cat',l:'category',o:[...CATS,'allowance']},{n:'amount',l:'amount',t:'number',min:0.01},{n:'date',l:'date',t:'date'}],d:()=>({type:'expense',cat:'food',date:iso(0)})},
 sg:{l:()=>D.finance.goals,t:'savingsItem',f:[{n:'title',l:'title'},{n:'target',l:'target',t:'number',min:1},{n:'saved',l:'current',t:'number',min:0}],d:()=>({saved:0})},
 course:{l:()=>D.courses,t:'courseItem',f:[{n:'code',l:'code'},{n:'name',l:'name'},{n:'credit',l:'credit',t:'number',min:1},{n:'grade',l:'grade',o:Object.keys(GP)}],d:()=>({credit:3,grade:'A'})},
 hab:{l:()=>D.habits,t:'habit',f:[{n:'name',l:'name'}],d:()=>({}),x:()=>({days:[0,0,0,0,0,0,0]})},
 task:{l:()=>D.tasks,t:'task',f:[{n:'title',l:'title'}],d:()=>({}),x:()=>({done:false})},
 goal:{l:()=>D.goals,t:'goal',f:[{n:'title',l:'title'}],d:()=>({}),x:()=>({progress:0})}
};
const modal=h=>{const m=$('#modal');m.hidden=false;m.innerHTML=`<div class="dlg" role="dialog">${h}</div>`;return m};
const close=()=>{$('#modal').hidden=true};
function form(title,fields,vals,ok){
 const m=modal(`<h3>${esc(title)}</h3><form>${fields.map(f=>`<label class="field">${t(f.l)}${f.o?sel(`name="${f.n}"`,f.o,vals[f.n]):`<input name="${f.n}" type="${f.t||'text'}" value="${esc(vals[f.n]??'')}" ${f.r===0?'':'required'} ${f.min!=null?`min="${f.min}" step="any"`:''} maxlength="120">`}</label>`).join('')}<div class="row end"><button type="button" class="btn ghost" data-act="close">${t('cancel')}</button><button class="btn">${t('save')}</button></div></form>`);
 $('form',m).onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));
  fields.forEach(f=>{if(f.t==='number')o[f.n]=Number(o[f.n]);else if(typeof o[f.n]==='string'&&f.t!=='password')o[f.n]=o[f.n].trim()});
  ok(o);close();render()}}
function edit(m,id){if(m==='cls')return editClass(null,id);const c=M[m],l=c.l(),it=id?l.find(x=>x.id===id):null;
 form(`${t(it?'edit':'add')} ${t(c.t)}`,c.f,it||c.d(),o=>{let x=it;if(x)Object.assign(x,o);else{x={id:uid(),...(c.x?c.x():{}),...o};l.push(x)}sync(it?'update':'create',m,x);toast(t('saved'))})}
function editClass(selectedDate,id){
 const l=D.classes,it=id?l.find(x=>x.id===id):null;
 const type=it?(it.schedule_type||'recurring'):(selectedDate?'one_time':'recurring');
 const ds=selectedDate||it?.date||iso(0);
 const day=it?.day||DAYS[(new Date(ds+'T00:00:00').getDay()+6)%7];
 const val={course:it?.course||'',schedule_type:type,day,date:it?.date||ds,start:it?.start||'09:00',end:it?.end||'11:00',room:it?.room||'',lecturer:it?.lecturer||''};
 const m=modal(`<h3>${t(it?'edit':'add')} class</h3><form id="class-form">
 <label class="field">${t('course')}<input name="course" value="${esc(val.course)}" maxlength="20" required></label>
 <label class="field">Schedule type<select name="schedule_type"><option value="recurring" ${val.schedule_type==='recurring'?'selected':''}>Recurring weekly</option><option value="one_time" ${val.schedule_type==='one_time'?'selected':''}>One-time class</option></select></label>
 <label class="field" id="class-day-field">Day<select name="day">${DAYS.map(d=>`<option value="${d}" ${val.day===d?'selected':''}>${t(d)}</option>`).join('')}</select></label>
 <label class="field" id="class-date-field">Date<input name="date" type="date" value="${esc(val.date)}"></label>
 <div class="grid"><label class="field">${t('start')}<input name="start" type="time" value="${esc(val.start)}" required></label><label class="field">${t('end')}<input name="end" type="time" value="${esc(val.end)}" required></label></div>
 <label class="field">${t('room')}<input name="room" value="${esc(val.room)}" maxlength="60" required></label>
 <label class="field">${t('lecturer')}<input name="lecturer" value="${esc(val.lecturer)}" maxlength="80"></label>
 <div class="row end"><button type="button" class="btn ghost" data-act="close">${t('cancel')}</button><button class="btn">${t('save')}</button></div></form>`);
 const f=$('#class-form',m),typeEl=f.elements.schedule_type,dayField=$('#class-day-field',f),dateField=$('#class-date-field',f),dayEl=f.elements.day,dateEl=f.elements.date;
 const updateMode=()=>{const one=typeEl.value==='one_time';dayField.hidden=one;dateField.hidden=!one;dayEl.required=!one;dateEl.required=one;dayEl.disabled=one;dateEl.disabled=!one};
 typeEl.addEventListener('change',updateMode);updateMode();
 f.onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(f));
  if(o.schedule_type==='recurring'){o.date='';}else{o.day='';}
  if(o.start>=o.end)return toast('End time must be later than start time');
  let x=it;if(x)Object.assign(x,o);else{x={id:uid(),...o};l.push(x)}
  sync(it?'update':'create','cls',x);toast(t('saved'));close();render();
 };
 window.lucide&&lucide.createIcons();
}
function ask(fn){modal(`<h3>${t('confirmDelete')}</h3><div class="row end"><button class="btn ghost" data-act="close">${t('cancel')}</button><button class="btn danger" id="yes">${t('delete')}</button></div>`);$('#yes').onclick=()=>{fn();close();render()}}
// ---------- views ----------
const st={f:'all',tt:'week',gc:null};
const W={
 academic:()=>card(t('academics'),`<div class="stats">${stat(t('gpa'),gpa(D.courses).toFixed(2))}${stat(t('cgpa'),cgpa().toFixed(2))}${stat(t('credits'),credits())}</div><small>${t('progress')} · ${Math.round(credits()/D.user.totalCredits*100)}%</small>${bar(credits()/D.user.totalCredits*100)}`),
 schedule:()=>{const l=todayCls();return card(t('today'),l.length?l.map(c=>`<div class="item"><span class="time">${c.start}</span><div class="grow"><b>${esc(c.course)}</b><small>${esc(c.room)} · ${c.start}–${c.end}</small></div></div>`).join(''):`<p class="muted">${t('noClasses')}</p>`)},
 assignments:()=>{const a=D.assignments,p=a.filter(x=>x.status!=='done'),od=p.filter(x=>left(x.due)<0),up=p.filter(x=>left(x.due)>=0).sort((x,y)=>x.due.localeCompare(y.due)).slice(0,3);
  return card(t('assignments'),`<div class="stats">${stat(t('pending'),p.length)}${stat(t('done'),a.length-p.length)}${stat(t('overdue'),od.length,'bad')}</div>`+up.map(x=>`<div class="item"><div class="grow"><b>${esc(x.title)}</b><small>${esc(x.course)} · ${fmt.date(x.due)}</small></div>${badge(x.priority)}</div>`).join(''))},
 exams:()=>card(t('exams'),D.exams.length?[...D.exams].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<div class="item"><div class="grow"><b>${esc(e.course)}</b><small>${fmt.date(e.date)} · ${esc(e.time)} · ${esc(e.venue)}</small></div><b class="${left(e.date)<=3?'bad':''}">${left(e.date)} ${t('days')}</b></div>`).join(''):empty()),
 finance:()=>{const f=fin();return card(t('finance'),`<div class="stats">${stat(t('budget'),fmt.money(D.finance.budget))}${stat(t('expenses'),fmt.money(f.spent))}${stat(t('balance'),fmt.money(f.rem),f.rem<0?'bad':'ok')}</div><small>${t('savings')} · ${Math.round(f.pct)}%</small>${bar(f.pct)}`)},
 productivity:()=>{const i=(new Date().getDay()+6)%7,hd=D.habits.reduce((a,h)=>a+h.days.filter(Boolean).length,0),ht=D.habits.length*7;
  return card(t('productivity'),`<div class="stats">${stat(t('study'),D.study[i]+' h')}${stat(t('habits'),ht?Math.round(hd/ht*100)+'%':'–')}${stat(t('weekly'),D.study.reduce((a,b)=>a+b,0)+' h')}</div>`+chart(D.study,DAYS.map(t)))}
};
const WN={academic:'academics',schedule:'today'};
const views={
 dashboard(){const h=new Date().getHours(),g=h<12?'gm':h<18?'ga':'ge',u=D.user;
  const now=new Date(),first=new Date(now.getFullYear(),now.getMonth(),1),offset=(first.getDay()+6)%7,days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const cal=DAYS.map(d=>`<span class="mini-day-label">${t(d).slice(0,1)}</span>`).join('')+
   '<i class="mini-day-blank"></i>'.repeat(offset)+Array.from({length:days},(_,i)=>{const ds=ymd(now.getFullYear(),now.getMonth(),i+1),ev=eventsOn(ds),n=ev.cls.length+ev.asg.length+ev.exm.length;return`<button class="mini-day ${i+1===now.getDate()?'today':''} ${n?'has':''}" data-act="day" data-id="${ds}" aria-label="${ds}">${i+1}</button>`}).join('');
  const pending=D.assignments.filter(a=>a.status!=='done').sort((a,b)=>a.due.localeCompare(b.due)).slice(0,3);
  const today=D.tasks.filter(x=>!x.done).slice(0,3);
  const tasks=[...pending.map(a=>({title:a.title,sub:a.course||t('assignments'),date:fmt.date(a.due),id:a.id,kind:'assign'})),...today.map(x=>({title:x.title,sub:t('task'),date:t('today'),id:x.id,kind:'task'}))].slice(0,4);
  const studyTotal=D.study.reduce((a,b)=>a+b,0),i=(now.getDay()+6)%7;
  const vis=U.prefs.order.filter(w=>!U.prefs.hidden.includes(w));
  return `<div class="ph dashboard-head"><div><h1>${t(g)}, ${esc(u.name.split(' ')[0])} <span>✦</span></h1><small>${esc(u.university)} · ${esc(u.semester)} · ${esc(u.year)}</small></div><button class="btn ghost" data-act="custom"><i data-lucide="sliders-horizontal"></i>${t('customize')}</button></div>
  <div class="campus-layout">
   <div class="campus-main">
    <section class="welcome-card"><div class="welcome-copy"><span class="eyebrow">${now.toLocaleDateString(fmt.loc(),{weekday:'long',month:'long',day:'numeric'})}</span><h2>${esc(U.prefs.welcomeTitle||def.welcomeTitle)}</h2><p>${esc(U.prefs.welcomeSubtitle||def.welcomeSubtitle)}</p><a class="welcome-link" href="#/timetable">${t('today')} <i data-lucide="arrow-up-right"></i></a></div><div class="welcome-art"><div class="sun-disc"></div><div class="campus-building"><i data-lucide="landmark"></i></div><div class="art-cloud cloud-one"></div><div class="art-cloud cloud-two"></div></div></section>
    <section class="campus-card calendar-card"><div class="campus-card-head"><div><h3>${now.toLocaleDateString(fmt.loc(),{month:'long',year:'numeric'})}</h3><small>Your academic calendar</small></div><a href="#/timetable">${t('timetable')} <i data-lucide="arrow-up-right"></i></a></div><div class="mini-calendar">${cal}</div></section>
    <div class="campus-metrics">
     <section class="campus-card productivity-card"><div class="campus-card-head"><div><h3>Weekly study rhythm</h3><small>${studyTotal.toFixed(1)} hours logged this week</small></div><i data-lucide="bar-chart-3"></i></div>${chart(D.study,DAYS.map(d=>t(d).slice(0,1)))}</section>
     <section class="campus-card score-card"><div class="campus-card-head"><div><h3>Academic progress</h3><small>Credits completed</small></div><i data-lucide="graduation-cap"></i></div><div class="progress-ring" style="--progress:${Math.max(0,Math.min(100,credits()/Math.max(1,D.user.totalCredits)*100))}%"><div><b>${Math.round(credits()/Math.max(1,D.user.totalCredits)*100)}%</b><small>complete</small></div></div><small class="ring-foot">${credits()} / ${D.user.totalCredits} credits</small></section>
    </div>
    <section class="campus-card quick-card"><div class="campus-card-head"><div><h3>Quick access</h3><small>Your everyday student tools</small></div><i data-lucide="command"></i></div><div class="quick-links"><a href="#/assignments"><i data-lucide="notebook-pen"></i><span>Assignments</span></a><a href="#/timetable"><i data-lucide="calendar-days"></i><span>Timetable</span></a><a href="#/academics"><i data-lucide="graduation-cap"></i><span>GPA tracker</span></a><a href="#/finance"><i data-lucide="wallet"></i><span>My finance</span></a></div></section>
   </div>
   <aside class="campus-side">
    <section class="campus-card today-card"><div class="campus-card-head"><div><h3>Today's focus</h3><small>${tasks.length} items need your attention</small></div><a href="#/assignments">View all</a></div>${tasks.length?tasks.map(x=>`<div class="focus-task"><span class="focus-check"><i data-lucide="${x.kind==='assign'?'book-open':'check-circle-2'}"></i></span><div class="grow"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></div><small class="task-date">${esc(x.date)}</small></div>`).join(''):`<div class="empty">${t('empty')}</div>`}<a class="add-task-link" href="#/assignments"><i data-lucide="plus"></i> Manage your tasks</a></section>
    <section class="campus-card focus-card"><div class="campus-card-head"><div><h3>Focus session</h3><small>Make time for deep work</small></div><i data-lucide="hourglass"></i></div><div class="timer-illustration"><div class="hourglass-shape"><i data-lucide="hourglass"></i></div></div><div class="timer-readout" id="focus-time">25:00</div><div class="timer-controls"><button class="timer-adjust" data-act="timer-minus" aria-label="Decrease time">−</button><span>minutes</span><button class="timer-adjust" data-act="timer-plus" aria-label="Increase time">+</button></div><button class="timer-start" data-act="timer-toggle">Start focus</button><button class="timer-reset" data-act="timer-reset">Reset</button></section>
    ${vis.includes('finance')?`<section class="campus-card side-mini">${W.finance()}</section>`:''}
   </aside>
  </div>`},
 academics(){const cr=curCr();
  return head('academics','course')+`<div class="grid">${card(t('calc'),`<div class="stats">${stat(t('gpa'),gpa(D.courses).toFixed(2))}${stat(t('cgpa'),cgpa().toFixed(2))}${stat(t('credits'),credits())}</div>${bar(credits()/D.user.totalCredits*100)}`)}${card(t('history'),chart([...D.history.map(h=>h.gpa),gpa(D.courses)].map(v=>+v.toFixed(2)),[...D.history.map(h=>h.sem),'•'])+D.history.map(h=>`<div class="item" data-s="${esc(h.sem)}"><div class="grow"><b>${esc(h.sem)}</b><small>${h.credits} · GPA ${h.gpa}</small></div>${ctl('hist',h.id)}</div>`).join('')+`<button class="btn ghost" data-act="new" data-m="hist"><i data-lucide="plus"></i>${t('add')}</button>`)}${card(t('courseItem'),`<div class="scroll"><table><tr><th>${t('code')}</th><th>${t('name')}</th><th>${t('credit')}</th><th>${t('grade')}</th><th></th></tr>${D.courses.map(c=>`<tr data-s="${esc(c.code+c.name)}"><td>${esc(c.code)}</td><td>${esc(c.name)}</td><td>${c.credit}</td><td>${esc(c.grade)}</td><td class="row">${ctl('course',c.id)}</td></tr>`).join('')}</table></div>`,'wide')}</div>`},
 assignments(){const f=st.f,l=D.assignments.map(a=>({...a,s:asgState(a)})).filter(a=>f==='all'||a.s===f).sort((a,b)=>a.due.localeCompare(b.due));
  return head('assignments','assign',sel('data-view="f"',['all','pending','inprogress','done','overdue'],f))+card('',l.length?l.map(a=>`<div class="item" data-s="${esc(a.title+a.course)}"><button class="chk ${a.status==='done'?'on':''}" data-act="done" data-id="${a.id}" aria-label="${t('done')}"><i data-lucide="check"></i></button><div class="grow"><b>${esc(a.title)}</b><small>${esc(a.course)} · ${fmt.date(a.due)}${a.notes?' · '+esc(a.notes):''}</small></div>${badge(a.priority)}${badge(a.s)}${ctl('assign',a.id)}</div>`).join(''):empty())},
 timetable(){const w=st.tt==='week';
  const tog=`<div class="row"><button class="btn ${w?'':'ghost'}" data-act="tt" data-id="week">${t('week')}</button><button class="btn ${w?'ghost':''}" data-act="tt" data-id="month">${t('month')}</button></div>`;
  let body;
  if(w)body=`<div class="week">${DAYS.map(d=>card(t(d),D.classes.filter(c=>dk(c)===d).sort((a,b)=>a.start.localeCompare(b.start)).map(c=>`<div class="cls" data-s="${esc(c.course+c.room+c.lecturer)}"><b>${esc(c.course)}</b>${c.start}–${c.end}<br>${esc(c.room)}${c.lecturer?' · '+esc(c.lecturer):''}<div class="row">${ctl('cls',c.id)}</div></div>`).join('')||'<small>–</small>')).join('')}</div>`;
  else{const n=new Date(),b=new Date(n.getFullYear(),n.getMonth()+(st.cm||0),1),y=b.getFullYear(),mo=b.getMonth(),first=(b.getDay()+6)%7,len=new Date(y,mo+1,0).getDate();
   let cells=DAYS.map(d=>`<small>${t(d)}</small>`).join('')+'<span class="cal-blank"></span>'.repeat(first);
   for(let d=1;d<=len;d++){const ds=ymd(y,mo,d),e=eventsOn(ds),isT=!st.cm&&d===n.getDate();
    const items=[...e.exm.map(x=>['e',x.course]),...e.asg.map(x=>['a',x.title]),...e.cls.map(x=>['c',x.course])];
    const chips=items.slice(0,2).map(([k,x])=>`<span class="chip ${k}">${esc(x)}</span>`).join('')+(items.length>2?`<span class="chip more">+${items.length-2}</span>`:'');
    cells+=`<button class="cal-day ${isT?'td':''}" data-act="day" data-id="${ds}" aria-label="${ds}"><span class="cal-num">${d}</span><span class="cal-dots">${e.cls.length?'<span class="dot"></span>':''}${e.asg.length?'<span class="dot a"></span>':''}${e.exm.length?'<span class="dot e"></span>':''}</span><span class="cal-chips">${chips}</span></button>`}
   body=card('',`<div class="cal-nav"><button class="icon-btn" data-act="cmonth" data-id="-1" aria-label="Previous month"><i data-lucide="chevron-left"></i></button><h3>${b.toLocaleDateString(fmt.loc(),{month:'long',year:'numeric'})}</h3><button class="icon-btn" data-act="cmonth" data-id="1" aria-label="Next month"><i data-lucide="chevron-right"></i></button><button class="btn ghost cal-today" data-act="cmonth" data-id="0">${t('today')}</button></div><div class="cal">${cells}</div><div class="cal-legend"><span><i class="dot"></i>Class</span><span><i class="dot a"></i>${t('assignments')}</span><span><i class="dot e"></i>${t('exams')}</span></div>`)}
  return head('timetable','cls',tog)+body},
 exams(){const l=[...D.exams].sort((a,b)=>a.date.localeCompare(b.date));
  return head('exams','exam')+`<div class="grid">${l.length?l.map(e=>card(esc(e.course),`<div class="stats">${stat(t('countdown'),left(e.date)+' '+t('days'),left(e.date)<=3?'bad':'')}</div><small>${fmt.date(e.date,{day:'numeric',month:'long',year:'numeric'})} · ${esc(e.time)} · ${esc(e.venue)}</small><p style="margin:10px 0"><b>${t('revision')}:</b> ${esc(e.revision||'–')}</p><div class="row end">${ctl('exam',e.id)}</div>`)).join(''):card('',empty())}</div>`},
 finance(){const f=fin();
  return head('finance','tx',`<button class="btn ghost" data-act="budget">${t('budget')}</button>`)+`<div class="grid">${card(t('budget'),`<div class="stats">${stat(t('budget'),fmt.money(D.finance.budget))}${stat(t('expenses'),fmt.money(f.spent))}${stat(t('balance'),fmt.money(f.rem),f.rem<0?'bad':'ok')}</div>${bar(f.spent/D.finance.budget*100)}<small>${t('income')}: ${fmt.money(f.inc)}</small>`)}${card(t('sGoal'),D.finance.goals.map(g=>`<div class="item"><div class="grow"><b>${esc(g.title)}</b><small>${fmt.money(g.saved)} / ${fmt.money(g.target)}</small>${bar(g.saved/g.target*100)}</div>${ctl('sg',g.id)}</div>`).join('')+`<button class="btn ghost" data-act="new" data-m="sg"><i data-lucide="plus"></i>${t('add')}</button>`)}${card(t('transaction'),[...D.finance.tx].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<div class="item" data-s="${esc(x.cat)}"><div class="grow"><b>${t(x.cat)}</b><small>${fmt.date(x.date)}</small></div><b class="${x.type==='income'?'ok':''}">${x.type==='income'?'+':'−'}${fmt.money(x.amount)}</b>${ctl('tx',x.id)}</div>`).join('')||empty(),'wide')}</div>`},
 productivity(){const i=(new Date().getDay()+6)%7;
  return head('productivity','',`<button class="btn" data-act="log"><i data-lucide="timer"></i>${t('logStudy')}</button>`)+`<div class="grid">${card(t('study'),chart(D.study,DAYS.map(t)))}${card(t('habits'),D.habits.map(h=>`<div class="item"><div class="grow"><b>${esc(h.name)}</b></div><div class="hab">${h.days.map((d,j)=>`<button class="chk ${d?'on':''}" data-act="hab" data-id="${h.id}" data-i="${j}" title="${t(DAYS[j])}" ${j===i?'style="border-color:var(--primary)"':''}><i data-lucide="check"></i></button>`).join('')}</div>${ctl('hab',h.id)}</div>`).join('')+`<button class="btn ghost" data-act="new" data-m="hab"><i data-lucide="plus"></i>${t('add')}</button>`)}${card(t('tasks'),D.tasks.map(k=>`<div class="item" data-s="${esc(k.title)}"><button class="chk ${k.done?'on':''}" data-act="task" data-id="${k.id}"><i data-lucide="check"></i></button><div class="grow"><b style="${k.done?'text-decoration:line-through;opacity:.6':''}">${esc(k.title)}</b></div>${ctl('task',k.id)}</div>`).join('')+`<button class="btn ghost" data-act="new" data-m="task"><i data-lucide="plus"></i>${t('add')}</button>`)}${card(t('goals'),D.goals.map(g=>`<div class="item"><div class="grow"><b>${esc(g.title)}</b>${bar(g.progress)}<small>${g.progress}%</small></div><button class="icon-btn" data-act="gprog" data-id="${g.id}" aria-label="+10%"><i data-lucide="trending-up"></i></button>${ctl('goal',g.id)}</div>`).join('')+`<button class="btn ghost" data-act="new" data-m="goal"><i data-lucide="plus"></i>${t('add')}</button>`)}</div>`},
 settings(){const p=U.prefs,n=p.notif,u=D.user;
  const tog=(k,l)=>`<label class="item"><span class="grow">${t(l)}</span><input type="checkbox" style="width:22px;min-height:22px" data-set="notif.${k}" ${n[k]?'checked':''}></label>`;
  return head('settings')+`<div class="grid">${card('Dashboard message',`<p class="muted">Personalise the headline and supporting sentence shown on your dashboard.</p><label class="field">Headline<input data-welcome="title" value="${esc(p.welcomeTitle||def.welcomeTitle)}" maxlength="80" placeholder="Your campus, your pace."></label><label class="field">Supporting sentence<input data-welcome="subtitle" value="${esc(p.welcomeSubtitle||def.welcomeSubtitle)}" maxlength="160" placeholder="A little progress every day..."></label><div class="row end"><button class="btn" data-act="save-welcome">Save message</button></div>`)}${card(t('appearance'),`<label class="field">${t('font')}<select data-set="font" style="font-family:'${p.font}'">${U.config.fonts.map(f=>`<option ${f===p.font?'selected':''} style="font-family:'${f}'">${f}</option>`).join('')}</select></label><label class="field">${t('theme')}${sel('data-set="theme"',['light','dark','system'],p.theme)}</label><label class="field">${t('density')}${sel('data-set="density"',['comfortable','compact'],p.density)}</label>`)}${card(t('language'),`<label class="field">${t('language')}<select data-set="lang"><option value="en" ${p.lang==='en'?'selected':''}>English</option><option value="ms" ${p.lang==='ms'?'selected':''}>Bahasa Melayu</option></select></label>`)}${card(t('notifications'),tog('push','enablePush')+tog('assignments','assignReminders')+tog('classes','classReminders')+tog('exams','examReminders')+tog('finance','financeAlerts')+(U.push?U.push.panel():''))}${card(t('account'),`${[['name','student'],['university','university'],['semester','semester'],['year','year']].map(([k,l])=>`<label class="field">${t(l)}<input data-p="${k}" value="${esc(u[k])}" maxlength="80"></label>`).join('')}<div class="row"><button class="btn" data-act="profile">${t('save')}</button><button class="btn ghost" data-act="pwd">${t('password')}</button><button class="btn ghost" data-act="logout">${t('logout')}</button></div>`)}</div>`}
};
// ---------- server sync ----------
const CN={assign:'assignments',cls:'classes',exam:'exams',tx:'tx',sg:'sg',course:'courses',hab:'habits',task:'tasks',goal:'goals',hist:'semesters'};
async function sync(op,m,item){try{await U.api.call(op,{c:CN[m],item})}catch(e){toast(errMsg(e));await load()}}
function hydrate(r){const d=r.data;Object.assign(D.user,r.user);
 Object.assign(U.prefs,r.prefs,{notif:{...U.prefs.notif,...r.prefs.notif}});if(r.data.welcomeTitle!==undefined)U.prefs.welcomeTitle=r.data.welcomeTitle;if(r.data.welcomeSubtitle!==undefined)U.prefs.welcomeSubtitle=r.data.welcomeSubtitle;local();
 Object.assign(D,{courses:d.courses,assignments:d.assignments,classes:d.classes,exams:d.exams,finance:{budget:d.budget,tx:d.tx,goals:d.sg},habits:d.habits,tasks:d.tasks,goals:d.goals,history:d.semesters,study:d.study})}
async function load(){
 $('#view').innerHTML=`<div class="empty"><i data-lucide="loader"></i><p>${t('loading')}</p></div>`;window.lucide&&lucide.createIcons();
 try{const r=await U.api.call('bootstrap');hydrate(r);if(U.prefs.lang!==fmt.lang)await fmt.load(U.prefs.lang);apply();render();U.push&&U.push.sync();return true}
 catch(e){if(e.code==='auth')return false;
  $('#view').innerHTML=`<div class="empty"><p>${errMsg(e)}</p><button class="btn" data-act="retry">${t('retry')}</button></div>`;return true}}
async function boot(){
 if(!U.config.apiUrl){$('#view').innerHTML=`<div class="empty"><p>${t('err_noApi')}</p></div>`;return}
 for(;;){if(U.api.token()&&await load())break;localStorage.removeItem('ul_token');await U.auth.show();apply()}}
// ---------- router / render ----------
const route=()=>{const r=location.hash.replace('#/','');return views[r]?r:'dashboard'};
function render(){const r=route();
 $('#nav').innerHTML=U.config.nav.map(k=>`<a href="#/${k}" class="${k===r?'on':''}"><i data-lucide="${U.config.icons[k]}"></i><span>${t(k)}</span></a>`).join('');
 $('#bottomnav').innerHTML=['dashboard','assignments','timetable','finance'].map(k=>`<a href="#/${k}" class="${k===r?'on':''}"><i data-lucide="${U.config.icons[k]}"></i>${t(k)}</a>`).join('')+`<button data-act="menu"><i data-lucide="menu"></i>${t('more')}</button>`;
 $('#view').innerHTML=views[r]();$('#search').value='';
 $('#sidebar').classList.remove('open');$('#scrim').classList.remove('open');
 window.lucide&&lucide.createIcons()}
// ---------- actions ----------
function dayPopup(ds){const e=eventsOn(ds),total=e.cls.length+e.asg.length+e.exm.length;
 const sec=(title,rows)=>rows.length?`<div class="day-sec"><h4>${title}<span>${rows.length}</span></h4>${rows.join('')}</div>`:'';
 const cls=e.cls.map(c=>`<div class="day-item k-c"><i class="day-bar"></i><div class="grow"><b>${esc(c.course)}</b><small>${esc(c.start)}–${esc(c.end)}${c.room?' · '+esc(c.room):''}${c.lecturer?' · '+esc(c.lecturer):''}</small></div>${ctl('cls',c.id)}</div>`);
 const asg=e.asg.map(a=>`<div class="day-item k-a"><i class="day-bar"></i><div class="grow"><b>${esc(a.title)}</b><small>${esc(a.course||'')}</small></div>${badge(asgState(a))}${ctl('assign',a.id)}</div>`);
 const exm=e.exm.map(x=>`<div class="day-item k-e"><i class="day-bar"></i><div class="grow"><b>${esc(x.course)}</b><small>${esc(x.time||'')}${x.venue?' · '+esc(x.venue):''}</small></div>${ctl('exam',x.id)}</div>`);
 modal(`<div class="day-head"><div><small>${total?total+' event'+(total>1?'s':''):'Free day'}</small><h3>${fmt.date(ds,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</h3></div><button class="icon-btn" data-act="close" aria-label="Close"><i data-lucide="x"></i></button></div>${sec(t('exams'),exm)}${sec(t('assignments'),asg)}${sec('Classes',cls)}${total?'':'<div class="empty"><i data-lucide="coffee"></i><p>Nothing scheduled. Enjoy the free time.</p></div>'}<div class="row end" style="margin-top:14px"><button class="btn" data-act="add-class-date" data-id="${ds}"><i data-lucide="plus"></i> Add class on this date</button></div>`);
 window.lucide&&lucide.createIcons()}
const acts={
 day:id=>dayPopup(id),
 'add-class-date':id=>editClass(id),
 cmonth:id=>{st.cm=+id===0?0:(st.cm||0)+ +id;render()},
 close,
 menu:()=>{$('#sidebar').classList.toggle('open');$('#scrim').classList.toggle('open')},
 quicktheme:()=>{U.prefs.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';store();apply();render()},
 new:(_,b)=>edit(b.dataset.m),
 edit:(id,b)=>edit(b.dataset.m,id),
 del:(id,b)=>ask(()=>{const l=M[b.dataset.m].l();l.splice(l.findIndex(x=>x.id===id),1);sync('delete',b.dataset.m,{id});toast(t('deleted'))}),
 done:id=>{const a=D.assignments.find(x=>x.id===id);a.status=a.status==='done'?'pending':'done';sync('update','assign',a);render()},
 task:id=>{const k=D.tasks.find(x=>x.id===id);k.done=!k.done;sync('update','task',k);render()},
 hab:(id,b)=>{const h=D.habits.find(x=>x.id===id),i=+b.dataset.i;h.days[i]=h.days[i]?0:1;sync('update','hab',h);render()},
 gprog:id=>{const g=D.goals.find(x=>x.id===id);g.progress=Math.min(100,g.progress+10);sync('update','goal',g);render()},
 log:()=>form(t('logStudy'),[{n:'hours',l:'hours',t:'number',min:0.25}],{},o=>{D.study[(new Date().getDay()+6)%7]+=o.hours;store()}),
 tt:id=>{st.tt=id;render()},
 profile:async()=>{const v={};$$('[data-p]').forEach(i=>v[i.dataset.p]=i.value.trim());try{Object.assign(D.user,await U.api.call('updateProfile',v));toast(t('saved'));render()}catch(e){toast(errMsg(e))}},
 pwd:()=>form(t('password'),[{n:'current',l:'pwdCurrent',t:'password'},{n:'next',l:'pwdNew',t:'password'}],{},o=>{U.api.call('changePassword',o).then(()=>toast(t('saved'))).catch(e=>toast(errMsg(e)))}),
 logout:async()=>{try{if(U.push)await U.push.unlink();await U.api.call('logout')}catch(e){}localStorage.removeItem('ul_token');location.reload()},
 budget:()=>form(t('budget'),[{n:'budget',l:'budget',t:'number',min:0}],{budget:D.finance.budget},o=>{D.finance.budget=o.budget;store()}),
 'save-welcome':()=>{const title=$('[data-welcome="title"]')?.value.trim()||'',subtitle=$('[data-welcome="subtitle"]')?.value.trim()||'';if(title.length>80||subtitle.length>160)return toast('Please shorten your message.');U.prefs.welcomeTitle=title;U.prefs.welcomeSubtitle=subtitle;store();toast(t('saved'));render();},
 import:(_,b)=>U.importer.open(b.dataset.m),
 retry:()=>boot(),
 pushtest:async()=>{try{await U.api.call('pushTest');toast(t('pushSent'))}catch(e){toast(errMsg(e))}},
 install:async()=>{await U.push.install();render()},
 mv:(i,b)=>{const o=U.prefs.order,j=+i+ +b.dataset.d;if(j<0||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];store();acts.custom();render()},
 custom:()=>modal(`<h3>${t('customize')}</h3>${U.prefs.order.map((w,i)=>`<div class="item"><label class="grow row"><input type="checkbox" style="width:20px;min-height:20px" data-w="${w}" ${U.prefs.hidden.includes(w)?'':'checked'}> ${t(WN[w]||w)}</label><button class="icon-btn" data-act="mv" data-id="${i}" data-d="-1" aria-label="up">↑</button><button class="icon-btn" data-act="mv" data-id="${i}" data-d="1" aria-label="down">↓</button></div>`).join('')}<div class="row end" style="margin-top:12px"><button class="btn" data-act="close">${t('done')}</button></div>`)
 
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&acts[b.dataset.act])acts[b.dataset.act](b.dataset.id,b,e);else if(e.target.id==='modal')close()});
document.addEventListener('change',async e=>{const el=e.target,d=el.dataset;
 if(d.view){st[d.view]=el.value;return render()}
 if(d.w){const h=U.prefs.hidden,i=h.indexOf(d.w);i<0?h.push(d.w):h.splice(i,1);store();return render()}
 if(!d.set)return;const v=el.type==='checkbox'?el.checked:el.value;
 if(d.set.startsWith('notif.')){
  const key=d.set.slice(6);
  if(key==='push'&&v){ // permission prompt must start from this click
   el.disabled=true;
   const r=U.push?await U.push.enable():{error:'pushFail'};
   if(r.error){el.checked=false;el.disabled=false;return toast(t(r.error))}
   U.prefs.notif.push=true;store();toast(t('pushOn'));return render()}
  if(key==='push'){if(U.push)await U.push.disable();U.prefs.notif.push=false;store();toast(t('pushOff'));return render()}
  U.prefs.notif[key]=v;store();return}
 U.prefs[d.set]=v;store();if(d.set==='lang')await fmt.load(v);apply();render()});
$('#search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();$$('#view [data-s]').forEach(n=>n.hidden=!!q&&!n.dataset.s.toLowerCase().includes(q))});
addEventListener('hashchange',render);
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
U.M=M;U.ui={modal,close,toast,esc,t,load};U.CN=CN;
(async()=>{try{await fmt.load(U.prefs.lang)}catch(e){document.body.innerHTML='<p style="padding:24px">Serve this folder over HTTP (e.g. <code>python3 -m http.server</code>) so locale files can load.</p>';return}
 apply();await boot()})();
})();