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
const def={font:'Inter',theme:'auto',palette:'lavender',lang:'en',density:'comfortable',order:['calendar','academic','schedule','assignments','exams','finance','productivity','todayFocus','quickAccess','notes'],hidden:[],welcomeTitle:'Your campus, your pace.',welcomeSubtitle:'A little progress every day adds up. Keep your goals in sight.',notif:{push:false,assignments:true,classes:true,exams:true,finance:true,classReminderMinutes:[60],assignmentDays:[7,3,1,0],examDays:[7,3,1,0],inAppPopup:true,repeatUntilDismissed:true},widgetSizes:{}};
let saved={};try{saved=JSON.parse(localStorage.getItem('ul_prefs')||'{}')}catch(e){}
U.prefs={...def,...saved,theme:(saved.theme==='system'?'auto':(saved.theme||'auto')),notif:{...def.notif,...(saved.notif||{})}};
for(const k of ['classReminderMinutes','assignmentDays','examDays'])if(!Array.isArray(U.prefs.notif[k]))U.prefs.notif[k]=def.notif[k].slice();U.prefs.order=(U.prefs.order||[]).filter(w=>w!=='clock');U.prefs.hidden=(U.prefs.hidden||[]).filter(w=>w!=='clock');if(U.prefs.widgetSizes)delete U.prefs.widgetSizes.clock;
let tm;
// Temporary developer-only preview override; never persisted.
let devTimephase=null;
const local=()=>localStorage.setItem('ul_prefs',JSON.stringify(U.prefs));
const store=()=>{local();clearTimeout(tm);tm=setTimeout(pushPrefs,600)};
const errMsg=e=>t('err_'+((e&&e.code)||'server'));
function pushPrefs(){if(!U.api.token())return;const p=U.prefs;
 U.api.call('savePrefs',{font:p.font,theme:p.theme==='auto'?'system':p.theme,lang:p.lang,density:p.density,order:p.order,hidden:p.hidden,notif:p.notif,extra:{budget:D.finance.budget,study:D.study,welcomeTitle:p.welcomeTitle,welcomeSubtitle:p.welcomeSubtitle,palette:p.palette,widgetSizes:p.widgetSizes||{}}}).catch(e=>toast(errMsg(e)))}
function isNight(){const h=new Date().getHours();return h<6||h>=18}
function apply(){const p=U.prefs,r=document.documentElement;
 const mode=p.theme==='auto'||p.theme==='system'?(isNight()?'dark':'light'):p.theme;
 r.dataset.theme=mode;
 const fav=$('#app-favicon');if(fav)fav.href=mode==='dark'?'favicon-dark.ico':'favicon.ico';
 r.dataset.timephase=devTimephase|| (isNight()?'night':'day');
 r.dataset.density=p.density;r.dataset.palette=p.palette||'lavender';r.lang=p.lang;const family=`'${p.font}',system-ui,sans-serif`;r.style.setProperty('--font',family);r.style.setProperty('--font-display',family);
 $('#search').placeholder=t('search');const menuBtn=$('[data-act=menu].menu');if(menuBtn)menuBtn.setAttribute('aria-label',t('menu'));const themeBtn=$('[data-act=quicktheme]');if(themeBtn)themeBtn.setAttribute('aria-label',t('theme'))}
