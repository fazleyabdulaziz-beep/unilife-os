// UniLife OS import tools: CSV imports + AI timetable extraction via Groq/Qwen.
UL.importer={
 sources:{csv:{read:async f=>UL.importer.csv((await f.text()).replace(/^\uFEFF/,''))}},
 csv(s){const rows=[];let r=[],c='',q=false;
  for(let i=0;i<s.length;i++){const ch=s[i];
   if(q){if(ch==='"'){if(s[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
   else if(ch==='"')q=true;else if(ch===','){r.push(c);c=''}
   else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&s[i+1]==='\n')i++;r.push(c);c='';rows.push(r);r=[]}else c+=ch}
  if(c||r.length){r.push(c);rows.push(r)}return rows.filter(r=>r.some(x=>x.trim()))},
 chk(f,v){v=(v||'').trim();if(!v)return f.r===0?{v:''}:null;
  if(f.o)return f.o.includes(v)?{v}:null;
  if(f.t==='date')return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(new Date(v))?{v}:null;
  if(f.t==='time')return /^([01]\d|2[0-3]):[0-5]\d$/.test(v)?{v}:null;
  if(f.t==='number'){const n=Number(v);return isFinite(n)&&n>=(f.min??-Infinity)?{v:n}:null}
  return v.length<=120?{v}:null},
 open(m){const ui=UL.ui,t=ui.t,c=UL.M[m],box=ui.modal(`<h3>${t('import')} · ${t(c.t)}</h3><p class="muted">${t('importHint')}</p><p style="margin:10px 0"><code>${c.f.map(f=>f.n).join(',')}</code></p><input type="file" accept=".csv,text/csv" aria-label="${t('importPick')}">`);
  box.querySelector('input').onchange=async e=>{const f=e.target.files[0];if(!f)return;
   if(f.size>1e6)return ui.toast(t('err_invalid'));
   try{this.review(m,await this.sources.csv.read(f))}catch(x){ui.toast(t('err_invalid'))}}},
 review(m,rows){const ui=UL.ui,t=ui.t,c=UL.M[m],hd=rows[0].map(h=>h.trim().toLowerCase());
  const items=rows.slice(1,101).map(r=>{const o={};let bad=false;
   c.f.forEach(f=>{const i=hd.indexOf(f.n),x=this.chk(f,i<0?'':r[i]);if(!x)bad=true;else o[f.n]=x.v});return{o,bad}});
  const ok=items.filter(i=>!i.bad).length;
  const box=ui.modal(`<h3>${t('import')} · ${t(c.t)}</h3><p class="muted">${ok}/${items.length} ${t('importRows')}${rows.length>101?' (max 100)':''}</p><div class="scroll" style="max-height:50vh"><table>${items.map((i,k)=>`<tr class="${i.bad?'bad':''}"><td><input type="checkbox" data-k="${k}" ${i.bad?'disabled':'checked'} style="width:20px;min-height:20px"></td>${c.f.map(f=>`<td>${ui.esc(i.o[f.n]??'—')}</td>`).join('')}</tr>`).join('')}</table></div><div class="row end" style="margin-top:12px"><button class="btn ghost" data-act="close">${t('cancel')}</button><button class="btn" id="imp">${t('importConfirm')}</button></div>`);
  box.querySelector('#imp').onclick=async()=>{
   const pick=[...box.querySelectorAll('[data-k]:checked')].map(x=>items[+x.dataset.k].o);if(!pick.length)return;
   try{await UL.api.call('batchCreate',{c:UL.CN[m],items:pick});ui.close();ui.toast(t('saved'));ui.load()}catch(e){ui.toast(t('err_'+(e.code||'server')))}}},
 openAI(){
  const ui=UL.ui;
  const box=ui.modal(`<div class="ai-import-head"><div><span class="ai-kicker"><i data-lucide="sparkles"></i> UNILIFE AI</span><h3>Smart Timetable Import</h3><p class="muted">Upload a timetable photo or PDF, or paste your lecturer's schedule. Qwen will extract the classes for you.</p></div><button class="icon-btn" data-act="close" aria-label="Close"><i data-lucide="x"></i></button></div>
   <label class="ai-upload" for="ai-timetable-file"><i data-lucide="file-up"></i><b>Choose timetable file</b><span>JPG, PNG, WEBP or PDF · up to 3 pages</span><input id="ai-timetable-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple></label>
   <div id="ai-file-names" class="muted ai-file-names">No file selected</div>
   <div class="ai-or"><span>OR PASTE SCHEDULE TEXT</span></div>
   <textarea id="ai-timetable-text" rows="5" placeholder="Example: Monday 9am–11am, Programming, Room B204, Mr Ali. Every week."></textarea>
   <p class="ai-privacy"><i data-lucide="shield-check"></i> Your file is sent to Groq to extract timetable details. It is not saved in UniLife OS.</p>
   <div class="row end" style="margin-top:14px"><button class="btn ghost" data-act="close">Cancel</button><button class="btn" id="ai-analyze"><i data-lucide="sparkles"></i> Analyze timetable</button></div>
   <p id="ai-status" class="muted ai-status" aria-live="polite"></p>`);
  const file=box.querySelector('#ai-timetable-file'),names=box.querySelector('#ai-file-names'),analyze=box.querySelector('#ai-analyze');
  file.addEventListener('change',()=>{names.textContent=[...file.files].map(f=>f.name).join(', ')||'No file selected'});
  analyze.addEventListener('click',async()=>{
   const files=[...file.files],text=box.querySelector('#ai-timetable-text').value.trim();
   if(!files.length&&!text)return ui.toast('Upload a timetable or paste schedule text first.');
   if(files.length>3)return ui.toast('Select up to 3 image files. A PDF can contain up to 3 pages.');
   analyze.disabled=true;analyze.classList.add('busy');box.querySelector('#ai-status').textContent='Preparing timetable…';
   try{
    let images=[];
    for(const f of files){
     if(f.size>12*1024*1024)throw new Error('Each file must be smaller than 12 MB.');
     if(f.type==='application/pdf')images.push(...await this.pdfToImages(f));
     else if(/^image\/(jpeg|png|webp)$/.test(f.type))images.push(await this.imageToJpeg(f));
     else throw new Error('Unsupported file type. Use JPG, PNG, WEBP or PDF.');
    }
    if(images.length>3)throw new Error('Only the first 3 PDF pages/images can be analyzed at once.');
    box.querySelector('#ai-status').textContent='Qwen is reading your timetable…';
    const result=await UL.api.call('analyzeTimetable',{images:images,text:text});
    if(!result||!Array.isArray(result.classes)||!result.classes.length)throw new Error('No classes could be detected. Try a clearer image or paste the timetable text.');
    this.reviewAI(result);
   }catch(e){box.querySelector('#ai-status').textContent='';ui.toast(e.message||this.errorMessage(e));analyze.disabled=false;analyze.classList.remove('busy')}
  });
  window.lucide&&lucide.createIcons();
 },
 async imageToJpeg(file){
  const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src});
  const scale=Math.min(1,1800/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.78);
 },
 async pdfToImages(file){
  if(!window.pdfjsLib)throw new Error('PDF reader is unavailable. Please upload a JPG/PNG image instead.');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const data=await file.arrayBuffer(),pdf=await pdfjsLib.getDocument({data}).promise,images=[];
  const count=Math.min(pdf.numPages,3);
  for(let n=1;n<=count;n++){
   const page=await pdf.getPage(n),viewport=page.getViewport({scale:1.5}),canvas=document.createElement('canvas');
   const scale=Math.min(1,1800/Math.max(viewport.width,viewport.height));canvas.width=Math.round(viewport.width*scale);canvas.height=Math.round(viewport.height*scale);
   await page.render({canvasContext:canvas.getContext('2d'),viewport:page.getViewport({scale:1.5*scale})}).promise;
   images.push(canvas.toDataURL('image/jpeg',.78));
  }
  return images;
 },
 errorMessage(e){const map={aiConfig:'AI service is not configured yet. Add GROQ_API_KEY in Apps Script Script Properties.',aiLimit:'AI usage limit reached. Please try again later.',aiBusy:'Please wait a few seconds before trying again.',aiFailed:'AI could not process this timetable. Please try a clearer file.',auth:'Please log in again.'};return map[e&&e.code]||e&&e.message||'Something went wrong.'},
 reviewAI(result){
  const ui=UL.ui;
  this.aiDraft=(result.classes||[]).slice(0,100).map(x=>({
   course:String(x.course||'').slice(0,80),
   start:String(x.start||''),end:String(x.end||''),
   room:String(x.room||''),lecturer:String(x.lecturer||''),
   date:String(x.date||''),confidence:x.confidence||'',notes:String(x.notes||'')
  }));
  this.aiWarnings=Array.isArray(result.warnings)?result.warnings:[];
  this.renderAIReview();
 },
 renderAIReview(){
  const ui=UL.ui,draft=this.aiDraft||[],warnings=this.aiWarnings||[];
  const rows=draft.map((x,i)=>`<div class="ai-class-row" data-ai-row="${i}">
   <div class="ai-row-top"><b>Class ${i+1}</b><label class="ai-include"><input type="checkbox" data-ai-include="${i}" checked> Include</label></div>
   <label class="field">Class name / subject<input data-ai-field="course" data-ai-i="${i}" maxlength="80" value="${ui.esc(x.course)}" placeholder="Course name or code" required></label>
   <label class="field">Class date<input type="date" data-ai-field="date" data-ai-i="${i}" value="${ui.esc(x.date)}" required><small class="muted">Day of the week is detected automatically from this date.</small></label>
   <div class="ai-fields-2"><label class="field">Start time<input type="time" data-ai-field="start" data-ai-i="${i}" value="${ui.esc(x.start)}" required></label><label class="field">End time<input type="time" data-ai-field="end" data-ai-i="${i}" value="${ui.esc(x.end)}" required></label></div>
   <label class="field">Venue / room <span class="muted">(optional)</span><input data-ai-field="room" data-ai-i="${i}" maxlength="60" value="${ui.esc(x.room)}" placeholder="No venue specified"></label>
   <label class="field">Lecturer <span class="muted">(optional)</span><input data-ai-field="lecturer" data-ai-i="${i}" maxlength="80" value="${ui.esc(x.lecturer)}" placeholder="Lecturer name"></label>
   ${x.notes?`<small class="muted">AI note: ${ui.esc(x.notes)}</small>`:''}
  </div>`).join('');
  const box=ui.modal(`<div class="ai-import-head"><div><span class="ai-kicker"><i data-lucide="sparkles"></i> AI EXTRACTION RESULT</span><h3>Review detected classes</h3><p class="muted">Date, class name and time are required. Weekday is calculated automatically; venue is optional. Nothing is saved until you confirm.</p></div><button class="icon-btn" data-act="close" aria-label="Close"><i data-lucide="x"></i></button></div>
   ${warnings.length?`<div class="ai-warning"><b>AI notes</b><ul>${warnings.map(w=>`<li>${ui.esc(w)}</li>`).join('')}</ul></div>`:''}
   <div class="ai-review-list">${rows}</div>
   <div id="ai-validation" class="ai-validation"></div>
   <div class="row end" style="margin-top:14px"><button class="btn ghost" id="ai-back">Back</button><button class="btn" id="ai-save">Confirm & Add ${draft.length} Classes</button></div>`);
  box.querySelector('#ai-back').onclick=()=>this.openAI();
  box.querySelectorAll('[data-ai-field]').forEach(el=>el.addEventListener('change',()=>{const i=+el.dataset.aiI;this.aiDraft[i][el.dataset.aiField]=el.value}));
  box.querySelector('#ai-save').onclick=()=>this.importAI(box);
  window.lucide&&lucide.createIcons();
 },
 async importAI(box){
  const ui=UL.ui,items=[],errors=[],duplicates=[],conflicts=[];
  box.querySelectorAll('[data-ai-field]').forEach(el=>{const i=+el.dataset.aiI;this.aiDraft[i][el.dataset.aiField]=el.value});
  const included=[...box.querySelectorAll('[data-ai-include]:checked')].map(el=>+el.dataset.aiInclude);
  const validDate=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===v};
  included.forEach(i=>{
   const x=this.aiDraft[i],o={course:x.course.trim(),day:'',start:x.start,end:x.end,room:x.room.trim(),lecturer:x.lecturer.trim(),schedule_type:'one_time',date:x.date};
   if(!o.course||o.course.length>80)errors.push(`Class ${i+1}: class name is required.`);
   if(!validDate(o.date))errors.push(`Class ${i+1}: enter a valid class date.`);
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(o.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(o.end)||o.start>=o.end)errors.push(`Class ${i+1}: check start and end time.`);
   if(errors.some(e=>e.startsWith(`Class ${i+1}:`)))return;
   const sig=z=>[z.course.toLowerCase(),z.date,z.start,z.end].join('|');
   if((UL.data.classes||[]).some(c=>c.schedule_type==='one_time'&&sig(c)===sig(o))){duplicates.push(i+1);return}
   items.push(o);
  });
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
   const a=items[i],b=items[j];
   if(a.date===b.date&&a.start<b.end&&b.start<a.end)conflicts.push(`Possible time conflict on ${a.date}: ${a.course} and ${b.course}`);
  }
  const validation=box.querySelector('#ai-validation');
  if(errors.length){validation.innerHTML=`<div class="ai-error"><b>Please fix these issues:</b><ul>${errors.map(x=>`<li>${ui.esc(x)}</li>`).join('')}</ul></div>`;return}
  if(!items.length){validation.innerHTML='<div class="ai-warning">All selected classes are already in your timetable or none were selected.</div>';return}
  if(conflicts.length&&!window.confirm(conflicts.join('\n')+'\n\nImport anyway?'))return;
  const save=box.querySelector('#ai-save');save.disabled=true;save.classList.add('busy');
  try{
   const result=await UL.api.call('batchCreate',{c:'classes',items:items.slice(0,100)});
   ui.close();ui.toast(`${result.count||items.length} classes added to your timetable${duplicates.length?`; ${duplicates.length} duplicates skipped`:''}.`);await ui.load();
  }catch(e){save.disabled=false;save.classList.remove('busy');validation.innerHTML=`<div class="ai-error">${ui.esc(this.errorMessage(e))}</div>`}
 }

};
