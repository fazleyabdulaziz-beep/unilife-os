// Review-before-save import. New sources (xlsx, pdf, OCR, LMS) plug into `sources` and return rows of strings (first row = headers).
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
   try{await UL.api.call('batchCreate',{c:UL.CN[m],items:pick});ui.close();ui.toast(t('saved'));ui.load()}catch(e){ui.toast(t('err_'+(e.code||'server')))}}}
};