// Re-evaluate automatic appearance at minute intervals, using the device's local time.
setInterval(()=>{const before=document.documentElement.dataset.theme;apply();if(U.prefs.theme==='auto'||U.prefs.theme==='system'){if(before!==document.documentElement.dataset.theme)render()}},60000);
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
const modal=h=>{const m=$('#modal');m.hidden=false;m.innerHTML=`<div class="dlg" role="dialog">${h}</div>`;window.lucide&&lucide.createIcons();return m};
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
  if(o.start>=o.end)return toast(t('errEndBeforeStart'));
  let x=it;if(x)Object.assign(x,o);else{x={id:uid(),...o};l.push(x)}
  sync(it?'update':'create','cls',x);toast(t('saved'));close();render();
 };
 window.lucide&&lucide.createIcons();
}
function ask(fn){modal(`<h3>${t('confirmDelete')}</h3><div class="row end"><button class="btn ghost" data-act="close">${t('cancel')}</button><button class="btn danger" id="yes">${t('delete')}</button></div>`);$('#yes').onclick=()=>{fn();close();render()}}
// ---------- views ----------
const st={f:'all',tt:'week',gc:null};
const NOTE_COLORS={yellow:{bg:'#fff1a8',ink:'#554516'},pink:{bg:'#ffd6e7',ink:'#65364b'},blue:{bg:'#cfe8ff',ink:'#244663'},green:{bg:'#d8f3dc',ink:'#28543a'},purple:{bg:'#e7dcff',ink:'#4b376e'},orange:{bg:'#ffe0c2',ink:'#674326'}};
const W={
 academic:()=>card(t('academics'),`<div class="stats">${stat(t('gpa'),gpa(D.courses).toFixed(2))}${stat(t('cgpa'),cgpa().toFixed(2))}${stat(t('credits'),credits())}</div><small>${t('progress')} · ${Math.round(credits()/D.user.totalCredits*100)}%</small>${bar(credits()/D.user.totalCredits*100)}`),
 schedule:()=>{const l=todayCls();return card(t('today'),l.length?l.map(c=>`<div class="item"><span class="time">${c.start}</span><div class="grow"><b>${esc(c.course)}</b><small>${esc(c.room)} · ${c.start}–${c.end}</small></div></div>`).join(''):`<p class="muted">${t('noClasses')}</p>`)},
 assignments:()=>{const a=D.assignments,p=a.filter(x=>x.status!=='done'),od=p.filter(x=>left(x.due)<0),up=p.filter(x=>left(x.due)>=0).sort((x,y)=>x.due.localeCompare(y.due)).slice(0,3);
  return card(t('assignments'),`<div class="stats">${stat(t('pending'),p.length)}${stat(t('done'),a.length-p.length)}${stat(t('overdue'),od.length,'bad')}</div>`+up.map(x=>`<div class="item"><div class="grow"><b>${esc(x.title)}</b><small>${esc(x.course)} · ${fmt.date(x.due)}${left(x.due)>=0&&left(x.due)<10?` · ${left(x.due)} ${t('daysLeft')}`:''}</small></div>${badge(x.priority)}</div>`).join(''))},
 exams:()=>card(t('exams'),D.exams.length?[...D.exams].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<div class="item"><div class="grow"><b>${esc(e.course)}</b><small>${fmt.date(e.date)} · ${esc(e.time)} · ${esc(e.venue)}${left(e.date)>=0&&left(e.date)<10?` · ${left(e.date)} ${t('daysLeft')}`:''}</small></div><b class="${left(e.date)<10?'bad':''}">${left(e.date)} ${t('days')}</b></div>`).join(''):empty()),
 finance:()=>{const f=fin();return card(t('finance'),`<div class="stats">${stat(t('budget'),fmt.money(D.finance.budget))}${stat(t('expenses'),fmt.money(f.spent))}${stat(t('balance'),fmt.money(f.rem),f.rem<0?'bad':'ok')}</div><small>${t('savings')} · ${Math.round(f.pct)}%</small>${bar(f.pct)}`)},
 productivity:()=>{const i=(new Date().getDay()+6)%7,hd=D.habits.reduce((a,h)=>a+h.days.filter(Boolean).length,0),ht=D.habits.length*7;
  return card(t('productivity'),`<div class="stats">${stat(t('study'),D.study[i]+' h')}${stat(t('habits'),ht?Math.round(hd/ht*100)+'%':'–')}${stat(t('weekly'),D.study.reduce((a,b)=>a+b,0)+' h')}</div>`+chart(D.study,DAYS.map(t)))},
 calendar:()=>{const now=new Date(),first=new Date(now.getFullYear(),now.getMonth(),1),offset=(first.getDay()+6)%7,days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();const cal=DAYS.map(d=>`<span class="mini-day-label">${t(d).slice(0,1)}</span>`).join('')+'<i class="mini-day-blank"></i>'.repeat(offset)+Array.from({length:days},(_,i)=>{const ds=ymd(now.getFullYear(),now.getMonth(),i+1),ev=eventsOn(ds),n=ev.cls.length+ev.asg.length+ev.exm.length;return`<button class="mini-day ${i+1===now.getDate()?'today':''} ${n?'has':''}" data-act="day" data-id="${ds}" aria-label="${ds}">${i+1}</button>`}).join('');return `<section class="campus-card calendar-card"><div class="campus-card-head"><div><h3>${now.toLocaleDateString(fmt.loc(),{month:'long',year:'numeric'})}</h3><small>${t('calendarSubtitle')}</small></div><a href="#/timetable">${t('timetable')}</a></div><div class="mini-calendar">${cal}</div></section>`},
 todayFocus:()=>{const pending=D.assignments.filter(a=>a.status!=='done').sort((a,b)=>a.due.localeCompare(b.due)).slice(0,3),today=D.tasks.filter(x=>!x.done).slice(0,3),tasks=[...pending.map(a=>({title:a.title,sub:a.course||t('assignments'),date:fmt.date(a.due)})),...today.map(x=>({title:x.title,sub:t('task'),date:t('today')}))].slice(0,4);return card(t('todaysFocus'),`<div class="notes-widget-list">${tasks.map(x=>`<div class="item"><div class="grow"><b>${esc(x.title)}</b><small>${esc(x.sub)} · ${esc(x.date)}</small></div></div>`).join('')||`<p class="muted">${t('noFocusItems')}</p>`}</div><a class="welcome-link" href="#/assignments">${t('manageTasks')}</a>`)},
 quickAccess:()=>card(t('quickAccess'),`<div class="quick-links"><a href="#/assignments"><i data-lucide="notebook-pen"></i><span>${t('assignments')}</span></a><a href="#/timetable"><i data-lucide="calendar-days"></i><span>${t('timetable')}</span></a><a href="#/academics"><i data-lucide="graduation-cap"></i><span>${t('gpaTracker')}</span></a><a href="#/finance"><i data-lucide="wallet"></i><span>${t('finance')}</span></a></div>`),
 notes:()=>card(t('quickNotes'),`<div class="notes-launcher"><div class="notes-launcher-icon"><i data-lucide="sticky-note"></i></div><div class="notes-launcher-copy"><b>${t('stickyNotesTitle')}</b><small>${(D.notes||[]).length} · ${t('notesSaved')}</small></div><button class="btn note-add-btn" data-act="note-add"><i data-lucide="plus"></i>${t('addNote')}</button></div>`)
};
const WN={academic:'academics',schedule:'today',calendar:'academicCalendar',todayFocus:'todaysFocus',quickAccess:'quickAccess',notes:'quickNotes'};
function stickyNotesMarkup(){
 const notes=D.notes||[];
 const maxBottom=notes.reduce((m,n)=>Math.max(m,(Number(n.y)||0)+(Number(n.height)||220)),560);
 return `<div class="sticky-notes-layer" aria-label="${t('stickyNotesTitle')}">${notes.map((n,i)=>{
  const c=NOTE_COLORS[n.color]||NOTE_COLORS.yellow;
  const x=Number(n.x)||24+(i%3)*24,y=Number(n.y)||250+Math.floor(i/3)*24;
  const w=Number(n.width)||250,h=Number(n.height)||230;
  return `<article class="sticky-note" data-sticky-note="${esc(n.id)}" data-id="${esc(n.id)}" style="--note-bg:${c.bg};--note-ink:${c.ink};left:${x}px;top:${y}px;width:${w}px;height:${h}px;">
   <header class="sticky-note-head" data-note-drag="1"><span class="sticky-note-grip"><i data-lucide="grip-horizontal"></i></span><b>${esc(n.title)}</b>
    <div class="sticky-note-tools"><button class="sticky-note-more" data-act="sticky-menu" data-id="${esc(n.id)}" aria-label="${t('noteOptions')}"><i data-lucide="more-horizontal"></i></button>
     <div class="sticky-note-menu" hidden><button data-act="note-edit" data-id="${esc(n.id)}"><i data-lucide="pencil"></i>${t('edit')}</button><button data-act="note-move" data-id="${esc(n.id)}"><i data-lucide="move"></i>${t('moveNote')}</button><button data-act="note-resize" data-id="${esc(n.id)}"><i data-lucide="maximize-2"></i>${t('resizeNote')}</button><button class="danger" data-act="note-delete" data-id="${esc(n.id)}"><i data-lucide="trash-2"></i>${t('delete')}</button></div>
    </div></header>
   <div class="sticky-note-body">${esc(n.content).replace(/\n/g,'<br>')}</div><div class="sticky-note-hint">${t('stickyNoteHint')}</div><span class="sticky-note-resize" data-note-resize="1" aria-label="${t('resizeNote')}"></span>
  </article>`;
 }).join('')}</div><style id="sticky-notes-canvas-style">.dashboard-canvas{--sticky-canvas-min:${Math.max(620,maxBottom+40)}px}</style>`;
}
const views={
 dashboard(){const h=new Date().getHours(),g=h<12?'gm':h<18?'ga':'ge',u=D.user;
  const vis=U.prefs.order.filter(w=>!U.prefs.hidden.includes(w)&&W[w]);
  return `<div class="ph dashboard-head"><div><h1>${t(g)}, ${esc((u.name||'Student').split(' ')[0])} <span>✦</span></h1><small>${esc(u.university||'')} · ${esc(u.semester||'')} · ${esc(u.year||'')}</small></div><button class="btn ghost" data-act="custom"><i data-lucide="sliders-horizontal"></i>${t('customize')}</button></div>
  <div class="dashboard-canvas" id="dashboard-canvas"><section class="welcome-card dashboard-welcome"><div class="welcome-copy"><span class="eyebrow">${new Date().toLocaleDateString(fmt.loc(),{weekday:'long',month:'long',day:'numeric'})}</span><h2>${esc((U.prefs.welcomeTitle||def.welcomeTitle)==='Your campus, your pace.'?t('defaultWelcomeTitle'):(U.prefs.welcomeTitle||def.welcomeTitle))}</h2><p>${esc((U.prefs.welcomeSubtitle||def.welcomeSubtitle)==='A little progress every day adds up. Keep your goals in sight.'?t('defaultWelcomeSubtitle'):(U.prefs.welcomeSubtitle||def.welcomeSubtitle))}</p></div><div class="welcome-art" aria-hidden="true"><div class="celestial-sun"></div><img class="celestial-moon" src="assets/images/idle-moon.webp" alt=""><span class="celestial-star star-one"></span><span class="celestial-star star-two"></span><span class="art-cloud cloud-one"></span><span class="art-cloud cloud-two"></span><span class="art-cloud cloud-three"></span></div></section>
  <div class="dashboard-widget-grid">${vis.map(w=>`<div class="dashboard-widget widget-size-${(U.prefs.widgetSizes||{})[w]||'medium'} ${w==='notes'?'widget-notes':''}" data-widget="${w}"><div class="widget-tools"><button class="widget-more" data-act="widget-menu" data-id="${w}" aria-label="${t('widgetOptions')}" title="${t('widgetOptions')}"><i data-lucide="more-horizontal"></i></button><div class="widget-menu" hidden><small>${t('widgetSize')}</small><button data-act="widget-size" data-id="${w}" data-size="small">${t('sizeSmall')}</button><button data-act="widget-size" data-id="${w}" data-size="medium">${t('sizeMedium')}</button><button data-act="widget-size" data-id="${w}" data-size="large">${t('sizeLarge')}</button><hr><button class="widget-menu-remove" data-act="widget-remove" data-id="${w}">${t('removeWidget')}</button></div></div>${W[w]()}</div>`).join('')||`<div class="dashboard-empty"><i data-lucide="layout-dashboard"></i><b>${t('noWidgets')}</b><p>${t('addWidgetsHint')}</p><button class="btn" data-act="custom">${t('addWidgets')}</button></div>`}</div>${stickyNotesMarkup()}</div>`},
 academics(){const cr=curCr();
  return head('academics','course')+`<div class="grid">${card(t('calc'),`<div class="stats">${stat(t('gpa'),gpa(D.courses).toFixed(2))}${stat(t('cgpa'),cgpa().toFixed(2))}${stat(t('credits'),credits())}</div>${bar(credits()/D.user.totalCredits*100)}`)}${card(t('history'),chart([...D.history.map(h=>h.gpa),gpa(D.courses)].map(v=>+v.toFixed(2)),[...D.history.map(h=>h.sem),'•'])+D.history.map(h=>`<div class="item" data-s="${esc(h.sem)}"><div class="grow"><b>${esc(h.sem)}</b><small>${h.credits} · GPA ${h.gpa}</small></div>${ctl('hist',h.id)}</div>`).join('')+`<button class="btn ghost" data-act="new" data-m="hist"><i data-lucide="plus"></i>${t('add')}</button>`)}${card(t('courseItem'),`<div class="scroll"><table><tr><th>${t('code')}</th><th>${t('name')}</th><th>${t('credit')}</th><th>${t('grade')}</th><th></th></tr>${D.courses.map(c=>`<tr data-s="${esc(c.code+c.name)}"><td>${esc(c.code)}</td><td>${esc(c.name)}</td><td>${c.credit}</td><td>${esc(c.grade)}</td><td class="row">${ctl('course',c.id)}</td></tr>`).join('')}</table></div>`,'wide')}</div>`},
 assignments(){const f=st.f,l=D.assignments.map(a=>({...a,s:asgState(a)})).filter(a=>f==='all'||a.s===f).sort((a,b)=>a.due.localeCompare(b.due));
  return head('assignments','assign',sel('data-view="f"',['all','pending','inprogress','done','overdue'],f))+card('',l.length?l.map(a=>`<div class="item" data-s="${esc(a.title+a.course)}"><button class="chk ${a.status==='done'?'on':''}" data-act="done" data-id="${a.id}" aria-label="${t('done')}"><i data-lucide="check"></i></button><div class="grow"><b>${esc(a.title)}</b><small>${esc(a.course)} · ${fmt.date(a.due)}${left(a.due)>=0&&left(a.due)<10?` · ${left(a.due)} ${t('daysLeft')}`:''}${a.notes?' · '+esc(a.notes):''}</small></div>${badge(a.priority)}${badge(a.s)}${ctl('assign',a.id)}</div>`).join(''):empty())},
 timetable(){const w=st.tt==='week';
  const tog=`<div class="row"><button class="btn ${w?'':'ghost'}" data-act="tt" data-id="week">${t('week')}</button><button class="btn ${w?'ghost':''}" data-act="tt" data-id="month">${t('month')}</button></div>`;
  let body;
  if(w)body=`<div class="week">${DAYS.map(d=>card(t(d),D.classes.filter(c=>dk(c)===d).sort((a,b)=>a.start.localeCompare(b.start)).map(c=>`<div class="cls" data-s="${esc(c.course+c.room+c.lecturer)}"><b>${esc(c.course)}</b>${c.start}–${c.end}<br>${esc(c.room)}${c.lecturer?' · '+esc(c.lecturer):''}<div class="row">${ctl('cls',c.id)}</div></div>`).join('')||`<small>${t('noClasses')}</small>`)).join('')}</div>`;
  else{const n=new Date(),b=new Date(n.getFullYear(),n.getMonth()+(st.cm||0),1),y=b.getFullYear(),mo=b.getMonth(),first=(b.getDay()+6)%7,len=new Date(y,mo+1,0).getDate();
   let cells=DAYS.map(d=>`<small>${t(d)}</small>`).join('')+'<span class="cal-blank"></span>'.repeat(first);
   for(let d=1;d<=len;d++){const ds=ymd(y,mo,d),e=eventsOn(ds),isT=!st.cm&&d===n.getDate();
    const items=[...e.exm.map(x=>['e',x.course]),...e.asg.map(x=>['a',x.title]),...e.cls.map(x=>['c',x.course])];
    const chips=items.slice(0,2).map(([k,x])=>`<span class="chip ${k}">${esc(x)}</span>`).join('')+(items.length>2?`<span class="chip more">+${items.length-2}</span>`:'');
    cells+=`<button class="cal-day ${isT?'td':''}" data-act="day" data-id="${ds}" aria-label="${ds}"><span class="cal-num">${d}</span><span class="cal-dots">${e.cls.length?'<span class="dot"></span>':''}${e.asg.length?'<span class="dot a"></span>':''}${e.exm.length?'<span class="dot e"></span>':''}</span><span class="cal-chips">${chips}</span></button>`}
   body=card('',`<div class="cal-nav"><button class="icon-btn" data-act="cmonth" data-id="-1" aria-label="${t('previousMonth')}"><i data-lucide="chevron-left"></i></button><h3>${b.toLocaleDateString(fmt.loc(),{month:'long',year:'numeric'})}</h3><button class="icon-btn" data-act="cmonth" data-id="1" aria-label="${t('nextMonth')}"><i data-lucide="chevron-right"></i></button><button class="btn ghost cal-today" data-act="cmonth" data-id="0">${t('today')}</button></div><div class="cal">${cells}</div><div class="cal-legend"><span><i class="dot"></i>${t('classes')}</span><span><i class="dot a"></i>${t('assignments')}</span><span><i class="dot e"></i>${t('exams')}</span></div>`)}
  return head('timetable','cls',tog)+body},
 exams(){const l=[...D.exams].sort((a,b)=>a.date.localeCompare(b.date));
  return head('exams','exam')+`<div class="grid">${l.length?l.map(e=>card(esc(e.course),`<div class="stats">${stat(t('countdown'),left(e.date)+' '+t('days'),left(e.date)<10?'bad':'')}</div><small>${fmt.date(e.date,{day:'numeric',month:'long',year:'numeric'})} · ${esc(e.time)} · ${esc(e.venue)}</small><p style="margin:10px 0"><b>${t('revision')}:</b> ${esc(e.revision||'–')}</p><div class="row end">${ctl('exam',e.id)}</div>`)).join(''):card('',empty())}</div>`},
 finance(){const f=fin();
  return head('finance','tx',`<button class="btn ghost" data-act="budget">${t('budget')}</button>`)+`<div class="grid">${card(t('budget'),`<div class="stats">${stat(t('budget'),fmt.money(D.finance.budget))}${stat(t('expenses'),fmt.money(f.spent))}${stat(t('balance'),fmt.money(f.rem),f.rem<0?'bad':'ok')}</div>${bar(f.spent/D.finance.budget*100)}<small>${t('income')}: ${fmt.money(f.inc)}</small>`)}${card(t('sGoal'),D.finance.goals.map(g=>`<div class="item"><div class="grow"><b>${esc(g.title)}</b><small>${fmt.money(g.saved)} / ${fmt.money(g.target)}</small>${bar(g.saved/g.target*100)}</div>${ctl('sg',g.id)}</div>`).join('')+`<button class="btn ghost" data-act="new" data-m="sg"><i data-lucide="plus"></i>${t('add')}</button>`)}${card(t('transaction'),[...D.finance.tx].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<div class="item" data-s="${esc(x.cat)}"><div class="grow"><b>${t(x.cat)}</b><small>${fmt.date(x.date)}</small></div><b class="${x.type==='income'?'ok':''}">${x.type==='income'?'+':'−'}${fmt.money(x.amount)}</b>${ctl('tx',x.id)}</div>`).join('')||empty(),'wide')}</div>`},
 productivity(){const i=(new Date().getDay()+6)%7;
  return head('productivity','',`<button class="btn" data-act="log"><i data-lucide="timer"></i>${t('logStudy')}</button>`)+`<div class="grid">${card(t('study'),chart(D.study,DAYS.map(t)))}${card(t('habits'),D.habits.map(h=>`<div class="item"><div class="grow"><b>${esc(h.name)}</b></div><div class="hab">${h.days.map((d,j)=>`<button class="chk ${d?'on':''}" data-act="hab" data-id="${h.id}" data-i="${j}" title="${t(DAYS[j])}" ${j===i?'style="border-color:var(--primary)"':''}><i data-lucide="check"></i></button>`).join('')}</div>${ctl('hab',h.id)}</div>`).join('')+`<button class="btn ghost" data-act="new" data-m="hab"><i data-lucide="plus"></i>${t('add')}</button>`)}${card(t('tasks'),D.tasks.map(k=>`<div class="item" data-s="${esc(k.title)}"><button class="chk ${k.done?'on':''}" data-act="task" data-id="${k.id}"><i data-lucide="check"></i></button><div class="grow"><b style="${k.done?'text-decoration:line-through;opacity:.6':''}">${esc(k.title)}</b></div>${ctl('task',k.id)}</div>`).join('')+`<button class="btn ghost" data-act="new" data-m="task"><i data-lucide="plus"></i>${t('add')}</button>`)}${card(t('goals'),D.goals.map(g=>`<div class="item"><div class="grow"><b>${esc(g.title)}</b>${bar(g.progress)}<small>${g.progress}%</small></div><button class="icon-btn" data-act="gprog" data-id="${g.id}" aria-label="+10%"><i data-lucide="trending-up"></i></button>${ctl('goal',g.id)}</div>`).join('')+`<button class="btn ghost" data-act="new" data-m="goal"><i data-lucide="plus"></i>${t('add')}</button>`)}</div>`},
 settings(){const p=U.prefs,n=p.notif,u=D.user;
  const tog=(k,l)=>`<label class="item"><span class="grow">${t(l)}</span><input type="checkbox" style="width:22px;min-height:22px" data-set="notif.${k}" ${n[k]?'checked':''}></label>`;
  const avatar=u.avatar_url||u.avatarUrl||localStorage.getItem('ul_avatar')||'';
  setTimeout(()=>{const x=$('#ul-calendar-last-sync');if(x)x.textContent=localStorage.getItem('ul_calendar_last_sync')||t('notSyncedYet');},0);
  const palettes=[['lavender',t('paletteLavender'),'#8068bd'],['forest',t('paletteForest'),'#66866a'],['sky',t('paletteSky'),'#6398ce'],['ocean',t('paletteOcean'),'#318b98'],['gamer',t('paletteGamer'),'#8657d8'],['warm',t('paletteWarm'),'#b88b65']];
  const welcomeTitle=(p.welcomeTitle||def.welcomeTitle)==='Your campus, your pace.'?t('defaultWelcomeTitle'):(p.welcomeTitle||def.welcomeTitle);
  const welcomeSubtitle=(p.welcomeSubtitle||def.welcomeSubtitle)==='A little progress every day adds up. Keep your goals in sight.'?t('defaultWelcomeSubtitle'):(p.welcomeSubtitle||def.welcomeSubtitle);
  return head('settings')+`<div class="grid">
   ${card(t('dashboardMessage'),`<p class="muted">${t('dashboardMessageHint')}</p><label class="field">${t('headline')}<input data-welcome="title" value="${esc(welcomeTitle)}" maxlength="80" placeholder="${t('defaultWelcomeTitle')}"></label><label class="field">${t('supportingSentence')}<input data-welcome="subtitle" value="${esc(welcomeSubtitle)}" maxlength="160" placeholder="${t('defaultWelcomeSubtitle')}"></label><div class="row end"><button class="btn" data-act="save-welcome">${t('saveMessage')}</button></div>`)}
   ${card(t('themeStudio'),`<p class="muted">${t('themeStudioHint')}</p><div class="theme-gallery">${palettes.map(([id,name,color])=>`<button type="button" class="theme-swatch ${p.palette===id?'selected':''}" data-act="palette" data-id="${id}" aria-pressed="${p.palette===id}"><span class="theme-preview" style="--swatch:${color}"><i></i><i></i><i></i></span><b>${name}</b>${p.palette===id?`<small>${t('selected')}</small>`:''}</button>`).join('')}</div><label class="field">${t('appearance')}<select data-set="theme"><option value="auto" ${p.theme==='auto'?'selected':''}>${t('automaticDayNight')}</option><option value="light" ${p.theme==='light'?'selected':''}>${t('light')}</option><option value="dark" ${p.theme==='dark'?'selected':''}>${t('dark')}</option></select></label><label class="field">${t('density')}${sel('data-set="density"',['comfortable','compact'],p.density)}</label><label class="field">${t('font')}<select data-set="font" style="font-family:'${p.font}',system-ui,sans-serif">${U.config.fonts.map(f=>`<option value="${f}" ${f===p.font?'selected':''} style="font-family:'${f}',system-ui,sans-serif">${f}</option>`).join('')}</select><div class="font-preview" style="font-family:'${p.font}',system-ui,sans-serif"><b>${t('fontPreview')}</b><span>${t('fontPreviewSentence')}</span></div></label>`)}
   ${card(t('profile'),`<div class="profile-editor"><img class="profile-preview" src="${avatar||''}" alt="" onerror="this.style.display='none'" style="${avatar?'':'display:none'}"><div class="profile-fallback" style="${avatar?'display:none':''}">${esc((u.name||'U').trim().charAt(0).toUpperCase())}</div><div class="grow"><b>${esc(u.name||t('student'))}</b><small>${esc(u.email||'')}</small><label class="btn ghost profile-upload"><i data-lucide="image-plus"></i> ${t('changePhoto')}<input id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp" hidden></label></div></div>${[['name','student'],['university','university'],['semester','semester'],['year','year']].map(([k,l])=>`<label class="field">${t(l)}<input data-p="${k}" value="${esc(u[k])}" maxlength="80"></label>`).join('')}<div class="row"><button class="btn" data-act="profile">${t('save')}</button><button class="btn ghost" data-act="pwd">${t('password')}</button><button class="btn ghost" data-act="logout">${t('logout')}</button></div>`)}
   ${card(t('language'),`<label class="field">${t('language')}<select data-set="lang"><option value="en" ${p.lang==='en'?'selected':''}>English</option><option value="ms" ${p.lang==='ms'?'selected':''}>Bahasa Melayu</option></select></label>`)}
   ${card(t('notificationSettings'),`<p class="muted">${t('notificationSettingsHint')}</p><h4>${t('deliveryOptions')}</h4>${tog('push','enablePush')}${tog('inAppPopup','inAppPopup')}${tog('repeatUntilDismissed','repeatUntilDismissed')}<h4>${t('classReminders')}</h4>${tog('classes','classReminders')}<p class="muted">${t('classReminderHint')}</p><div class="choice-grid">${[15,30,45,60,90].map(v=>`<label class="item"><span class="grow">${v} ${t('minutesBefore')}</span><input type="checkbox" style="width:22px;min-height:22px" data-set="notif.classReminderMinutes" value="${v}" ${n.classReminderMinutes.includes(v)?'checked':''}></label>`).join('')}</div><h4>${t('assignReminders')}</h4>${tog('assignments','assignReminders')}<p class="muted">${t('assignmentReminderHint')}</p><div class="choice-grid">${[7,3,1,0].map(v=>`<label class="item"><span class="grow">${v===0?t('dueDate'):v+' '+t('daysBefore')}</span><input type="checkbox" style="width:22px;min-height:22px" data-set="notif.assignmentDays" value="${v}" ${n.assignmentDays.includes(v)?'checked':''}></label>`).join('')}</div><h4>${t('examReminders')}</h4>${tog('exams','examReminders')}<p class="muted">${t('examReminderHint')}</p><div class="choice-grid">${[7,3,1,0].map(v=>`<label class="item"><span class="grow">${v===0?t('examDay'):v+' '+t('daysBefore')}</span><input type="checkbox" style="width:22px;min-height:22px" data-set="notif.examDays" value="${v}" ${n.examDays.includes(v)?'checked':''}></label>`).join('')}</div><h4>${t('financeAlerts')}</h4>${tog('finance','financeAlerts')}${U.push?U.push.panel():''}`)}
   ${card(t('googleCalendar'),`<p class="muted">${t('googleCalendarHint')}</p><div class="item"><span class="grow">${t('connectionStatus')}</span><b id="ul-calendar-status">${t('notChecked')}</b></div><div class="item"><span class="grow">${t('lastSuccessfulSync')}</span><small id="ul-calendar-last-sync">${t('notSyncedYet')}</small></div><div class="row" style="flex-wrap:wrap"><button class="btn" data-act="calendar-connect"><i data-lucide="calendar-plus"></i> ${t('connectGoogle')}</button><button class="btn ghost" data-act="calendar-status"><i data-lucide="refresh-cw"></i> ${t('checkStatus')}</button></div><div class="row" style="flex-wrap:wrap"><button class="btn" data-act="calendar-sync"><i data-lucide="refresh-cw"></i> ${t('syncNow')}</button><button class="btn ghost" data-act="calendar-disconnect">${t('disconnect')}</button></div><small class="muted" id="ul-calendar-message">${t('calendarSyncIncludes')}</small>`)}
   ${card(t('developerLab'),`<p class="muted">${t('developerLabHint')}</p><div class="row end"><button class="btn ghost" data-act="developer"><i data-lucide="flask-conical"></i> ${t('openDeveloperLab')}</button></div>`)}
  </div>`}

 ,
 developer(){const phase=document.documentElement.dataset.timephase||'day';const mode=document.documentElement.dataset.theme||'light';const perm=('Notification' in window)?Notification.permission:'unsupported';return `<div class="ph"><div><h1>${t('developerLab')}</h1><small>${t('developerLabSubtitle')}</small></div><button class="btn ghost" data-act="go-settings"><i data-lucide="arrow-left"></i> ${t('settings')}</button></div><div class="dev-lab"><div class="dev-warning"><i data-lucide="flask-conical"></i><div><b>${t('temporaryWorkspace')}</b><small>${t('temporaryWorkspaceHint')}</small></div></div><div class="grid">${card(t('dayNightPreview'),`<p class="muted">${t('dayNightPreviewHint')}</p><div class="dev-status"><span>${t('currentPreview')}</span><b>${phase==='night'?t('nightMoon'):t('daySun')}</b></div><div class="row"><button class="btn" data-act="dev-day">☀ ${t('testDay')}</button><button class="btn" data-act="dev-night">☾ ${t('testNight')}</button><button class="btn ghost" data-act="dev-live">${t('useLiveTime')}</button><button class="btn ghost" data-act="dev-open-panel">${t('backToTools')}</button></div>`)}${card(t('notificationTests'),`<p class="muted">${t('notificationTestsHint')}</p><div class="dev-status"><span>${t('browserPermission')}</span><b>${esc(perm)}</b></div><div class="row"><button class="btn" data-act="dev-local-notif">${t('testLocalNotification')}</button><button class="btn ghost" data-act="pushtest">${t('testServerPush')}</button></div><small class="muted">${t('notificationTestsFootnote')}</small>`)}${card(t('reminderPopupTests'),`<p class="muted">${t('reminderPopupTestsHint')}</p><div class="row"><button class="btn" data-act="dev-preview-reminder"><i data-lucide="eye"></i> ${t('previewReminderPopup')}</button></div><small class="muted">${t('reminderPopupTestsFootnote')}</small>`)}${card(t('appDiagnostics'),`<div class="dev-diagnostics"><div><span>${t('appearance')}</span><b>${t(mode==='dark'?'dark':'light')} / ${t(phase==='night'?'night':'day')}</b></div><div><span>${t('selectedPalette')}</span><b>${esc(U.prefs.palette||'lavender')}</b></div><div><span>${t('apiEndpoint')}</span><b>${U.config.apiUrl?t('configured'):t('notConfigured')}</b></div><div><span>${t('loginToken')}</span><b>${U.api.token()?t('present'):t('missing')}</b></div><div><span>${t('serviceWorker')}</span><b id="dev-sw-status">${t('checking')}</b></div><div><span>${t('pushSupport')}</span><b>${U.push&&U.push.supported()?t('supported'):t('unavailable')}</b></div></div><div class="row end"><button class="btn ghost" data-act="dev-refresh">${t('refreshDiagnostics')}</button></div>`)}${card(t('resetTestOverrides'),`<p class="muted">${t('resetTestOverridesHint')}</p><button class="btn ghost" data-act="dev-live">${t('clearTestingOverride')}</button>`)}</div></div>`}

};
// ---------- server sync ----------
const CN={assign:'assignments',cls:'classes',exam:'exams',tx:'tx',sg:'sg',course:'courses',hab:'habits',task:'tasks',goal:'goals',hist:'semesters'};
async function sync(op,m,item){try{await U.api.call(op,{c:CN[m],item})}catch(e){toast(errMsg(e))}}
function hydrate(r){const d=r.data;Object.assign(D.user,r.user);
 const authLang=localStorage.getItem('ul_auth_lang_override');Object.assign(U.prefs,r.prefs,{notif:{...U.prefs.notif,...r.prefs.notif}});if(authLang==='en'||authLang==='ms'){U.prefs.lang=authLang;localStorage.removeItem('ul_auth_lang_override');setTimeout(pushPrefs,0)}U.prefs.order=(U.prefs.order||[]).filter(w=>w!=='clock');U.prefs.hidden=(U.prefs.hidden||[]).filter(w=>w!=='clock');if(U.prefs.widgetSizes)delete U.prefs.widgetSizes.clock;if(U.prefs.theme==='system')U.prefs.theme='auto';if(r.data.welcomeTitle!==undefined)U.prefs.welcomeTitle=r.data.welcomeTitle;if(r.data.welcomeSubtitle!==undefined)U.prefs.welcomeSubtitle=r.data.welcomeSubtitle;U.prefs.widgetSizes=r.data.widgetSizes||U.prefs.widgetSizes||{};delete U.prefs.widgetSizes.clock;local();
 Object.assign(D,{courses:d.courses,assignments:d.assignments,classes:d.classes,exams:d.exams,finance:{budget:d.budget,tx:d.tx,goals:d.sg},habits:d.habits,tasks:d.tasks,goals:d.goals,history:d.semesters,study:d.study,notes:d.notes||[]})}
async function load(){
  $('#view').innerHTML=`<div class="empty"><i data-lucide="loader"></i><p>${t('loading')}</p></div>`;
  window.lucide&&lucide.createIcons();
  try {
    const r=await U.api.call('bootstrap');
    hydrate(r);
    if (U.timezone) {
      U.timezone.sync(D.user).catch(e =>
        console.warn('UniLife timezone sync deferred:', e && e.code || e)
      );
    }
    if(U.prefs.lang!==fmt.lang) await fmt.load(U.prefs.lang);
    apply(); render(); U.push&&U.push.sync();
    return true;
  } catch(e) {
    if(e.code==='auth') return false;
    $('#view').innerHTML=`<div class="empty"><p>${errMsg(e)}</p><button class="btn" data-act="retry">${t('retry')}</button></div>`;
    return true;
  }
}
async function boot(){
 if(!U.config.apiUrl){$('#view').innerHTML=`<div class="empty"><p>${t('err_noApi')}</p></div>`;return}
 let resetRequested = new URLSearchParams(location.search).has('reset');
 if(resetRequested) localStorage.removeItem('ul_token');
 for(;;){apply();if(!resetRequested&&U.api.token()&&await load())break;localStorage.removeItem('ul_token');await U.auth.show();resetRequested=false;apply()}}
// ---------- router / render ----------
const route=()=>{const r=location.hash.replace('#/','');return views[r]?r:'dashboard'};
function render(){const r=route();
 $('#nav').innerHTML=U.config.nav.map(k=>`<a href="#/${k}" class="${k===r?'on':''}"><i data-lucide="${U.config.icons[k]}"></i><span>${t(k)}</span></a>`).join('');
 $('#bottomnav').innerHTML=['dashboard','assignments','timetable','finance'].map(k=>`<a href="#/${k}" class="${k===r?'on':''}"><i data-lucide="${U.config.icons[k]}"></i>${t(k)}</a>`).join('')+`<button data-act="menu"><i data-lucide="menu"></i>${t('more')}</button>`;
 $('#view').innerHTML=views[r]();$('#search').value='';if(r==='developer')acts['dev-refresh']();
 const topProfile=$('#top-profile');if(topProfile){const av=D.user.avatar_url||D.user.avatarUrl||localStorage.getItem('ul_avatar')||'';const nm=D.user.name||t('student');topProfile.innerHTML=`<button class="top-profile-btn" data-act="profile-menu" aria-label="${t('openProfile')}">${av?`<img src="${av}" alt="">`:`<span>${esc(nm.trim().charAt(0).toUpperCase())}</span>`}<span class="top-profile-name"><b>${esc(nm)}</b><small>${esc(D.user.email||'')}</small></span><i data-lucide="chevron-down"></i></button>`;}
 $('#sidebar').classList.remove('open');$('#scrim').classList.remove('open');
 window.lucide&&lucide.createIcons()}
// ---------- actions ----------
// Unified Reminder Centre: assignments and examinations only.
// Classes remain in Calendar and are not shown in this popup.
let activeDuePopupKey='';
function previewReminderPopup(){
 const lang=U.prefs.lang==='ms';
 const today=new Date();today.setHours(0,0,0,0);
 const fmt=days=>{const d=new Date(today);d.setDate(d.getDate()+days);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 const samples=[
  {type:'assignment',title:lang?'Hantar tugasan akhir':'Submit final assignment',course:'Web Development',date:fmt(0),days:0,level:'urgent'},
  {type:'exam',title:lang?'Peperiksaan Database Systems':'Database Systems Examination',course:'Database Systems',date:fmt(2),days:2,level:'high'},
  {type:'assignment',title:lang?'Laporan projek berkumpulan':'Group project report',course:'Software Engineering',date:fmt(6),days:6,level:'upcoming'}
 ];
 const labels={urgent:lang?'SEGERA':'URGENT',high:lang?'KEUTAMAAN TINGGI':'HIGH PRIORITY',upcoming:lang?'AKAN DATANG':'UPCOMING'};
 const rows=samples.map(x=>{
  const color=x.level==='urgent'?'#dc4545':x.level==='high'?'#d58a20':'#5686d8';
  const kind=x.type==='assignment'?(lang?'TUGASAN':'ASSIGNMENT'):(lang?'PEPERIKSAAN':'EXAMINATION');
  const when=x.days===0?(lang?'Hari ini':'Due today'):(lang?`${x.days} hari lagi`:`${x.days} days left`);
  return `<div class="item" style="align-items:flex-start;gap:12px;border-left:4px solid ${color};padding:12px;margin:8px 0"><div class="grow" style="min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="badge" style="color:${color};border-color:${color}">${labels[x.level]}</span><small class="muted">${kind}</small></div><b style="display:block;margin-top:6px">${esc(x.title)}</b><div class="muted" style="font-size:12px;margin-top:3px">${esc(x.course)}</div><small class="muted" style="display:block;margin-top:5px">${lang?'Tarikh':'Date'}: ${esc(x.date)} · ${when}</small></div></div>`;
 }).join('');
 activeDuePopupKey='preview';
 modal(`<div class="day-head"><div><small>${lang?'Pusat Peringatan':'Reminder Centre'}</small><h3>${lang?'Pratonton ujian':'Test preview'}</h3></div><span class="badge">${samples.length}</span></div><div class="dev-warning" style="margin:10px 0"><i data-lucide="flask-conical"></i><div><b>${lang?'Mod pratonton':'Preview only'}</b><small>${lang?'Data contoh sahaja. Reminder sebenar tidak diubah.':'Sample items only. Real reminders and dismissal records are untouched.'}</small></div></div><div style="max-height:55vh;overflow:auto;margin:12px 0">${rows}</div><div class="row end"><button class="btn" data-act="dev-close-reminder-preview">${lang?'Tutup pratonton':'Close preview'}</button></div>`);
 window.lucide&&lucide.createIcons();
}
function checkDueDatePopup(){
 if(!D.user||!D.user.id||!U.prefs.notif.inAppPopup)return;
 const n=U.prefs.notif||{},uid=D.user.id;
 const candidates=[];
 const addCandidate=(type,item,date)=>{
  const days=left(date);
  const offsets=type==='assignment'?(n.assignmentDays||[7,3,1,0]):(n.examDays||[7,3,1,0]);
  // Keep overdue work visible as urgent; otherwise respect each category's timing.
  if(days<0||offsets.includes(days)){
   const key=type+'|'+item.id+'|'+date;
   const explicit=String(item.priority||'').toLowerCase();
   let level='upcoming';
   if(days<=0||['urgent','critical'].includes(explicit))level='urgent';
   else if(days<=3||['high','important'].includes(explicit))level='high';
   candidates.push({type,item,date,days,key,level});
  }
 };
 if(n.assignments){
  (D.assignments||[]).filter(a=>a.status!=='done'&&/^\d{4}-\d{2}-\d{2}$/.test(String(a.due||'')))
   .forEach(a=>addCandidate('assignment',a,a.due));
 }
 if(n.exams){
  (D.exams||[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||'')))
   .forEach(x=>addCandidate('exam',x,x.date));
 }
 const rank={urgent:0,high:1,upcoming:2};
 candidates.sort((a,b)=>rank[a.level]-rank[b.level]||a.days-b.days||a.date.localeCompare(b.date));
 let dismissed={},shown={};
 try{dismissed=JSON.parse(localStorage.getItem('ul_due_dismissed_'+uid)||'{}')||{};}catch(e){}
 try{shown=JSON.parse(localStorage.getItem('ul_due_shown_'+uid)||'{}')||{};}catch(e){}
 const active=candidates.filter(x=>!dismissed[x.key]&&(n.repeatUntilDismissed||!shown[x.key]));
 if(!active.length)return;
 if(!$('#modal').hidden&&activeDuePopupKey==='digest')return;
 if(!$('#modal').hidden)return;
 activeDuePopupKey='digest';
 if(!n.repeatUntilDismissed){
  active.forEach(x=>shown[x.key]=Date.now());
  try{localStorage.setItem('ul_due_shown_'+uid,JSON.stringify(shown));}catch(e){}
 }
 const lang=U.prefs.lang==='ms';
 const levelLabel=x=>x.level==='urgent'?(lang?'SEGERA':'URGENT'):x.level==='high'?(lang?'KEUTAMAAN TINGGI':'HIGH PRIORITY'):(lang?'AKAN DATANG':'UPCOMING');
 const dateLabel=x=>x.days<0?(lang?`Lewat ${Math.abs(x.days)} hari`:`${Math.abs(x.days)} days overdue`):x.days===0?(lang?'Hari ini':'Due today'):(lang?`${x.days} hari lagi`:`${x.days} days left`);
 const rows=active.map(x=>{
  const title=x.type==='assignment'?(x.item.title||t('assignments')):(x.item.course||x.item.title||t('exams'));
  const kind=x.type==='assignment'?(lang?'TUGASAN':'ASSIGNMENT'):(lang?'PEPERIKSAAN':'EXAMINATION');
  const sub=x.type==='assignment'&&x.item.course?`<div class="muted" style="font-size:12px;margin-top:3px">${esc(x.item.course)}</div>`:'';
  const color=x.level==='urgent'?'#dc4545':x.level==='high'?'#d58a20':'#5686d8';
  return `<div class="item" style="align-items:flex-start;gap:12px;border-left:4px solid ${color};padding:12px;margin:8px 0">
   <div class="grow" style="min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="badge" style="color:${color};border-color:${color}">${levelLabel(x)}</span><small class="muted">${kind}</small></div>
   <b style="display:block;margin-top:6px">${esc(title)}</b>${sub}
   <small class="muted" style="display:block;margin-top:5px">${lang?'Tarikh':'Date'}: ${esc(x.date)} · ${dateLabel(x)}</small></div>
  </div>`;
 }).join('');
 const heading=lang?'Pusat Peringatan':'Reminder Centre';
 const summary=lang?`${active.length} perkara memerlukan perhatian`:`${active.length} item${active.length===1?'':'s'} need your attention`;
 const dismiss=lang?'Tutup Semua':'Dismiss All';
 modal(`<div class="day-head"><div><small>${heading}</small><h3>${summary}</h3></div><span class="badge">${active.length}</span></div>
 <div style="max-height:55vh;overflow:auto;margin:12px 0">${rows}</div>
 <p class="muted" style="font-size:12px">${lang?'Peringatan kelas boleh dilihat dalam Calendar.':'Class reminders are available in Calendar.'}</p>
 <div class="row end"><button class="btn" data-act="dismiss-all-due-reminders">${dismiss}</button></div>`);
 window.lucide&&lucide.createIcons();
}
function dismissAllDueReminders(){
 if(!D.user||!D.user.id)return;
 const uid=D.user.id,n=U.prefs.notif||{},candidates=[];
 const add=(type,item,date)=>{
  const days=left(date),offsets=type==='assignment'?(n.assignmentDays||[7,3,1,0]):(n.examDays||[7,3,1,0]);
  if(days<0||offsets.includes(days))candidates.push(type+'|'+item.id+'|'+date);
 };
 if(n.assignments)(D.assignments||[]).filter(a=>a.status!=='done'&&/^\d{4}-\d{2}-\d{2}$/.test(String(a.due||''))).forEach(a=>add('assignment',a,a.due));
 if(n.exams)(D.exams||[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||''))).forEach(x=>add('exam',x,x.date));
 let dismissed={};try{dismissed=JSON.parse(localStorage.getItem('ul_due_dismissed_'+uid)||'{}')||{};}catch(e){}
 candidates.forEach(key=>dismissed[key]=Date.now());
 try{localStorage.setItem('ul_due_dismissed_'+uid,JSON.stringify(dismissed));}catch(e){}
 activeDuePopupKey='';
 close();
}
function dayPopup(ds){const e=eventsOn(ds),total=e.cls.length+e.asg.length+e.exm.length;
 const sec=(title,rows)=>rows.length?`<div class="day-sec"><h4>${title}<span>${rows.length}</span></h4>${rows.join('')}</div>`:'';
 const cls=e.cls.map(c=>`<div class="day-item k-c"><i class="day-bar"></i><div class="grow"><b>${esc(c.course)}</b><small>${esc(c.start)}–${esc(c.end)}${c.room?' · '+esc(c.room):''}${c.lecturer?' · '+esc(c.lecturer):''}</small></div>${ctl('cls',c.id)}</div>`);
 const asg=e.asg.map(a=>`<div class="day-item k-a"><i class="day-bar"></i><div class="grow"><b>${esc(a.title)}</b><small>${esc(a.course||'')}${left(ds)>=0&&left(ds)<10?' · '+left(ds)+' '+t('daysLeft'):''}</small></div>${badge(asgState(a))}${ctl('assign',a.id)}</div>`);
 const exm=e.exm.map(x=>`<div class="day-item k-e"><i class="day-bar"></i><div class="grow"><b>${esc(x.course)}</b><small>${esc(x.time||'')}${x.venue?' · '+esc(x.venue):''}${left(ds)>=0&&left(ds)<10?' · '+left(ds)+' '+t('daysLeft'):''}</small></div>${ctl('exam',x.id)}</div>`);
 modal(`<div class="day-head"><div><small>${total?`${total} ${t(total===1?'event':'events')}`:t('freeDay')}</small><h3>${fmt.date(ds,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</h3></div><button class="icon-btn" data-act="close" aria-label="${t('close')}"><i data-lucide="x"></i></button></div>${sec(t('exams'),exm)}${sec(t('assignments'),asg)}${sec(t('classes'),cls)}${total?'':`<div class="empty"><i data-lucide="coffee"></i><p>${t('freeDayMessage')}</p></div>`}<div class="row end" style="margin-top:14px"><button class="btn" data-act="add-class-date" data-id="${ds}"><i data-lucide="plus"></i>${t('addClassOnDate')}</button></div>`);
 window.lucide&&lucide.createIcons()}
