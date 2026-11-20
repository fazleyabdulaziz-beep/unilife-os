function coll(c){if(typeof c!=='string'||!Object.prototype.hasOwnProperty.call(COLL,c))throw fail('invalid');return c}

function handle(req) {
  var a = req.action;
  var d = req.data && typeof req.data === 'object'
    ? req.data
    : {};

  if (a === 'register') return register(d);
  if (a === 'login') return login(d);
  if (a === 'requestPasswordReset') return requestPasswordReset_(d);
  if (a === 'resetPassword') return resetPassword_(d);

  var uid = authUser(req.token);

  switch (a) {
    case 'logout':
      return logout(req.token);

    // Manual Calendar Sync
    case 'calendarSyncTimetable':
      return locked(function() {
        return calendarSyncTimetable_(uid);
      });

    case 'calendarSyncAssignments':
      return locked(function() {
        return calendarSyncAssignments_(uid);
      });

    case 'calendarSyncExaminations':
      return locked(function() {
        return calendarSyncExaminations_(uid);
      });

    case 'calendarSyncAll':
      return locked(function() {
        return calendarSyncAll_(uid);
      });

    case 'calendarConnectUrl':
      return calendarConnectUrl_(uid);

    case 'calendarStatus':
      return calendarConnectionStatus_(uid);

    case 'calendarDisconnect':
      return calendarDisconnect_(uid);

    case 'bootstrap':
      return bootstrap(uid);

    case 'analyzeTimetable':
      return analyzeTimetableWithGroq_(uid, d);

    case 'unibotChat':
      return uniBotChat_(uid, d);

    // Phase 6 — cross-feature academic copilot.
    case 'aiAcademicCopilot':
      return aiAcademicCopilot_(uid);

    // AI Study Hub — persistent, user-owned conversations.
    case 'aiStudyHubListConversations':
      return aiStudyHubListConversations_(uid, d);
    case 'aiStudyHubCreateConversation':
      return aiStudyHubCreateConversation_(uid, d);
    case 'aiStudyHubGetConversation':
      return aiStudyHubGetConversation_(uid, d);
    case 'aiStudyHubDeleteConversation':
      return aiStudyHubDeleteConversation_(uid, d);
    case 'aiStudyHubSendMessage':
      return aiStudyHubSendMessage_(uid, d);

    // AI Study Intelligence — revision planner, analytics and spaced repetition.
    case 'aiStudyIntelligenceDashboard':
      return aiStudyIntelligenceDashboard_(uid);
    case 'aiStudyIntelligenceGeneratePlan':
      return aiStudyIntelligenceGeneratePlan_(uid);
    case 'aiStudyIntelligenceCompleteSession':
      return aiStudyIntelligenceCompleteSession_(uid, d);
    case 'aiStudyIntelligenceAddCard':
      return aiStudyIntelligenceAddCard_(uid, d);
    case 'aiStudyIntelligenceReviewCard':
      return aiStudyIntelligenceReviewCard_(uid, d);

    // Phase 5 — AI Learning Coach and adaptive practice.
    case 'aiTutorDashboard':
      return aiTutorDashboard_(uid);
    case 'aiTutorGenerateQuiz':
      return aiTutorGenerateQuiz_(uid, d);
    case 'aiTutorSubmitQuiz':
      return aiTutorSubmitQuiz_(uid, d);

    // Phase 5 — AI Learning Coach and adaptive practice.
    case 'aiTutorDashboard':
      return aiTutorDashboard_(uid);
    case 'aiTutorGenerateQuiz':
      return aiTutorGenerateQuiz_(uid, d);
    case 'aiTutorSubmitQuiz':
      return aiTutorSubmitQuiz_(uid, d);

    // AI Study Hub — document library and document-grounded conversations.
    case 'aiStudyHubListDocuments':
      return aiStudyHubListDocuments_(uid, d);
    case 'aiStudyHubStartDocumentUpload':
      return aiStudyHubStartDocumentUpload_(uid, d);
    case 'aiStudyHubSaveDocumentChunk':
      return aiStudyHubSaveDocumentChunk_(uid, d);
    case 'aiStudyHubCompleteDocumentUpload':
      return aiStudyHubCompleteDocumentUpload_(uid, d);
    case 'aiStudyHubDeleteDocument':
      return aiStudyHubDeleteDocument_(uid, d);
    case 'aiStudyHubCreateDocumentConversation':
      return aiStudyHubCreateDocumentConversation_(uid, d);

    case 'saveProfilePhoto':
      return saveProfilePhoto_(uid, d.dataUrl);

    case 'setTimezone':
      return setUserTimezone(uid, d);

    // CREATE
    case 'create': {
      var cn = coll(d.c);

      var id = locked(function() {
        return dbCreate(cn, uid, d.item);
      });

      audit(uid, 'create', cn);

      calendarAutoSync_(uid, cn);

      return { id: id };
    }

    // UPDATE
    case 'update': {
      var cu = coll(d.c);

      locked(function() {
        dbUpdate(cu, uid, d.item);
      });

      audit(uid, 'update', cu);

      calendarAutoSync_(uid, cu);

      return {};
    }

    // DELETE
    case 'delete': {
      var cd = coll(d.c);

      locked(function() {
        dbDelete(cd, uid, d.item && d.item.id);
      });

      audit(uid, 'delete', cd);

      calendarAutoSync_(uid, cd);

      return {};
    }

    // BATCH CREATE
    case 'batchCreate': {
      var cb = coll(d.c);
      var items = d.items;

      if (
        !Array.isArray(items) ||
        !items.length ||
        items.length > CFG.MAX_ROWS
      ) {
        throw fail('invalid');
      }

      items.forEach(function(i) {
        clean(COLL[cb], i, false);
      });

      locked(function() {
        items.forEach(function(i) {
          var copy = Object.assign({}, i);
          delete copy.id;
          dbCreate(cb, uid, copy);
        });
      });

      audit(uid, 'import', cb);

      calendarAutoSync_(uid, cb);

      return { count: items.length };
    }

    case 'pushSubscribe':
      locked(function() {
        pushSubscribe(uid, d);
      });
      return {};

    case 'pushUnsubscribe':
      locked(function() {
        pushUnsubscribe(uid, d);
      });
      return {};

    case 'pushTest':
      return pushTest(uid);

    case 'savePrefs':
      locked(function() {
        savePrefs(uid, d);
      });
      return {};

    case 'updateProfile':
      return locked(function() {
        return updateProfile(uid, d);
      });

    case 'changePassword':
      return locked(function() {
        return changePassword(uid, req.token, d);
      });

    default:
      throw fail('invalid');
  }
}

