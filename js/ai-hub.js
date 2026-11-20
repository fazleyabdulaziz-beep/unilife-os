/* UniLife OS — AI Study Hub (Phase 1 + 2)
 * Dedicated persistent conversations. AI requests stay on the Apps Script backend.
 */
(function () {
  'use strict';
  const U = window.UL;
  if (!U) return;
  const state = { conversations: [], activeId: '', messages: [], busy: false, loaded: false, loading: false,
    documents: [], docsLoaded: false, uploading: false, uploadProgress: '', intelligence: null, intelligenceLoaded: false, tutorQuiz:null, tutorAnswers:{}, tutorResult:null, tutorDashboard:null, tutorLoading:false, copilot:null, copilotLoading:false };
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
  function draw() {
    const view = $('#view');
    if (view && location.hash.replace('#/','') === 'ai') {
      view.innerHTML = render();
      refreshIcons();
      const log = $('#aihub-messages');
      if (log) log.scrollTop = log.scrollHeight;
    }
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
      <button type="button" class="aihub-conversation-delete" data-ai-act="delete" data-id="${esc(c.id)}" aria-label="${t('aiHubDelete')}" title="${t('aiHubDelete')}">${icon('trash-2')}</button>
    </div>`).join('');
  }
  function messageList() {
    if (!state.messages.length) return `<div class="aihub-chat-empty"><span>${icon('sparkles')}</span><b>${t('aiHubNoMessages')}</b></div>`;
    return state.messages.map(m => `<article class="aihub-message ${m.role==='user'?'from-user':'from-ai'}">
      <div class="aihub-message-avatar">${icon(m.role==='user'?'user':'brain')}</div>
      <div class="aihub-message-body"><small>${m.role==='user'?t('aiHubYou'):t('aiHubAssistant')}</small><p>${esc(m.content).replace(/\n/g,'<br>')}</p></div>
    </article>`).join('') + (state.busy ? `<article class="aihub-message from-ai"><div class="aihub-message-avatar">${icon('brain')}</div><div class="aihub-message-body"><small>${t('aiHubAssistant')}</small><p class="aihub-thinking"><span></span><span></span><span></span> ${t('aiHubThinking')}</p></div></article>` : '');
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
  function renderHome() {
    const name = U.data && U.data.user && U.data.user.name ? U.data.user.name.split(' ')[0] : '';
    const welcome = t('aiHubWelcome').replace('{name}', esc(name || (U.prefs && U.prefs.lang==='ms'?'pelajar':'there')));
    return `<section class="aihub-home">
      <div class="aihub-hero">
        <div class="aihub-eyebrow"><span></span>${t('aiHubEyebrow')}</div>
        <h1>${t('aiHubTitle')}</h1><p>${t('aiHubSubtitle')}</p>
        <div class="aihub-home-prompt"><div class="aihub-home-greeting">${welcome}</div>
          <form data-ai-form="send" class="aihub-composer">
            <textarea name="message" rows="2" maxlength="3000" placeholder="${t('aiHubPlaceholder')}" aria-label="${t('aiHubPlaceholder')}"></textarea>
            <div class="aihub-composer-footer"><small>${t('aiHubContext')}</small><button class="aihub-send" type="submit" aria-label="${t('aiHubSend')}">${icon('arrow-up')}</button></div>
          </form>
        </div>
      </div>
      ${renderCopilot()}
      ${renderIntelligence()}
      ${renderTutor()}
      <section class="aihub-documents">
        <div class="aihub-section-head"><div><h2>${t('aiHubDocuments')}</h2><p>${t('aiHubDocumentsHint')}</p></div>
          <button type="button" class="aihub-upload-button" data-ai-act="upload" ${state.uploading?'disabled':''}>${icon('upload-cloud')} ${t('aiHubUploadPdf')}</button>
        </div>
        <input id="aihub-pdf-input" type="file" accept="application/pdf,.pdf" hidden>
        ${state.uploading ? `<div class="aihub-upload-progress"><span class="aihub-spinner"></span><span>${esc(state.uploadProgress || t('aiHubUploading'))}</span></div>` : ''}
        <div class="aihub-document-grid">${documentCards()}</div>
        <p class="aihub-file-note">${t('aiHubPdfPrivacy')}</p>
      </section>
      <div class="aihub-section-head"><div><h2>${t('aiHubTools')}</h2><p>${t('aiHubToolsHint')}</p></div></div>
      <div class="aihub-tools-grid">${toolCards()}</div>
      <div class="aihub-home-recent"><div class="aihub-section-head"><div><h2>${t('aiHubRecent')}</h2></div><button type="button" class="aihub-text-button" data-ai-act="new">${t('aiHubNewChat')}</button></div>
        <div class="aihub-home-recent-list">${state.conversations.length ? conversationList() : `<p class="aihub-empty-list">${t('aiHubEmpty')}</p>`}</div>
      </div>
      <div class="aihub-context-note">${icon('shield-check')}<span><b>${t('aiHubContext')}</b><small>${t('aiHubContextHint')}</small></span></div>
      <p class="aihub-disclaimer">${t('aiHubDisclaimer')}</p>
    </section>`;
  }
  function renderChat() {
    const active = state.conversations.find(c => c.id === state.activeId);
    return `<section class="aihub-chat-layout">
      <aside class="aihub-chat-sidebar">
        <button type="button" class="aihub-new-chat" data-ai-act="new">${icon('plus')} ${t('aiHubNewChat')}</button>
        <div class="aihub-sidebar-label">${t('aiHubRecent')}</div>
        <div class="aihub-conversation-list">${conversationList()}</div>
        <div class="aihub-sidebar-context">${icon('shield-check')}<span>${t('aiHubContext')}</span></div>
      </aside>
      <div class="aihub-chat-main">
        <header class="aihub-chat-header"><div><small>${active && active.document_id ? t('aiHubDocumentChat') : t('ai')}</small><h2>${esc(active && active.title || t('aiHubUntitled'))}</h2></div>
          <button type="button" class="aihub-new-chat mobile-only" data-ai-act="new">${icon('plus')} ${t('aiHubNewChat')}</button>
        </header>
        <div class="aihub-messages" id="aihub-messages">${messageList()}</div>
        <form data-ai-form="send" class="aihub-composer aihub-chat-composer">
          <textarea name="message" rows="2" maxlength="3000" placeholder="${t('aiHubPlaceholder')}" aria-label="${t('aiHubPlaceholder')}" ${state.busy?'disabled':''}></textarea>
          <div class="aihub-composer-footer"><small>${t('aiHubDisclaimer')}</small><button class="aihub-send" type="submit" aria-label="${t('aiHubSend')}" ${state.busy?'disabled':''}>${icon('arrow-up')}</button></div>
        </form>
      </div>
    </section>`;
  }
  function render() {
    return `<div class="aihub-page"><header class="aihub-page-head"><div class="aihub-brand">${icon('brain')}<span>${t('ai')}</span></div>${state.activeId?`<button type="button" class="aihub-back-home" data-ai-act="home">${icon('layout-dashboard')} ${t('aiHubTools')}</button>`:''}</header>
      ${state.activeId ? renderChat() : renderHome()}</div>`;
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
    const pdf = await pdfjs.getDocument({data:bytes}).promise;
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
    const content = String(message || '').trim();
    if (!content || state.busy) return;
    state.busy = true;
    try {
      if (!state.activeId) await createConversation();
      state.messages.push({role:'user',content:content,created_at:new Date().toISOString()});
      draw();
      const r = await U.api.call('aiStudyHubSendMessage', {conversation_id:state.activeId,message:content});
      state.messages.push({role:'assistant',content:r.reply,created_at:new Date().toISOString()});
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
    try {
      await U.api.call('aiStudyHubDeleteConversation', {conversation_id:id});
      state.conversations = state.conversations.filter(c=>c.id!==id);
      if (state.activeId===id) { state.activeId=''; state.messages=[]; }
      if (U.ui && U.ui.toast) U.ui.toast(t('aiHubDeleteDone'));
      draw();
    } catch (e) { notifyError(e); }
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
    const button = e.target.closest('[data-ai-act]');
    if (!button) return;
    const action = button.dataset.aiAct;
    if (action==='new') newChat();
    else if (action==='home') home();
    else if (action==='open') openConversation(button.dataset.id);
    else if (action==='delete') deleteConversation(button.dataset.id);
    else if (action==='tool') chooseTool(button.dataset.tool);
    else if (action==='upload') $('#aihub-pdf-input')?.click();
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
    if (e.target && e.target.id === 'aihub-pdf-input') {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      return uploadPdf(file);
    }
  });
  document.addEventListener('change', e => {
    const answer=e.target.closest('[data-tutor-answer]');
    if(answer){state.tutorAnswers[answer.dataset.tutorAnswer]=Number(answer.value);draw();}
  });
  document.addEventListener('submit', e => {
    const tutor=e.target.closest('form[data-ai-form="tutor"]');
    if(tutor){e.preventDefault();generateTutorQuiz(tutor);return;}
    const form = e.target.closest('form[data-ai-form="send"]');
    if (!form) return;
    e.preventDefault();
    const field = $('textarea[name="message"]',form);
    const value = field ? field.value : '';
    if (field) field.value = '';
    sendMessage(value);
  });
  U.aiHub = { render, onEnter, refresh:async()=>{state.loaded=false;state.docsLoaded=false;await onEnter();} };
})();
