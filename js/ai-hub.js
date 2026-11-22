/* UniLife OS — AI Study Hub (Phase 1 + 2)
 * Dedicated persistent conversations. AI requests stay on the Apps Script backend.
 */
(function () {
  'use strict';
  const U = window.UL;
  if (!U) return;
  const state = { conversations: [], activeId: '', messages: [], busy: false, loaded: false, loading: false, mode:'chat', historyOpen:false, studyOpen:false, attachMenuOpen:false, seen:0,
    documents: [], docsLoaded: false, uploading: false, uploadProgress: '', attachments: [], intelligence: null, intelligenceLoaded: false, tutorQuiz:null, tutorAnswers:{}, tutorResult:null, tutorDashboard:null, tutorLoading:false, copilot:null, copilotLoading:false, deletingId:'', firstChatTransition:false };
  const $ = (s, root=document) => root.querySelector(s);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
  const t = key => U.i18n && U.i18n.t(key) || key;
  const tools = [
    {id:'chat',icon:'message-circle',title:'aiHubChat',desc:'aiHubChatDesc',prompt:'Help me with my studies. Ask me what I am working on and guide me step by step.'},
    {id:'explain',icon:'lightbulb',title:'aiHubExplain',desc:'aiHubExplainDesc',prompt:'I want to understand a difficult topic. Ask me for the topic and explain it clearly, step by step, with examples.'},
    {id:'assignment',icon:'clipboard-check',title:'aiHubAssignment',desc:'aiHubAssignmentDesc',prompt:'Help me understand and plan an assignment. Ask me to share the assignment brief, then help me break it into manageable steps.'},
    {id:'exam',icon:'graduation-cap',title:'aiHubExam',desc:'aiHubExamDesc',prompt:'Help me prepare for my exams. Use my available UniLife OS exam and course context where relevant, then help me build a revision approach.'},
    {id:'planner',icon:'calendar-check',title:'aiHubPlanner',desc:'aiHubPlannerDesc',prompt:'Help me create a realistic study plan using my UniLife OS timetable and upcoming assignments or exams where relevant.'},
    {id:'writing',icon:'pen-tool',title:'aiHubWriting',desc:'aiHubWritingDesc',prompt:'Act as my academic writing coach. Help me improve clarity, structure and grammar while keeping my own ideas and voice.'},
    {id:'quiz',icon:'brain',title:'aiHubQuiz',desc:'aiHubQuizDesc',prompt:'Help me practise with a short interactive quiz. First ask me which subject and topic I want to practise.'},
    {id:'language',icon:'languages',title:'aiHubLanguage',desc:'aiHubLanguageDesc',prompt:'Act as my language tutor. Ask which language I want to practise and adapt the exercises to my level.'}
  ];
  const formatDate = value => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(U.prefs && U.prefs.lang === 'ms' ? 'ms-MY' : 'en-MY', {day:'numeric',month:'short'});
  };
  const icon = name => `<i data-lucide="${name}"></i>`;
  const refreshIcons = () => { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); };
  function inlineMd(x){
    return x.replace(/`([^`\n]+)`/g,'<code>$1</code>')
      .replace(/\*\*\*([^*\n]+?)\*\*\*/g,'<strong><em>$1</em></strong>')
      .replace(/\*\*([^*\n]+?)\*\*/g,'<strong>$1</strong>')
      .replace(/__([^_\n]+?)__/g,'<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\n]+?)\*(?![*\w])/g,'$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  function md(src){
    const blocks=[];
    let t=esc(src).replace(/\r\n/g,'\n').replace(/```[\w-]*\n?([\s\S]*?)```/g,(m,c)=>{blocks.push('<pre><code>'+c.replace(/\n$/,'')+'</code></pre>');return '\u0000'+(blocks.length-1)+'\u0000';});
    const out=[]; let list='', para=[];
    const flushP=()=>{ if(para.length){ out.push('<p>'+para.join('<br>')+'</p>'); para=[]; } };
    const flushL=()=>{ if(list){ out.push('</'+list+'>'); list=''; } };
    t.split('\n').forEach(line=>{
      let m;
      if(/^\s*$/.test(line)){ flushP(); flushL(); return; }
      if((m=line.match(/^\u0000(\d+)\u0000$/))){ flushP(); flushL(); out.push(blocks[+m[1]]); return; }
      if(/^\s*([*_-])(\s*\1){2,}\s*$/.test(line)){ flushP(); flushL(); out.push('<hr>'); return; }
      if((m=line.match(/^\s{0,3}#{1,6}\s+(.*)$/))){ flushP(); flushL(); out.push('<h4>'+inlineMd(m[1].replace(/\s*#+\s*$/,''))+'</h4>'); return; }
      if((m=line.match(/^\s*[-*\u2022]\s+(.*)$/))){ flushP(); if(list!=='ul'){ flushL(); out.push('<ul>'); list='ul'; } out.push('<li>'+inlineMd(m[1])+'</li>'); return; }
      if((m=line.match(/^\s*\d+[.)]\s+(.*)$/))){ flushP(); if(list!=='ol'){ flushL(); out.push('<ol>'); list='ol'; } out.push('<li>'+inlineMd(m[1])+'</li>'); return; }
      if((m=line.match(/^&gt;\s?(.*)$/))){ flushP(); flushL(); out.push('<blockquote>'+inlineMd(m[1])+'</blockquote>'); return; }
      flushL(); para.push(inlineMd(line.trim()));
    });
    flushP(); flushL();
    return out.join('').replace(/\u0000(\d+)\u0000/g,(m,i)=>blocks[+i]);
  }
  function draw() {
    const view = $('#view');
    if (view && location.hash.replace('#/','') === 'ai') {
      const old = $('textarea[name="message"]');
      const keep = old ? old.value : '';
      const hadFocus = old && document.activeElement === old;
      const stripOld = $('.aihub-mode-strip');
      const stripLeft = stripOld ? stripOld.scrollLeft : 0;
      if (state.seenId !== state.activeId) { state.seenId = state.activeId; state.seen = state.messages.length; }
      if (state.jump) state.seen = state.messages.length;
      const grew = state.messages.length > state.seen, jump = state.jump;
      state.jump = false;
      view.innerHTML = render();
      refreshIcons();
      if (state.firstChatTransition) {
        state.firstChatTransition = false;
        const leaving = $('.aihub-welcome-state.is-leaving');
        if (leaving) leaving.addEventListener('animationend', () => { if (leaving.isConnected) { const current=$('.aihub-welcome-state.is-leaving'); if(current) current.remove(); } }, {once:true});
      }
      const field = $('textarea[name="message"]');
      if (field && keep) { field.value = keep; autoGrow(field); }
      if (field && hadFocus) field.focus();
      state.seen = state.messages.length;
      movePill(stripLeft);
      if (state.messages.length) {
        const last = state.messages[state.messages.length - 1];
        if (jump) toBottom('auto');
        else if (grew && last.role !== 'user') {
          const fresh = Array.from(document.querySelectorAll('.aihub-message.is-new.from-ai'))[0];
          if (fresh) fresh.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (grew) toBottom('smooth');
      }
    }
  }
  function toBottom(behavior){
    const box=$('#aihub-messages'); if(box) box.scrollTo({top:box.scrollHeight,behavior:behavior||'auto'});
  }
  function syncPageClass(){ document.body.classList.toggle('ai-page', location.hash.replace('#/','')==='ai'); }
  window.addEventListener('hashchange', syncPageClass);
  function movePill(stripLeft){
    const strip=$('.aihub-mode-strip'), act=$('.aihub-mode.active'), pill=$('.aihub-mode-pill');
    if(!strip||!act||!pill) return;
    strip.scrollLeft=stripLeft||0;
    const to={l:act.offsetLeft,w:act.offsetWidth};
    const set=p=>{pill.style.width=p.w+'px';pill.style.transform='translateX('+p.l+'px)';};
    if(state.pill){ pill.style.transition='none'; set(state.pill); void pill.offsetWidth; pill.style.transition=''; }
    requestAnimationFrame(()=>set(to));
    state.pill=to;
    if(act.offsetLeft+act.offsetWidth>strip.clientWidth+strip.scrollLeft||act.offsetLeft<strip.scrollLeft) strip.scrollTo({left:Math.max(0,act.offsetLeft-24),behavior:'smooth'});
  }
  function autoGrow(el){ el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,200)+'px'; }
  function closeAttachMenu(){
    state.attachMenuOpen=false;
    const m=$('.aihub-attach-menu'), b=$('.aihub-attach-trigger');
    if(m) m.hidden=true; if(b) b.setAttribute('aria-expanded','false');
  }
  function toolCards() {
    return tools.map(x => `<button class="aihub-tool-card" type="button" data-ai-act="tool" data-tool="${x.id}">
      <span class="aihub-tool-icon">${icon(x.icon)}</span><span class="aihub-tool-copy"><b>${t(x.title)}</b><small>${t(x.desc)}</small></span>${icon('arrow-up-right')}
    </button>`).join('');
  }
  function conversationList() {
    if (!state.conversations.length) return `<p class="aihub-empty-list">${t('aiHubNoHistory')}</p>`;
    return state.conversations.map(c => `<div class="aihub-conversation-row ${c.id===state.activeId?'active':''}">
      <button type="button" class="aihub-conversation-select" data-ai-act="open" data-id="${esc(c.id)}">
        ${icon('message-square')}<span><b>${esc(c.title || t('aiHubUntitled'))}</b><small>${formatDate(c.updated_at)}</small></span>
      </button>
      <button type="button" class="aihub-conversation-delete ${state.deletingId===c.id?'is-loading':''}" data-ai-act="delete" data-id="${esc(c.id)}" aria-label="${t('aiHubDelete')}" title="${t('aiHubDelete')}" ${state.deletingId?'disabled':''}>${state.deletingId===c.id?'<span class="aihub-mini-spinner"></span>':icon('trash-2')}</button>
    </div>`).join('');
  }
  function userAvatarMarkup() {
    const user = (window.D && window.D.user) || (U.data && U.data.user) || {};
    const url = user.avatar_url || user.avatarUrl || localStorage.getItem('ul_avatar') || '';
    const name = user.name || 'You';
    return url ? `<img src="${esc(url)}" alt="${esc(name)}">` : `<span>${esc(name.trim().charAt(0).toUpperCase() || 'U')}</span>`;
  }
  function botAvatarMarkup() {
    return `<span class="aihub-bot-avatar" aria-hidden="true"><span class="aihub-bot"><span class="body"></span><span class="eyes"><i class="eye"></i><i class="eye"></i></span><span class="shadow"></span></span></span>`;
  }
  function messageList() {
    if (!state.messages.length) return '';
    return state.messages.map((m,i) => `<article class="aihub-message ${m.role==='user'?'from-user':'from-ai'} ${i>=state.seen?'is-new':''}">
      <div class="aihub-message-avatar ${m.role==='user'?'user-photo':'bot-mascot'}">${m.role==='user'?userAvatarMarkup():botAvatarMarkup()}</div>
      <div class="aihub-message-body"><small>${m.role==='user'?t('aiHubYou'):'UniBot'}</small>${m.role==='user'?renderMessageAttachments(m.attachments):''}<div class="aihub-bubble">${m.role==='user'?esc(m.content).replace(/\n/g,'<br>'):md(m.content)}</div></div>
    </article>`).join('') + (state.busy ? `<article class="aihub-message from-ai is-typing"><div class="aihub-message-avatar bot-mascot">${botAvatarMarkup()}</div><div class="aihub-message-body"><small>UniBot</small><div class="aihub-bubble aihub-thinking"><span></span><span></span><span></span> ${t('aiHubThinking')}</div></div></article>` : '');
  }
  function renderIntelligence() {
    const d=state.intelligence;
    if(!d) return `<section class="aihub-intelligence"><div class="aihub-section-head"><div><h2>${t('aiHubIntelligence')}</h2><p>${t('aiHubIntelligenceHint')}</p></div><button type="button" class="aihub-upload-button" data-ai-act="study-refresh">${icon('refresh-cw')} ${t('aiHubRefresh')}</button></div><p class="aihub-intel-loading">${t('aiHubLoadingIntelligence')}</p></section>`;
    const stats=d.stats||{};
    const sessions=(d.sessions||[]).map(x=>`<article class="aihub-study-task"><div><b>${esc(x.course)} · ${esc(x.title)}</b><small>${esc(x.study_date)} · ${Number(x.duration_minutes)||30} ${t('aiHubMinutes')}</small></div><button type="button" data-ai-act="study-done" data-id="${esc(x.id)}">${icon('check')} ${t('aiHubMarkDone')}</button></article>`).join('') || `<p class="aihub-intel-empty">${t('aiHubNoSessions')}</p>`;
    const exams=(d.exams||[]).map(x=>`<div class="aihub-readiness-row"><div><b>${esc(x.course)}</b><small>${esc(x.date)} · ${x.days_left} ${t('aiHubDaysLeft')}</small></div><div class="aihub-readiness-meter"><span style="width:${Math.max(0,Math.min(100,x.readiness))}%"></span></div><strong>${x.readiness}%</strong></div>`).join('') || `<p class="aihub-intel-empty">${t('aiHubNoExams')}</p>`;
    const cards=(d.due_cards||[]).map(x=>`<article class="aihub-review-card"><b>${esc(x.course||t('aiHubGeneral'))}</b><p>${esc(x.front)}</p><details><summary>${t('aiHubRevealAnswer')}</summary><p>${esc(x.back)}</p><div class="aihub-review-ratings"><button data-ai-act="card-rate" data-id="${esc(x.id)}" data-quality="1">${t('aiHubAgain')}</button><button data-ai-act="card-rate" data-id="${esc(x.id)}" data-quality="3">${t('aiHubHard')}</button><button data-ai-act="card-rate" data-id="${esc(x.id)}" data-quality="4">${t('aiHubGood')}</button><button data-ai-act="card-rate" data-id="${esc(x.id)}" data-quality="5">${t('aiHubEasy')}</button></div></details></article>`).join('') || `<p class="aihub-intel-empty">${t('aiHubNoDueCards')}</p>`;
    return `<section class="aihub-intelligence"><div class="aihub-section-head"><div><h2>${t('aiHubIntelligence')}</h2><p>${t('aiHubIntelligenceHint')}</p></div><button type="button" class="aihub-upload-button" data-ai-act="study-plan">${icon('calendar-plus')} ${t('aiHubGeneratePlan')}</button></div>
      <div class="aihub-intel-stats"><div><b>${stats.completion||0}%</b><small>${t('aiHubPlanCompletion')}</small></div><div><b>${stats.due_cards||0}</b><small>${t('aiHubCardsDue')}</small></div><div><b>${stats.mastered_cards||0}</b><small>${t('aiHubMastered')}</small></div></div>
      <div class="aihub-intel-columns"><div class="aihub-intel-panel"><h3>${t('aiHubUpcomingStudy')}</h3>${sessions}</div><div class="aihub-intel-panel"><h3>${t('aiHubExamReadiness')}</h3>${exams}</div></div>
      <div class="aihub-intel-panel aihub-review-panel"><div class="aihub-section-head"><div><h3>${t('aiHubReviewQueue')}</h3><p>${t('aiHubReviewQueueHint')}</p></div><button type="button" class="aihub-text-button" data-ai-act="card-add">${icon('plus')} ${t('aiHubAddFlashcard')}</button></div><div class="aihub-review-grid">${cards}</div></div>
    </section>`;
  }
  async function loadIntelligence() {
    try { const r=await U.api.call('aiStudyIntelligenceDashboard',{}); state.intelligence=r; state.intelligenceLoaded=true; }
    catch(e){ console.warn('AI Study Intelligence:',e); }
  }
  function renderTutor() {
    const d=state.tutorDashboard||{};
    const weak=(d.weak_topics||[]).map(x=>`<div class="aitutor-weak-row"><span><b>${esc(x.course||t('aiTutorGeneral'))}</b><small>${esc(x.topic)} · ${x.attempts} ${t('aiTutorAttempts')}</small></span><strong>${x.accuracy}%</strong></div>`).join('') || `<p class="aihub-intel-empty">${t('aiTutorNoWeakness')}</p>`;
    const quiz=state.tutorQuiz;
    const questions=quiz?(quiz.questions||[]).map((q,i)=>`<article class="aitutor-question"><b>${i+1}. ${esc(q.question)}</b><div class="aitutor-options">${q.options.map((o,j)=>`<label class="aitutor-option ${state.tutorAnswers[q.id]===j?'selected':''}"><input type="radio" name="aitutor-${esc(q.id)}" value="${j}" data-tutor-answer="${esc(q.id)}" ${state.tutorAnswers[q.id]===j?'checked':''}><span>${esc(o)}</span></label>`).join('')}</div></article>`).join('') : '';
    const result=state.tutorResult?`<div class="aitutor-result"><div class="aitutor-score"><b>${state.tutorResult.percentage}%</b><span>${state.tutorResult.score}/${state.tutorResult.total} ${t('aiTutorCorrect')}</span></div>${(state.tutorResult.details||[]).map((x,i)=>`<div class="aitutor-feedback"><b>${x.correct?'✓':'✕'} ${t('aiTutorQuestion')} ${i+1} · ${esc(x.concept)}</b><p>${esc(x.explanation||'')}</p></div>`).join('')}<button type="button" class="aihub-upload-button" data-ai-act="tutor-reset">${t('aiTutorNewQuiz')}</button></div>`:'';
    return `<section class="aitutor-panel"><div class="aihub-section-head"><div><h2>${t('aiTutorTitle')}</h2><p>${t('aiTutorHint')}</p></div><span class="aitutor-mark">${icon('graduation-cap')}</span></div>
      <div class="aitutor-dashboard"><div><b>${d.attempt_count||0}</b><small>${t('aiTutorAttempts')}</small></div><div><b>${d.average_accuracy||0}%</b><small>${t('aiTutorAverage')}</small></div><div class="aitutor-weak"><b>${t('aiTutorWeakTopics')}</b>${weak}</div></div>
      ${!quiz?`<form class="aitutor-form" data-ai-form="tutor"><label>${t('aiTutorCourse')}<select name="course"><option value="">${t('aiTutorGeneral')}</option>${((U.data&&U.data.courses)||[]).map(c=>`<option value="${esc(c.code||c.name)}">${esc(c.code||'')} ${esc(c.name||'')}</option>`).join('')}</select></label><label>${t('aiTutorTopic')}<input name="topic" maxlength="160" required placeholder="${t('aiTutorTopicPlaceholder')}"></label><label>${t('aiTutorDifficulty')}<select name="difficulty"><option value="adaptive">${t('aiTutorAdaptive')}</option><option value="easy">${t('aiTutorEasy')}</option><option value="medium">${t('aiTutorMedium')}</option><option value="hard">${t('aiTutorHard')}</option></select></label><button class="aihub-upload-button" type="submit" ${state.tutorLoading?'disabled':''}>${icon('sparkles')} ${state.tutorLoading?t('aiTutorGenerating'):t('aiTutorStart')}</button></form>`:`<div class="aitutor-quiz-head"><b>${esc(quiz.topic)}</b><small>${esc(quiz.course||t('aiTutorGeneral'))} · ${esc(quiz.difficulty)}</small></div>${questions}${!state.tutorResult?`<button type="button" class="aihub-upload-button" data-ai-act="tutor-submit" ${Object.keys(state.tutorAnswers).length!==5?'disabled':''}>${t('aiTutorSubmit')}</button>`:''}`}
      ${quiz&&state.tutorResult?result:''}</section>`;
  }
  function renderCopilot() {
    const c=state.copilot;
    const summary=c&&c.snapshot_summary;
    return `<section class="aihub-copilot"><div class="aihub-section-head"><div><h2>${t('aiCopilotTitle')}</h2><p>${t('aiCopilotHint')}</p></div><span class="aihub-copilot-mark">${icon('compass')}</span></div>
      <div class="aihub-copilot-body">${c?`<div class="aihub-copilot-stats"><span>${summary.assignments} ${t('aiCopilotAssignments')}</span><span>${summary.exams} ${t('aiCopilotExams')}</span><span>${summary.weak_topics} ${t('aiCopilotWeakTopics')}</span><span>${summary.flashcards_due} ${t('aiCopilotDueCards')}</span></div><div class="aihub-copilot-plan">${esc(c.plan).replace(/\n/g,'<br>')}</div>`:`<p>${t('aiCopilotEmpty')}</p>`}
      <button type="button" class="aihub-upload-button" data-ai-act="copilot-run" ${state.copilotLoading?'disabled':''}>${icon('sparkles')} ${state.copilotLoading?t('aiCopilotLoading'):t('aiCopilotGenerate')}</button></div></section>`;
  }
  async function runCopilot() {
    state.copilotLoading=true;draw();
    try { state.copilot=await U.api.call('aiAcademicCopilot',{}); }
    catch(e){notifyError(e);}
    finally {state.copilotLoading=false;draw();}
  }
  const modes = [
    {id:'chat',label:'Chat',icon:'message-circle',hint:'Ask anything about university life and your studies.',prompt:''},
    {id:'explain',label:'Learn',icon:'lightbulb',hint:'Understand difficult topics, step by step.',prompt:'Act as a patient tutor. Explain concepts step by step, use simple examples, check my understanding, and do not assume I already know the basics.\n\n'},
    {id:'assignment',label:'Assignment',icon:'clipboard-list',hint:'Break down briefs, research and writing tasks.',prompt:'Act as my academic assignment coach. Help me understand the brief, plan the work, structure my ideas and improve my draft without doing dishonest academic work for me.\n\n'},
    {id:'exam',label:'Exam prep',icon:'graduation-cap',hint:'Revise topics and prepare for upcoming exams.',prompt:'Act as my exam preparation coach. Help me prioritise topics, explain concepts, create practice questions and build a realistic revision approach. Use my UniLife OS academic context when relevant.\n\n'},
    {id:'planner',label:'Study plan',icon:'calendar-check',hint:'Build a realistic plan around my schedule.',prompt:'Act as my study planner. Use my available UniLife OS timetable, assignments and examinations when relevant. Make a realistic, prioritised plan and explain the next actions.\n\n'},
    {id:'writing',label:'Writing',icon:'pen-line',hint:'Improve clarity, grammar and academic structure.',prompt:'Act as my academic writing coach. Preserve my ideas and voice while helping improve clarity, grammar, structure and academic tone. Explain important edits.\n\n'},
    {id:'quiz',label:'Quiz',icon:'brain',hint:'Practise with questions and explanations.',prompt:'Act as an interactive quiz tutor. Ask me which subject and topic if I have not specified them, then quiz me one question at a time. Wait for my answer before revealing the explanation.\n\n'},
    {id:'language',label:'Language',icon:'languages',hint:'Practise a language at my level.',prompt:'Act as my language practice partner. Adapt to my level, correct mistakes kindly and keep the conversation interactive.\n\n'}
  ];
  const suggestions = [
    {icon:'book-open',text:'Explain a topic I find difficult',mode:'explain'},
    {icon:'clipboard-check',text:'Help me plan my assignment',mode:'assignment'},
    {icon:'calendar-days',text:'Make a study plan for this week',mode:'planner'},
    {icon:'brain',text:'Test my knowledge with a quiz',mode:'quiz'}
  ];
  function attachmentCard(a, i, removable) {
    const kindIcon = a.kind==='image' ? 'image' : a.kind==='pdf' ? 'file-pdf' : 'file-text';
    const status = a.status==='loading' ? 'Preparing…' : a.kind==='image' ? 'Image' : a.kind==='pdf' ? 'PDF document' : 'Text document';
    return `<div class="aihub-attachment-chip ${a.kind==='image'?'is-image':''} ${a.status==='loading'?'is-loading':''}">
      ${a.preview && a.kind==='image' ? `<img src="${a.preview}" alt="${esc(a.name)}">` : `<span class="aihub-file-icon">${icon(kindIcon)}</span>`}
      <span class="aihub-file-meta"><b>${esc(a.name)}</b><small>${status}</small></span>
      ${a.status==='loading' ? '<span class="aihub-file-spinner" aria-label="Preparing file"></span>' : removable ? `<button type="button" data-ai-act="remove-attachment" data-index="${i}" aria-label="Remove ${esc(a.name)}">${icon('x')}</button>` : ''}
    </div>`;
  }
  function renderAttachments() {
    if (!state.attachments.length) return '';
    return `<div class="aihub-attachment-chips">${state.attachments.map((a,i)=>attachmentCard(a,i,true)).join('')}</div>`;
  }
  function renderMessageAttachments(items) {
    if (!items || !items.length) return '';
    return `<div class="aihub-message-attachments">${items.map(a=>attachmentCard(a,0,false)).join('')}</div>`;
  }
  async function compressImageForAI(file) {
    const source = await new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = reader.result; };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const scale = Math.min(1, 1600 / Math.max(source.width, source.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not prepare image for AI.');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    if (dataUrl.length > 2800000) throw new Error('Image is too large after compression. Try a smaller image.');
    return dataUrl;
  }
  async function addAttachments(files) {
    const incoming = Array.from(files || []);
    for (const file of incoming) {
      if (state.attachments.length >= 5) { if(U.ui&&U.ui.toast)U.ui.toast('Maximum 5 attachments per message.'); break; }
      if (file.size > 8*1024*1024) { if(U.ui&&U.ui.toast)U.ui.toast(`${file.name}: maximum file size is 8 MB.`); continue; }
      if (!file.type.startsWith('image/') && file.type!=='application/pdf' && file.type!=='text/plain' && !/\.(pdf|txt)$/i.test(file.name)) {
        if(U.ui&&U.ui.toast)U.ui.toast(`${file.name}: supported formats are images, PDF and TXT.`);
        continue;
      }
      if (file.type.startsWith('image/') && state.attachments.filter(a=>a.kind==='image').length >= 3) {
        if(U.ui&&U.ui.toast)U.ui.toast('Maximum 3 images per message.');
        continue;
      }
      const id = 'att-' + Date.now() + '-' + Math.random().toString(36).slice(2,7);
      const kind = file.type.startsWith('image/') ? 'image' : (file.type==='application/pdf' || /\.pdf$/i.test(file.name)) ? 'pdf' : 'text';
      state.attachments.push({id,name:file.name,kind,status:'loading',preview:'',content:''});
      draw();
      try {
        let data = {};
        if (kind==='image') {
          const preview = await compressImageForAI(file);
          data = {preview,content:preview,status:'ready'};
        } else if (kind==='pdf') {
          const extracted = await extractPdfText(file);
          data = {content:extracted.text,pages:extracted.pages,status:'ready'};
        } else {
          const content = await file.text();
          if (content.length>30000) throw new Error('Text file exceeds 30,000 characters.');
          data = {content,status:'ready'};
        }
        const index = state.attachments.findIndex(a=>a.id===id);
        if (index>=0) state.attachments[index] = {...state.attachments[index],...data};
      } catch(err) {
        state.attachments = state.attachments.filter(a=>a.id!==id);
        if(U.ui&&U.ui.toast)U.ui.toast(`${file.name}: ${err.message||'Could not read file.'}`);
      }
      draw();
    }
    state.attachMenuOpen=false;
    draw();
  }
  function renderWorkspace() {
    const name = U.data && U.data.user && U.data.user.name ? U.data.user.name.split(' ')[0] : '';
    const active = state.conversations.find(c => c.id === state.activeId);
    const selected = modes.find(m=>m.id===state.mode)||modes[0];
    const welcome = t('aiHubWelcome').replace('{name}', '<span class="hl">'+esc(name || (U.prefs && U.prefs.lang==='ms'?'pelajar':'there'))+'</span>');
    const modeBar = '<span class="aihub-mode-pill"></span>' + modes.map(m=>`<button type="button" class="aihub-mode ${state.mode===m.id?'active':''}" data-ai-act="mode" data-mode="${m.id}" aria-pressed="${state.mode===m.id}">${icon(m.icon)}<span>${m.label}</span></button>`).join('');
    const suggestionBar = suggestions.map((x,i)=>`<button type="button" class="aihub-suggestion" style="--i:${i}" data-ai-act="suggest" data-mode="${x.mode}" data-text="${esc(x.text)}"><em>0${i+1}</em><span>${x.text}</span>${icon(x.icon)}</button>`).join('');
    const words = t('aiHubWelcome').split(' ').map((w,i)=>`<span class="w" style="--w:${i}">${w.includes('{name}')?w.replace('{name}','<em>'+esc(name || (U.prefs && U.prefs.lang==='ms'?'pelajar':'there'))+'</em>'):esc(w)}</span>`).join(' ');
    const empty = (!state.messages.length || state.firstChatTransition) ? `<div class="aihub-welcome-state ${state.firstChatTransition?'is-leaving':''}"><div class="aihub-bot" aria-hidden="true"><div class="body"></div><div class="eyes"><i class="eye"></i><i class="eye"></i></div><div class="shadow"></div></div><div class="aihub-welcome-copy"><p class="aihub-welcome-kicker">${selected.label} mode</p><h1>${words}</h1><p class="aihub-mode-hint">${selected.hint}</p></div><div class="aihub-suggestions">${suggestionBar}</div></div>` : '';
    return `<section class="aihub-workspace ${state.messages.length?'has-chat':''} ${state.firstChatTransition?'is-first-chat-transition':''}" data-mode="${state.mode}">
      <header class="aihub-workspace-top"><div class="aihub-brand">${icon('sparkles')}<span>UniLife AI</span><small>STUDY COMPANION</small></div><div class="aihub-top-actions"><button type="button" class="aihub-top-button" data-ai-act="history" aria-expanded="${state.historyOpen}">${icon('history')}<span>History</span></button><button type="button" class="aihub-top-button" data-ai-act="new">${icon('plus')}<span>New chat</span></button><button type="button" class="aihub-top-button" data-ai-act="study" aria-expanded="${state.studyOpen}">${icon('library')}<span>Study space</span></button></div></header>
      ${state.historyOpen?`<div class="aihub-history-drawer"><div class="aihub-history-heading"><b>Recent conversations</b><button type="button" data-ai-act="history">Close</button></div>${conversationList()}</div>`:''}
      <div class="aihub-mode-strip" role="group" aria-label="AI modes">${modeBar}</div>
      <div class="aihub-chat-stage"><div class="aihub-messages ${state.messages.length?'has-messages':'is-empty'}" id="aihub-messages">${empty}${messageList()}</div>
      </div>
      <div class="aihub-dock"><div class="aihub-composer-wrap">
        <div class="aihub-attach-menu" role="menu" hidden>
          <button type="button" role="menuitem" style="--i:0" data-ai-act="attach-images">${icon('image')}<span><b>Photos</b><small>Add a picture</small></span></button>
          <button type="button" role="menuitem" style="--i:1" data-ai-act="attach-files">${icon('file-text')}<span><b>Files and PDFs</b><small>Up to 5 files, 8 MB each</small></span></button>
          <button type="button" role="menuitem" style="--i:2" data-ai-act="study">${icon('library')}<span><b>My study space</b><small>Saved documents</small></span></button>
        </div>
        <form data-ai-form="send" class="aihub-composer aihub-unified-composer">
          <div class="aihub-attachment-list">${renderAttachments()}</div>
          <textarea name="message" rows="1" maxlength="3000" placeholder="Message UniLife AI..." aria-label="Message UniLife AI" ${state.busy?'disabled':''}></textarea>
          <div class="aihub-composer-bottom"><div class="aihub-composer-tools"><button type="button" class="aihub-attach-trigger" data-ai-act="attach-menu" aria-label="Add files" aria-haspopup="menu" aria-expanded="false" title="Add files">${icon('plus')}</button><span class="aihub-current-mode"><i></i>${selected.label} mode</span><small>${t('aiHubContext')}</small></div><button class="aihub-send" type="submit" aria-label="Send" ${state.busy?'disabled':''}>${state.busy?'<span class="aihub-send-spinner" aria-label="Sending"></span>':icon('arrow-up')}</button></div>
        </form></div>
        <p class="aihub-workspace-disclaimer">AI can make mistakes. Check important academic information.</p>
      </div>
      <input id="aihub-file-input" type="file" accept="image/*,.pdf,.txt,text/plain" multiple hidden>
      <input id="aihub-pdf-input" type="file" accept="application/pdf,.pdf" hidden>
      ${state.uploading?`<div class="aihub-upload-progress"><span class="aihub-spinner"></span><span>${esc(state.uploadProgress||t('aiHubUploading'))}</span></div>`:''}
      ${state.studyOpen?`<div class="aihub-study-scrim" data-ai-act="study"></div>
        <aside class="aihub-study-panel" aria-label="My study space">
          <header><div><b>My study space</b><small>Documents, progress, quizzes and overview</small></div><button type="button" class="aihub-top-button" data-ai-act="study" aria-label="Close">${icon('x')}</button></header>
          <div class="aihub-study-body">
            <section class="aihub-documents"><div class="aihub-section-head"><div><h2>${t('aiHubDocuments')}</h2><p>${t('aiHubDocumentsHint')}</p></div><button type="button" class="aihub-upload-button" data-ai-act="upload" ${state.uploading?'disabled':''}>${icon('upload-cloud')} ${t('aiHubUploadPdf')}</button></div><div class="aihub-document-grid">${documentCards()}</div><p class="aihub-file-note">${t('aiHubPdfPrivacy')}</p></section>
            ${renderCopilot()}
            ${renderIntelligence()}
            ${renderTutor()}
            <div class="aihub-context-note">${icon('shield-check')}<span><b>${t('aiHubContext')}</b><small>${t('aiHubContextHint')}</small></span></div>
          </div>
        </aside>`:''}
    </section>`;
  }
  function render() {
    syncPageClass();
    return `<div class="aihub-page">${renderWorkspace()}</div>`;
  }
  function documentCards() {
    if (!state.documents.length) return `<div class="aihub-doc-empty">${icon('file-up')}<b>${t('aiHubNoDocuments')}</b><small>${t('aiHubNoDocumentsHint')}</small></div>`;
    return state.documents.map(d => `<article class="aihub-document-card">
      <div class="aihub-document-top"><span class="aihub-pdf-icon">${icon('file-pdf')}</span><button type="button" class="aihub-doc-delete" data-ai-act="doc-delete" data-id="${esc(d.id)}" title="${t('aiHubDeleteDocument')}" aria-label="${t('aiHubDeleteDocument')}">${icon('trash-2')}</button></div>
      <b class="aihub-document-name" title="${esc(d.name)}">${esc(d.name)}</b>
      <small>${Number(d.page_count)||0} ${t('aiHubPages')} · ${Math.ceil((Number(d.text_length)||0)/1000)} KB text</small>
      <div class="aihub-document-actions">
        <button type="button" data-ai-act="doc-summary" data-id="${esc(d.id)}">${icon('list-checks')} ${t('aiHubSummarize')}</button>
        <button type="button" data-ai-act="doc-ask" data-id="${esc(d.id)}">${icon('message-circle')} ${t('aiHubAskDoc')}</button>
        <button type="button" data-ai-act="doc-guide" data-id="${esc(d.id)}">${icon('notebook-pen')} ${t('aiHubStudyGuide')}</button>
        <button type="button" data-ai-act="doc-quiz" data-id="${esc(d.id)}">${icon('brain')} ${t('aiHubMakeQuiz')}</button>
        <button type="button" data-ai-act="doc-cards" data-id="${esc(d.id)}">${icon('layers')} ${t('aiHubFlashcards')}</button>
      </div>
    </article>`).join('');
  }
  async function loadDocuments() {
    try {
      const r = await U.api.call('aiStudyHubListDocuments', {});
      state.documents = Array.isArray(r.documents) ? r.documents : [];
      state.docsLoaded = true;
    } catch (e) {
      console.warn('AI Study Hub document library:', e);
    }
  }
  async function extractPdfText(file) {
    const pdfjs = window.pdfjsLib;
    if (!pdfjs) throw {code:'aiPdfUnavailable'};
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const bytes = new Uint8Array(await file.arrayBuffer());
    let pdf;
    try {
      pdf = await pdfjs.getDocument({data:bytes}).promise;
    } catch (workerError) {
      // Some school/company networks block CDN workers. Retry PDF parsing on the main thread.
      pdf = await pdfjs.getDocument({data:bytes, disableWorker:true}).promise;
    }
    if (pdf.numPages < 1 || pdf.numPages > 50) throw {code:'aiPdfPages'};
    const pages = [];
    let total = 0;
    for (let pageNo=1; pageNo<=pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const text = content.items.map(x=>x.str || '').join(' ').replace(/[ \t]+/g,' ').trim();
      if (text) pages.push(`[Page ${pageNo}]\\n${text}`);
      total += text.length;
      state.uploadProgress = `${t('aiHubExtracting')} ${pageNo}/${pdf.numPages}`;
      if (total > 60000) throw {code:'aiPdfTooLong'};
      if (pageNo % 3 === 0) draw();
    }
    const extracted = pages.join('\\n\\n');
    if (extracted.replace(/\[Page \d+\]/g,'').trim().length < 80) throw {code:'aiPdfScanned'};
    return {text:extracted,pages:pdf.numPages};
  }
  function splitDocumentText(value) {
    const chunks = [];
    for (let i=0;i<value.length;i+=8000) chunks.push(value.slice(i,i+8000));
    return chunks;
  }
  async function uploadPdf(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      notifyError({code:'aiPdfType'}); return;
    }
    if (file.size > 8*1024*1024) { notifyError({code:'aiPdfSize'}); return; }
    state.uploading = true;
    state.uploadProgress = t('aiHubReadingPdf');
    draw();
    let documentId = '';
    try {
      const extracted = await extractPdfText(file);
      const chunks = splitDocumentText(extracted.text);
      const started = await U.api.call('aiStudyHubStartDocumentUpload', {
        name:file.name,mime_type:'application/pdf',size_bytes:file.size,
        page_count:extracted.pages,chunk_count:chunks.length
      });
      documentId = started.document.id;
      for (let i=0;i<chunks.length;i++) {
        state.uploadProgress = `${t('aiHubSavingText')} ${i+1}/${chunks.length}`;
        draw();
        await U.api.call('aiStudyHubSaveDocumentChunk', {
          document_id:documentId,chunk_index:i,content:chunks[i]
        });
      }
      await U.api.call('aiStudyHubCompleteDocumentUpload', {document_id:documentId});
      await loadDocuments();
      if (U.ui && U.ui.toast) U.ui.toast(t('aiHubUploadDone'));
    } catch (e) {
      if (documentId) {
        try { await U.api.call('aiStudyHubDeleteDocument',{document_id:documentId}); } catch (_) {}
      }
      notifyError(e);
    } finally {
      state.uploading = false;
      state.uploadProgress = '';
      draw();
    }
  }
  async function startDocumentTask(id, mode) {
    if (state.busy) return;
    const doc = state.documents.find(x=>x.id===id);
    if (!doc) return;
    const prompts = {
      ask: `I uploaded "${doc.name}". Help me understand this document. Briefly identify its subject and ask what I would like to explore. When answering later questions, use the document text and mention page numbers where possible.`,
      summary: `Create a comprehensive but easy-to-revise summary of "${doc.name}". Organize it by topic and section. Capture the main ideas, key definitions, formulas or processes, and important examples. Preserve page references like [Page 3] where useful. Do not add facts that are not in the document.`,
      guide: `Turn "${doc.name}" into a structured study guide. Include learning objectives, topic-by-topic explanations, key terms, important points to remember, common misunderstandings, and a short self-check section. Base it on the document and retain page references.`,
      quiz: `Create a practice quiz based only on "${doc.name}". Give 10 varied questions, a mix of multiple-choice and short-answer. Put the answer key after all questions with brief explanations and page references. Do not reveal answers immediately after each question.`,
      cards: `Create 12 useful flashcards from "${doc.name}". Format each as **Front:** a clear question or prompt, then **Back:** a concise answer. Cover the most important concepts and definitions, and include page references where possible.`
    };
    try {
      const r = await U.api.call('aiStudyHubCreateDocumentConversation', {
        document_id:id,title:mode==='ask'?`Ask: ${doc.name}`:`${({summary:'Summary',guide:'Study guide',quiz:'Quiz',cards:'Flashcards'})[mode]||'Study'}: ${doc.name}`
      });
      const c = r.conversation;
      state.conversations.unshift(c);
      state.activeId = c.id;
      state.messages = [];
      draw();
      await sendMessage(prompts[mode] || prompts.ask);
    } catch (e) { notifyError(e); }
  }
  async function deleteDocument(id) {
    const doc = state.documents.find(x=>x.id===id);
    if (!doc || !window.confirm(t('aiHubDeleteDocumentConfirm').replace('{name}',doc.name))) return;
    try {
      await U.api.call('aiStudyHubDeleteDocument',{document_id:id});
      state.documents = state.documents.filter(x=>x.id!==id);
      if (U.ui && U.ui.toast) U.ui.toast(t('aiHubDocumentDeleted'));
      draw();
    } catch (e) { notifyError(e); }
  }
  async function loadConversations() {
    if (state.loading) return;
    state.loading = true;
    try {
      const r = await U.api.call('aiStudyHubListConversations', {limit:40});
      state.conversations = Array.isArray(r.conversations) ? r.conversations : [];
      state.loaded = true;
    } catch (e) {
      console.warn('AI Study Hub conversation list:', e);
    } finally { state.loading = false; }
  }
  async function onEnter() {
    if (!state.loaded) await loadConversations();
    if (!state.docsLoaded) await loadDocuments();
    if (!state.intelligenceLoaded) await loadIntelligence();
    if (!state.tutorDashboard) await loadTutorDashboard();
    if (state.activeId && !state.messages.length) {
      try {
        const r = await U.api.call('aiStudyHubGetConversation', {conversation_id:state.activeId});
        state.messages = r.messages || [];
      } catch (e) { state.activeId=''; }
    }
    draw();
  }
  async function createConversation() {
    const r = await U.api.call('aiStudyHubCreateConversation', {});
    const c = r.conversation;
    state.conversations.unshift(c);
    state.activeId = c.id;
    state.messages = [];
    return c;
  }
  async function openConversation(id) {
    if (state.busy) return;
    state.activeId = id;
    state.messages = [];
    draw();
    try {
      const r = await U.api.call('aiStudyHubGetConversation', {conversation_id:id});
      state.messages = r.messages || [];
      state.jump = true;
    } catch (e) { notifyError(e); }
    draw();
  }
  async function loadTutorDashboard() {
    try { state.tutorDashboard=await U.api.call('aiTutorDashboard',{}); } catch(e){ console.warn('AI Tutor dashboard:',e); }
  }
  async function generateTutorQuiz(form) {
    const data=new FormData(form),topic=String(data.get('topic')||'').trim(); if(!topic)return;
    state.tutorLoading=true;draw();
    try { const r=await U.api.call('aiTutorGenerateQuiz',{course:String(data.get('course')||''),topic:topic,difficulty:String(data.get('difficulty')||'adaptive')}); state.tutorQuiz=r.quiz;state.tutorAnswers={};state.tutorResult=null; }
    catch(e){notifyError(e);} finally {state.tutorLoading=false;draw();}
  }
  async function submitTutorQuiz() {
    if(!state.tutorQuiz||Object.keys(state.tutorAnswers).length!==5)return;
    try { const r=await U.api.call('aiTutorSubmitQuiz',{quiz_id:state.tutorQuiz.id,answers:state.tutorAnswers});state.tutorResult=r;state.tutorDashboard=r.dashboard;draw(); }
    catch(e){notifyError(e);}
  }
  function resetTutorQuiz(){state.tutorQuiz=null;state.tutorAnswers={};state.tutorResult=null;draw();}
  function notifyError(e) {
    const code = e && e.code;
    const errorKeys = {
      aiLimit:'aiHubLimit',aiConfig:'aiHubNoApi',aiPdfUnavailable:'aiHubPdfUnavailable',
      aiPdfPages:'aiHubPdfPages',aiPdfTooLong:'aiHubPdfTooLong',aiPdfScanned:'aiHubPdfScanned',
      aiPdfType:'aiHubPdfType',aiPdfSize:'aiHubPdfSize',aiDocumentLimit:'aiHubDocumentLimit',
      aiDocumentIncomplete:'aiHubDocumentIncomplete',aiDocumentNotReady:'aiHubDocumentNotReady',
      noUpcomingExams:'aiHubNoUpcomingExams',cardLimit:'aiHubCardLimit',aiQuizFormat:'aiTutorQuizError',quizCompleted:'aiTutorAlreadySubmitted'
    };
    const message = t(errorKeys[code] || 'aiHubError');
    if (U.ui && U.ui.toast) U.ui.toast(message); else alert(message);
  }
  async function sendMessage(message) {
    const rawContent = String(message || '').trim();
    if ((!rawContent && !state.attachments.length) || state.busy) return;
    if (state.attachments.some(a=>a.status==='loading')) {
      if(U.ui&&U.ui.toast)U.ui.toast('Please wait until your files finish preparing.');
      return;
    }
    const attachmentSnapshot = state.attachments.map(a=>({name:a.name,kind:a.kind,preview:a.kind==='image'?a.preview:''}));
    const imageAttachments = state.attachments.filter(a=>a.kind==='image').slice(0,3);
    const fileContext=state.attachments.filter(a=>a.kind!=='image').map(a=>`\n\n[Attached file: ${a.name}]\n${a.content}`).join('');
    const imageNotes = imageAttachments.map(a=>`\n[Image attached: ${a.name}]`).join('');
    const selectedMode = modes.find(m=>m.id===state.mode)||modes[0];
    const content = (selectedMode.prompt ? selectedMode.prompt : '') + rawContent + fileContext + imageNotes;
    state.busy = true;
    state.firstChatTransition = state.messages.length === 0;
    state.messages.push({role:'user',content:content,attachments:attachmentSnapshot,created_at:new Date().toISOString()});
    draw();
    try {
      if (!state.activeId) await createConversation();
      const r = await U.api.call('aiStudyHubSendMessage', {
        conversation_id:state.activeId,message:content,
        images:imageAttachments.map(a=>a.content)
      });
      state.messages.push({role:'assistant',content:r.reply,created_at:new Date().toISOString()});
      state.attachments=[];
      if (r.conversation) {
        const i = state.conversations.findIndex(c=>c.id===r.conversation.id);
        if (i>=0) state.conversations[i]=r.conversation; else state.conversations.unshift(r.conversation);
        state.conversations.sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));
      }
    } catch (e) {
      // Do not persist an optimistic message locally when the backend rejected it.
      if (state.messages.length && state.messages[state.messages.length-1].role==='user') state.messages.pop();
      notifyError(e);
    } finally { state.busy = false; draw(); }
  }
  async function deleteConversation(id) {
    if (!window.confirm(t('aiHubDeleteConfirm'))) return;
    state.deletingId = id;
    draw();
    try {
      await U.api.call('aiStudyHubDeleteConversation', {conversation_id:id});
      state.conversations = state.conversations.filter(c=>c.id!==id);
      if (state.activeId===id) { state.activeId=''; state.messages=[]; }
      if (U.ui && U.ui.toast) U.ui.toast(t('aiHubDeleteDone'));
      draw();
    } catch (e) { notifyError(e); }
    finally { state.deletingId = ''; draw(); }
  }
  async function chooseTool(id) {
    const item = tools.find(x=>x.id===id);
    if (!item) return;
    state.activeId = '';
    state.messages = [];
    try { await sendMessage(item.prompt); }
    catch (e) { notifyError(e); }
  }
  function newChat() { state.activeId=''; state.messages=[]; draw(); }
  function home() { state.activeId=''; state.messages=[]; draw(); }
  async function refreshIntelligence() { await loadIntelligence(); draw(); }
  async function generateStudyPlan() {
    try { const r=await U.api.call('aiStudyIntelligenceGeneratePlan',{}); state.intelligence=r.dashboard; state.intelligenceLoaded=true; if(U.ui&&U.ui.toast)U.ui.toast(t('aiHubPlanCreated').replace('{count}',r.created_sessions)); draw(); }
    catch(e){ notifyError(e); }
  }
  async function completeStudySession(id) {
    try { const r=await U.api.call('aiStudyIntelligenceCompleteSession',{session_id:id}); state.intelligence=r.dashboard; draw(); }
    catch(e){notifyError(e);}
  }
  async function addFlashcard() {
    const course=window.prompt(t('aiHubFlashcardCourse'));
    if(course===null)return;
    const front=window.prompt(t('aiHubFlashcardFront'));
    if(front===null)return;
    const back=window.prompt(t('aiHubFlashcardBack'));
    if(back===null)return;
    try { const r=await U.api.call('aiStudyIntelligenceAddCard',{course,front,back}); state.intelligence=r.dashboard; draw(); }
    catch(e){notifyError(e);}
  }
  async function reviewFlashcard(id,quality) {
    try { const r=await U.api.call('aiStudyIntelligenceReviewCard',{card_id:id,quality}); state.intelligence=r.dashboard; if(U.ui&&U.ui.toast)U.ui.toast(t('aiHubNextReview').replace('{date}',r.next_review)); draw(); }
    catch(e){notifyError(e);}
  }
  document.addEventListener('click', e => {
    if (state.attachMenuOpen && !e.target.closest('.aihub-attach-menu') && !e.target.closest('.aihub-attach-trigger')) closeAttachMenu();
    const button = e.target.closest('[data-ai-act]');
    if (!button) return;
    const action = button.dataset.aiAct;
    if (action==='new') newChat();
    else if (action==='history') { state.historyOpen=!state.historyOpen; draw(); }
    else if (action==='mode') { state.mode=button.dataset.mode||'chat'; draw(); }
    else if (action==='suggest') { state.mode=button.dataset.mode||'chat'; draw(); const field=$('textarea[name="message"]'); if(field){field.value=button.dataset.text||'';field.focus();} }
    else if (action==='home') home();
    else if (action==='open') openConversation(button.dataset.id);
    else if (action==='delete') deleteConversation(button.dataset.id);
    else if (action==='tool') chooseTool(button.dataset.tool);
    else if (action==='upload') $('#aihub-pdf-input')?.click();
    else if (action==='attach-menu') { const m=$('.aihub-attach-menu'); if(m){ m.hidden=!m.hidden; state.attachMenuOpen=!m.hidden; button.setAttribute('aria-expanded',String(state.attachMenuOpen)); } }
    else if (action==='study') { state.studyOpen=!state.studyOpen; state.attachMenuOpen=false; draw(); }
    else if (action==='attach-images') { closeAttachMenu(); const f=$('#aihub-file-input'); if(f){f.accept='image/*';f.click();} }
    else if (action==='attach-files') { closeAttachMenu(); const f=$('#aihub-file-input'); if(f){f.accept='.pdf,.txt,application/pdf,text/plain';f.click();} }
    else if (action==='remove-attachment') { state.attachments.splice(Number(button.dataset.index),1); draw(); }
    else if (action==='doc-summary') startDocumentTask(button.dataset.id,'summary');
    else if (action==='doc-ask') startDocumentTask(button.dataset.id,'ask');
    else if (action==='doc-guide') startDocumentTask(button.dataset.id,'guide');
    else if (action==='doc-quiz') startDocumentTask(button.dataset.id,'quiz');
    else if (action==='doc-cards') startDocumentTask(button.dataset.id,'cards');
    else if (action==='doc-delete') deleteDocument(button.dataset.id);
    else if (action==='copilot-run') runCopilot();
    else if (action==='study-refresh') { state.intelligenceLoaded=false; loadIntelligence().then(draw); }
    else if (action==='study-plan') generateStudyPlan();
    else if (action==='study-done') completeStudySession(button.dataset.id);
    else if (action==='card-add') addFlashcard();
    else if (action==='card-rate') reviewFlashcard(button.dataset.id,Number(button.dataset.quality));
    else if (action==='tutor-submit') submitTutorQuiz();
    else if (action==='tutor-reset') resetTutorQuiz();
  });
  document.addEventListener('change', e => {
    if (e.target && e.target.id === 'aihub-file-input') {
      // FileList is live: clearing input.value first empties the same FileList.
      // Snapshot File objects before resetting the picker so addAttachments receives them.
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (files.length) addAttachments(files);
      return;
    }
    if (e.target && e.target.id === 'aihub-pdf-input') {
      // Keep a stable File reference before resetting the input, allowing the same PDF
      // to be selected again later without losing the current selection.
      const file = e.target.files && e.target.files.length ? e.target.files[0] : null;
      e.target.value = '';
      if (file) uploadPdf(file);
      return;
    }
  });
  document.addEventListener('change', e => {
    const answer=e.target.closest('[data-tutor-answer]');
    if(answer){state.tutorAnswers[answer.dataset.tutorAnswer]=Number(answer.value);draw();}
  });
  document.addEventListener('pointermove', e => {
    const eyes=$('.aihub-bot .eyes'); if(!eyes) return;
    const r=eyes.getBoundingClientRect(), dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2), an=Math.atan2(dy,dx), d=Math.min(5,Math.hypot(dx,dy)/60);
    eyes.querySelectorAll('.eye').forEach(el=>{el.style.setProperty('--ex',Math.cos(an)*d+'px');el.style.setProperty('--ey',Math.sin(an)*d+'px');});
  },{passive:true});
  document.addEventListener('keydown', e => {
    if (e.key==='Escape') { if (state.attachMenuOpen) closeAttachMenu(); else if (state.studyOpen) { state.studyOpen=false; draw(); } }
    const f=e.target.closest&&e.target.closest('textarea[name="message"]');
    if (f && e.key==='Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); const form=f.closest('form'); if(form&&form.requestSubmit) form.requestSubmit(); }
  });
  document.addEventListener('input', e => { if (e.target && e.target.matches && e.target.matches('textarea[name="message"]')) autoGrow(e.target); });
  document.addEventListener('submit', e => {
    const tutor=e.target.closest('form[data-ai-form="tutor"]');
    if(tutor){e.preventDefault();generateTutorQuiz(tutor);return;}
    const form = e.target.closest('form[data-ai-form="send"]');
    if (!form) return;
    e.preventDefault();
    const field = $('textarea[name="message"]',form);
    const value = field ? field.value : '';
    if (field) { field.value = ''; autoGrow(field); }
    sendMessage(value);
  });
  U.aiHub = { render, onEnter, refresh:async()=>{state.loaded=false;state.docsLoaded=false;await onEnter();} };
})();