function userOut(u){
  return {
    id:u.id,name:u.name,email:u.email,university:u.university,semester:u.semester,
    year:u.academic_year,totalCredits:Number(u.total_credits)||120,
    timezone:u.timezone||'',avatar_url:getProfilePhotoUrl_(u.id)
  };
}
function bootstrap(uid){
  var u=table('Users').rows.filter(function(r){return r.id===uid})[0];
  if(!u)throw fail('auth');
  var p=getPrefs(uid),data={};
  Object.keys(COLL).forEach(function(k){data[k]=dbList(k,uid);});
  data.budget=p.extra.budget;data.study=p.extra.study;
  data.welcomeTitle=p.extra.welcomeTitle||'Your campus, your pace.';
  data.welcomeSubtitle=p.extra.welcomeSubtitle||'A little progress every day adds up. Keep your goals in sight.';
  data.widgetSizes=p.extra.widgetSizes||{};
  data.reminderFrequency=p.extra.reminderFrequency||'daily';
  return{user:userOut(u),prefs:p.prefs,data:data};
}
function getPrefs(uid){
  var base={font:'Inter',theme:'light',lang:'en',density:'comfortable',order:WIDGETS.slice(),hidden:[],notif:{push:false,assignments:true,classes:true,exams:true,finance:true,classReminderMinutes:[60],assignmentDays:[7,3,1,0],examDays:[7,3,1,0],inAppPopup:true,repeatUntilDismissed:true}};
  var ex={budget:800,study:[0,0,0,0,0,0,0],welcomeTitle:'Your campus, your pace.',welcomeSubtitle:'A little progress every day adds up. Keep your goals in sight.',widgetSizes:{},reminderFrequency:'daily'};
  var r=uid?table('UserPreferences').rows.filter(function(x){return x.user_id===uid;})[0]:null;
  if(!r)return{prefs:base,extra:ex};
  return{
    prefs:{font:r.font||base.font,theme:r.theme||base.theme,lang:r.lang||base.lang,density:r.density||base.density,
      order:safeJson(r.widget_order,base.order),hidden:safeJson(r.widget_hidden,[]),
      notif:Object.assign({},base.notif,safeJson(r.notif_json,{}))},
    extra:Object.assign({},ex,safeJson(r.extra_json,{}))
  };
}
function savePrefs(uid,d){
  d=d||{};
  var cur=getPrefs(uid);
  function list(v){
    if(!Array.isArray(v)||v.length>WIDGETS.length)throw fail('invalid');
    v.forEach(function(x){if(WIDGETS.indexOf(x)<0)throw fail('invalid');});
    return v.filter(function(x,i){return v.indexOf(x)===i;});
  }
  var n=Object.assign({},cur.prefs.notif,d.notif||{}),notif={};
  ['push','assignments','classes','exams','finance','inAppPopup','repeatUntilDismissed'].forEach(function(k){
    if(typeof n[k]!=='boolean')throw fail('invalid');notif[k]=n[k];
  });
  function offsets(key,allowed){var v=n[key];if(!Array.isArray(v)||v.length>allowed.length)throw fail('invalid');var out=[];v.forEach(function(x){x=Number(x);if(allowed.indexOf(x)<0||out.indexOf(x)>=0)throw fail('invalid');out.push(x)});return out.sort(function(a,b){return b-a});}
  notif.classReminderMinutes=offsets('classReminderMinutes',[15,30,45,60,90]);
  notif.assignmentDays=offsets('assignmentDays',[7,3,1,0]);
  notif.examDays=offsets('examDays',[7,3,1,0]);
  var ex=cur.extra;
  if(d.extra){
    if(!Array.isArray(d.extra.study)||d.extra.study.length!==7)throw fail('invalid');
    ex={
      budget:N(0,1e7)(d.extra.budget),
      study:d.extra.study.map(N(0,24)),
      welcomeTitle:S(80,0)(d.extra.welcomeTitle==null?(cur.extra.welcomeTitle||'Your campus, your pace.'):d.extra.welcomeTitle),
      welcomeSubtitle:S(160,0)(d.extra.welcomeSubtitle==null?(cur.extra.welcomeSubtitle||'A little progress every day adds up. Keep your goals in sight.'):d.extra.welcomeSubtitle),
      widgetSizes:(function(){var src=d.extra.widgetSizes||cur.extra.widgetSizes||{},out={};if(!src||typeof src!=='object'||Array.isArray(src))throw fail('invalid');Object.keys(src).forEach(function(k){if(WIDGETS.indexOf(k)<0||['small','medium','large'].indexOf(src[k])<0)throw fail('invalid');out[k]=src[k];});return out;})(),
      reminderFrequency:E(['hourly','daily','weekly'])(d.extra.reminderFrequency==null?(cur.extra.reminderFrequency||'daily'):d.extra.reminderFrequency)
    };
  }
  var o={user_id:uid,font:E(FONTS)(d.font),theme:E(['light','dark','system'])(d.theme),lang:E(['en','ms'])(d.lang),
    density:E(['comfortable','compact'])(d.density),widget_order:JSON.stringify(list(d.order)),
    widget_hidden:JSON.stringify(list(d.hidden)),notif_json:JSON.stringify(notif),extra_json:JSON.stringify(ex)};
  var t=table('UserPreferences'),r=t.rows.filter(function(x){return x.user_id===uid;})[0],h=SCHEMA.UserPreferences;
  if(r)t.s.getRange(r._r,1,1,h.length).setValues([h.map(function(k){return o[k];})]);else append('UserPreferences',o);
}
function updateProfile(uid,d){
  var v={name:S(80,1)(d.name),university:S(120,0)(d.university),semester:S(40,0)(d.semester),academic_year:S(20,0)(d.year)};
  var t=table('Users'),u=t.rows.filter(function(r){return r.id===uid;})[0],h=SCHEMA.Users;
  if(!u)throw fail('auth');
  t.s.getRange(u._r,1,1,h.length).setValues([h.map(function(k){return v[k]!==undefined?v[k]:u[k];})]);
  u=Object.assign({},u,v);audit(uid,'profile','user');return userOut(u);
}

