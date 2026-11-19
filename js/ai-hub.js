/* UniLife OS — AI Study Hub (Phase 1 + 2)
 * Dedicated persistent conversations. AI requests stay on the Apps Script backend.
 */
(function () {
  'use strict';
  const U = window.UL;
  if (!U) return;
  const state = { conversations: [], activeId: '', messages: [], busy: false, loaded: false, loading: false };
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
        <header class="aihub-chat-header"><div><small>${t('ai')}</small><h2>${esc(active && active.title || t('aiHubUntitled'))}</h2></div>
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
  function notifyError(e) {
    const code = e && e.code;
    const message = code === 'aiLimit' ? t('aiHubLimit') : code === 'aiConfig' ? t('aiHubNoApi') : t('aiHubError');
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
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-ai-act]');
    if (!button) return;
    const action = button.dataset.aiAct;
    if (action==='new') newChat();
    else if (action==='home') home();
    else if (action==='open') openConversation(button.dataset.id);
    else if (action==='delete') deleteConversation(button.dataset.id);
    else if (action==='tool') chooseTool(button.dataset.tool);
  });
  document.addEventListener('submit', e => {
    const form = e.target.closest('form[data-ai-form="send"]');
    if (!form) return;
    e.preventDefault();
    const field = $('textarea[name="message"]',form);
    const value = field ? field.value : '';
    if (field) field.value = '';
    sendMessage(value);
  });
  U.aiHub = { render, onEnter, refresh:async()=>{state.loaded=false;await onEnter();} };
})();