function noteEditor(id){
 const note=id?(D.notes||[]).find(n=>n.id===id):null;
 let selectedColor=note?.color||'yellow';
 const colorChoices=Object.keys(NOTE_COLORS).map(c=>`<button type="button" class="note-color-choice ${selectedColor===c?'selected':''}" data-act="note-color" data-id="${c}" aria-label="${t('noteColor_'+c)}" title="${t('noteColor_'+c)}" style="--swatch:${NOTE_COLORS[c].bg}"></button>`).join('');
 const m=modal(`<h3>${t(note?'editNote':'addNote')}</h3><form id="note-form"><label class="field">${t('noteTitle')}<input name="title" maxlength="80" required value="${esc(note?.title||'')}"></label><label class="field">${t('noteContent')}<textarea name="content" rows="6" maxlength="2000" required>${esc(note?.content||'')}</textarea></label><div class="field"><b>${t('noteColor')}</b><div class="note-color-picker">${colorChoices}</div><input type="hidden" name="color" value="${esc(selectedColor)}"></div><small class="muted">${t('notePrivateHint')}</small><div class="row end"><button type="button" class="btn ghost" data-act="close">${t('cancel')}</button><button class="btn">${t('save')}</button></div></form>`);
 $('form',m).onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));o.title=o.title.trim();o.content=o.content.trim();if(!o.title||!o.content)return toast(t('noteRequired'));try{if(note){const updated_at=new Date().toISOString();await U.api.call('update',{c:'notes',item:{id:note.id,...o,updated_at}});Object.assign(note,o,{updated_at})}else{const stamp=new Date().toISOString();const index=(D.notes||[]).length;const layout={x:24+(index%3)*24,y:250+Math.floor(index/3)*24,width:250,height:230};const r=await U.api.call('create',{c:'notes',item:{...layout,...o,created_at:stamp,updated_at:stamp}});D.notes.push({id:r.id,...layout,...o,created_at:stamp,updated_at:stamp})}close();toast(t('saved'));render()}catch(err){toast(errMsg(err))}}
}