function testProfilePhotoSetup() {
  Logger.log('STEP 1: Checking Spreadsheet');

  var ss = SS();
  Logger.log('Spreadsheet OK: ' + ss.getId());

  Logger.log('STEP 2: Checking Google Drive');

  var folder = getOrCreateProfilePhotoFolder_();
  Logger.log('Drive folder OK: ' + folder.getId());

  Logger.log('STEP 3: Checking ProfilePhotos sheet');

  var sheet = getOrCreateProfilePhotoSheet_();
  Logger.log('Sheet OK: ' + sheet.getName());

  Logger.log('ALL PROFILE PHOTO SERVICES OK');

  return {
    success: true,
    folder: folder.getId(),
    sheet: sheet.getName()
  };
}

function testProfilePhotoUpload() {
  var userId = 'TEST_PROFILE_PHOTO';

  // Small valid JPEG image
  var dataUrl =
    'data:image/jpeg;base64,' +
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////' +
    '/////////////////////////////////////////////2wBDAf//////' +
    '/////////////////////////////////////////////wAARCAABAAED' +
    'ASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAA' +
    'AAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/AP/EABQQAQAAAAAAAAAAAAAA' +
    'AAAAAAD/2gAIAQMBAT8BP//EABQQAQAAAAAAAAAAAAAAAAAAADD/2gAIAQ' +
    'IBAT8BP//EABQQAQAAAAAAAAAAAAAAAAAAADD/2gAIAQEABj8CP//EABQQ' +
    'AQAAAAAAAAAAAAAAAAAAADD/2gAIAQEAAT8hP//Z';

  var result = saveProfilePhoto_(userId, dataUrl);

  Logger.log(JSON.stringify(result));

  return result;
}