let stickyPointer=null;
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
async function saveStickyLayout(note,el){
 const canvas=$('#dashboard-canvas');if(!canvas||!note||!el)return;
 const x=Math.round(parseFloat(el.style.left)||0),y=Math.round(parseFloat(el.style.top)||0),width=Math.round(el.offsetWidth),height=Math.round(el.offsetHeight);
 Object.assign(note,{x,y,width,height});
 try{await U.api.call('update',{c:'notes',item:{id:note.id,x,y,width,height,updated_at:new Date().toISOString()}})}catch(e){toast(errMsg(e))}
}
document.addEventListener('pointerdown',e=>{
 const noteEl=e.target.closest('.sticky-note');if(!noteEl)return;
 const note=(D.notes||[]).find(n=>String(n.id)===noteEl.dataset.id);if(!note)return;
 let mode=null;
 if(e.target.closest('[data-note-drag]')&&noteEl.classList.contains('is-moving')&&!e.target.closest('button'))mode='move';
 if(e.target.closest('[data-note-resize]')&&noteEl.classList.contains('is-resizing'))mode='resize';
 if(!mode)return;
 e.preventDefault();const canvas=$('#dashboard-canvas');const canvasRect=canvas.getBoundingClientRect();
 stickyPointer={mode,note,noteEl,startX:e.clientX,startY:e.clientY,left:parseFloat(noteEl.style.left)||0,top:parseFloat(noteEl.style.top)||0,width:noteEl.offsetWidth,height:noteEl.offsetHeight,canvasWidth:canvas.clientWidth,canvasRect};
 noteEl.classList.add('is-interacting');try{e.target.setPointerCapture(e.pointerId)}catch(_){}
});
document.addEventListener('pointermove',e=>{
 if(!stickyPointer)return;const p=stickyPointer,dx=e.clientX-p.startX,dy=e.clientY-p.startY;
 if(p.mode==='move'){
  const maxX=Math.max(0,p.canvasWidth-p.noteEl.offsetWidth);
  p.noteEl.style.left=clamp(p.left+dx,0,maxX)+'px';p.noteEl.style.top=Math.max(0,p.top+dy)+'px';
 }else{
  p.noteEl.style.width=clamp(p.width+dx,200,520)+'px';p.noteEl.style.height=clamp(p.height+dy,160,620)+'px';
 }
});
async function finishStickyPointer(){if(!stickyPointer)return;const p=stickyPointer;stickyPointer=null;p.noteEl.classList.remove('is-interacting');p.noteEl.classList.remove('is-moving','is-resizing');await saveStickyLayout(p.note,p.noteEl)}
document.addEventListener('pointerup',finishStickyPointer);document.addEventListener('pointercancel',finishStickyPointer);
const acts={
 'calendar-status':async()=>{
  const el=$('#ul-calendar-status'),msg=$('#ul-calendar-message');
  if(el)el.textContent=t('checking');
  try{const r=await U.api.call('calendarStatus');if(el)el.textContent=r.connected?'Connected':t('notConnected');if(msg)msg.textContent=r.connected?t('calendarConnected'):t('calendarConnectHint')}
  catch(e){if(el)el.textContent=t('unableToCheck');if(msg)msg.textContent=errMsg(e);toast(errMsg(e))}
 },
 'calendar-connect':async()=>{
  try{const r=await U.api.call('calendarConnectUrl');if(!r||!r.url)throw new Error(t('authorizationUrlMissing'));location.href=r.url}
  catch(e){toast(errMsg(e))}
 },
 'calendar-disconnect':async()=>{
  if(!confirm(t('confirmCalendarDisconnect')))return;
  try{await U.api.call('calendarDisconnect');const el=$('#ul-calendar-status');if(el)el.textContent=t('notConnected');const msg=$('#ul-calendar-message');if(msg)msg.textContent=t('calendarDisconnectedHint');toast(t('calendarDisconnected'))}
  catch(e){toast(errMsg(e))}
 },
 'calendar-sync':async()=>{
  const b=$('[data-act="calendar-sync"]'),msg=$('#ul-calendar-message');if(b)b.disabled=true;if(msg)msg.textContent=t('syncingCalendar');
  try{const r=await U.api.call('calendarSyncAll');const stamp=new Date(r.synced_at||Date.now()).toLocaleString();localStorage.setItem('ul_calendar_last_sync',stamp);const last=$('#ul-calendar-last-sync');if(last)last.textContent=stamp;if(msg)msg.textContent=t('calendarSyncCompleteHint');toast(t('calendarSyncComplete'))}
  catch(e){if(msg)msg.textContent=t('syncFailed') + ': '+(e.message||errMsg(e));toast(errMsg(e))}
  finally{if(b)b.disabled=false}
 },

 day:id=>dayPopup(id),
 'add-class-date':id=>editClass(id),
 cmonth:id=>{st.cm=+id===0?0:(st.cm||0)+ +id;render()},
 close,
 menu:()=>{$('#sidebar').classList.toggle('open');$('#scrim').classList.toggle('open')},
 quicktheme:()=>{U.prefs.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';store();apply();render();},
 palette:id=>{U.prefs.palette=id;store();apply();render();toast(t('themeUpdated'));},
 'profile-menu':()=>modal(`<div class="profile-pop"><div class="row"><b>${t('account')}</b><button class="icon-btn" data-act="close"><i data-lucide="x"></i></button></div><p>${esc(D.user.name||t('student'))}</p><small>${esc(D.user.email||'')}</small><div class="row" style="margin-top:14px"><button class="btn" data-act="go-settings">${t('profileAndSettings')}</button><button class="btn ghost" data-act="logout">${t('logout')}</button></div></div>`),
 'go-settings':()=>{close();location.hash='#/settings';},
 'dismiss-all-due-reminders':()=>dismissAllDueReminders(),
 developer:()=>{location.hash='#/developer'},
 'dev-day':()=>{devTimephase='day';apply();location.hash='#/dashboard'},
 'dev-night':()=>{devTimephase='night';apply();location.hash='#/dashboard'},
 'dev-open-panel':()=>{location.hash='#/developer'},
 'dev-live':()=>{devTimephase=null;apply();render();toast(t('liveTimeRestored'))},
 'dev-preview-reminder':()=>previewReminderPopup(),
 'dev-close-reminder-preview':()=>{activeDuePopupKey='';close()},
 'dev-local-notif':async()=>{if(!('Notification' in window))return toast(t('browserNotificationsUnsupported'));let p=Notification.permission;if(p==='default')p=await Notification.requestPermission();if(p!=='granted')return toast(t('notificationPermissionDenied'));try{if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.ready;await reg.showNotification(t('appTestTitle'),{body:t('localNotificationWorking'),icon:'./assets/icons/icon-192.png',tag:'ul-dev-local-test'});}else new Notification(t('appTestTitle'),{body:t('localNotificationWorking')});toast(t('localNotificationSent'))}catch(e){toast(t('couldNotShowNotification') + ': '+(e.message||e))}},
 'dev-refresh':()=>{const e=$('#dev-sw-status');if(!e)return;if(!('serviceWorker' in navigator)){e.textContent=t('unsupported');return}navigator.serviceWorker.getRegistration().then(r=>{e.textContent=r?(r.active?'Active':'Registered'):t('notRegistered')}).catch(()=>e.textContent=t('unavailable'))},
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
 'save-welcome':()=>{const title=$('[data-welcome="title"]')?.value.trim()||'',subtitle=$('[data-welcome="subtitle"]')?.value.trim()||'';if(title.length>80||subtitle.length>160)return toast(t('shortenMessage'));U.prefs.welcomeTitle=title;U.prefs.welcomeSubtitle=subtitle;store();toast(t('saved'));render();},
 import:(_,b)=>U.importer.open(b.dataset.m),
 retry:()=>boot(),
 pushtest:async()=>{try{await U.api.call('pushTest');toast(t('pushSent'))}catch(e){toast(errMsg(e))}},
 install:async()=>{await U.push.install();render()},
 mv:(i,b)=>{const visible=U.prefs.order.filter(w=>!U.prefs.hidden.includes(w)),j=+i+ +b.dataset.d;if(j<0||j>=visible.length)return;const a=visible[j],c=visible[+i];const ia=U.prefs.order.indexOf(a),ic=U.prefs.order.indexOf(c);[U.prefs.order[ia],U.prefs.order[ic]]=[U.prefs.order[ic],U.prefs.order[ia]];store();acts.custom();render()},
 'widget-menu':(id,b)=>{const wrap=b.closest('.dashboard-widget'),menu=wrap?.querySelector('.widget-menu');if(!menu)return;const open=menu.hidden;$$('.widget-menu').forEach(x=>x.hidden=true);menu.hidden=!open;},
 'widget-size':(id,b)=>{U.prefs.widgetSizes=U.prefs.widgetSizes||{};U.prefs.widgetSizes[id]=b.dataset.size||'medium';store();render();},
 'sticky-menu':(id,b)=>{const note=b.closest('.sticky-note'),menu=note?.querySelector('.sticky-note-menu');if(!menu)return;const open=menu.hidden;$$('.sticky-note-menu').forEach(x=>x.hidden=true);menu.hidden=!open;},
 'note-move':id=>{const el=$(`[data-sticky-note=\"${CSS.escape(String(id))}\"]`);if(!el)return;$$('.sticky-note').forEach(x=>x.classList.remove('is-moving','is-resizing'));el.classList.add('is-moving');el.querySelector('.sticky-note-menu').hidden=true;toast(t('moveNoteHint'));},
 'note-resize':id=>{const el=$(`[data-sticky-note=\"${CSS.escape(String(id))}\"]`);if(!el)return;$$('.sticky-note').forEach(x=>x.classList.remove('is-moving','is-resizing'));el.classList.add('is-resizing');el.querySelector('.sticky-note-menu').hidden=true;toast(t('resizeNoteHint'));},
 'note-color':(id,b)=>{const f=$('#note-form');if(!f)return;const input=$('input[name="color"]',f);if(input)input.value=id;$$('.note-color-choice',f).forEach(x=>x.classList.toggle('selected',x.dataset.id===id));},
 'widget-remove':(id,b)=>{U.prefs.order=U.prefs.order.filter(w=>w!==id);U.prefs.hidden=U.prefs.hidden.filter(w=>w!==id);store();if(b&&b.closest('.widget-tools')){render();toast(t('saved'))}else{acts.custom();render()}},
 'widget-add':id=>{if(!U.prefs.order.includes(id))U.prefs.order.push(id);U.prefs.hidden=U.prefs.hidden.filter(w=>w!==id);store();acts.custom();render()},
 'note-add':()=>noteEditor(),
 'note-edit':id=>noteEditor(id),
 'note-delete':id=>ask(async()=>{try{await U.api.call('delete',{c:'notes',item:{id}});D.notes=D.notes.filter(n=>n.id!==id);toast(t('deleted'));render()}catch(e){toast(errMsg(e))}}),
 custom:()=>{const visible=U.prefs.order.filter(w=>!U.prefs.hidden.includes(w));const available=['academic','schedule','calendar','assignments','exams','finance','productivity','todayFocus','quickAccess','notes'].filter(w=>!visible.includes(w));return modal(`<div class="widget-manager-head"><div><h3>${t('customize')}</h3><p class="muted">${t('widgetManagerHint')}</p></div><button class="icon-btn" data-act="close"><i data-lucide="x"></i></button></div><h4>${t('activeWidgets')}</h4>${visible.map((w,i)=>`<div class="widget-manager-row"><span class="grow"><i data-lucide="${({academic:'graduation-cap',schedule:'calendar-days',calendar:'calendar-range',assignments:'clipboard-list',exams:'timer',finance:'wallet',productivity:'target',todayFocus:'list-checks',quickAccess:'command',notes:'notebook-pen'})[w]}"></i><b>${t(WN[w]||w)}</b></span><button class="icon-btn" data-act="mv" data-id="${i}" data-d="-1" ${i===0?'disabled':''} aria-label="${t('moveUp')}">↑</button><button class="icon-btn" data-act="mv" data-id="${i}" data-d="1" ${i===visible.length-1?'disabled':''} aria-label="${t('moveDown')}">↓</button><button class="icon-btn danger" data-act="widget-remove" data-id="${w}" aria-label="${t('removeWidget')}"><i data-lucide="x"></i></button></div>`).join('')||`<p class="muted">${t('noWidgets')}</p>`}<h4 class="widget-library-title">${t('widgetLibrary')}</h4><div class="widget-library">${available.map(w=>`<div class="widget-library-row"><span class="grow"><b>${t(WN[w]||w)}</b><small>${t('widgetDesc_'+w)}</small></span><button class="btn small" data-act="widget-add" data-id="${w}"><i data-lucide="plus"></i>${t('add')}</button></div>`).join('')||`<p class="muted">${t('allWidgetsAdded')}</p>`}</div><div class="row end" style="margin-top:16px"><button class="btn" data-act="close">${t('done')}</button></div>`) }
 
};
document.addEventListener('click',e=>{if(!e.target.closest('.widget-tools'))$$('.widget-menu').forEach(x=>x.hidden=true);if(!e.target.closest('.sticky-note-tools'))$$('.sticky-note-menu').forEach(x=>x.hidden=true);const b=e.target.closest('[data-act]');if(b&&acts[b.dataset.act])acts[b.dataset.act](b.dataset.id,b,e);else if(e.target.id==='modal')close()});
document.addEventListener('change',async e=>{const el=e.target,d=el.dataset;
 if(el.id==='avatar-file'&&el.files&&el.files[0]){const f=el.files[0];if(!/^image\/(png|jpeg|webp)$/.test(f.type))return toast(t('chooseImageFormat'));if(f.size>4*1024*1024)return toast(t('imageTooLarge'));const reader=new FileReader();reader.onload=async()=>{try{const img=new Image();img.onload=async()=>{try{const c=document.createElement('canvas'),max=320,scale=Math.min(1,max/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);const dataUrl=c.toDataURL('image/jpeg',.78);const result=await U.api.call('saveProfilePhoto',{dataUrl});const url=result.avatar_url||result.avatarUrl||result.url;if(!url)throw{code:'server'};D.user.avatar_url=url;localStorage.removeItem('ul_avatar');toast(t('profilePhotoSaved'));render()}catch(err){toast(errMsg(err))}};img.onerror=()=>toast(t('couldNotReadImage'));img.src=reader.result}catch(err){toast(errMsg(err))}};reader.readAsDataURL(f);return;}
 if(d.view){st[d.view]=el.value;return render()}
 if(d.w){const h=U.prefs.hidden,i=h.indexOf(d.w);i<0?h.push(d.w):h.splice(i,1);store();return render()}
 if(!d.set)return;const v=el.type==='checkbox'?el.checked:el.value;
 if(d.set.startsWith('notif.')){
  const key=d.set.slice(6);
  if(['classReminderMinutes','assignmentDays','examDays'].includes(key)){
   const allowed={classReminderMinutes:[15,30,45,60,90],assignmentDays:[7,3,1,0],examDays:[7,3,1,0]}[key];
   const value=Number(el.value);let arr=Array.isArray(U.prefs.notif[key])?U.prefs.notif[key].slice():[];
   if(v){if(allowed.includes(value)&&!arr.includes(value))arr.push(value)}else arr=arr.filter(x=>x!==value);
   U.prefs.notif[key]=arr.sort((a,b)=>b-a);store();return render();
  }
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
 apply();await boot();setInterval(()=>{checkDueDatePopup()},15000);setTimeout(()=>{checkDueDatePopup()},2500)})();
})();
