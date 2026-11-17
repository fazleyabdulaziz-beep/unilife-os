// ============================================================
// Push notifications and reminder engine
// ============================================================

// Push notifications via Firebase Cloud Messaging (HTTP v1).
// One-time setup (see PUSH_SETUP.md):
//   1. Script Properties > FCM_SERVICE_ACCOUNT = the full service-account JSON from Firebase (Project settings > Service accounts).
//   2. Run installTriggers() once from the editor.
// The service-account key lives ONLY in Script Properties. Never put it in the repo.


var PUSH = {
  MAX_TOKENS: 5,
  TEST_COOLDOWN_SEC: 30,
  WINDOW_MIN: 30,
  CLASS_REMINDERS: [60, 30, 15],
  MAX_ATTEMPTS: 5,
  DIGEST_HOUR: 8,
  KEEP_DAYS: 30
};

var PUSH_TXT={
  en:{assign:'Assignment due',assignBody:function(t,c,d){return t+(c?' ('+c+')':'')+(d===0?' is due today':' is due tomorrow')},
      cls:'Class starting soon',clsBody:function(c,s,r){return c+' at '+s+(r?' · '+r:'')},
      exam:'Exam coming up',examBody:function(c,d,tm,v){return c+(d===0?' today':d===1?' tomorrow':' in '+d+' days')+' at '+tm+(v?' · '+v:'')},
      fin:'Budget alert',finBody:function(s,b){return 'You have spent RM'+s.toFixed(2)+' this month, over your RM'+b.toFixed(2)+' budget'},
      test:'UniLife OS',testBody:'Push notifications are working'},
  ms:{assign:'Tugasan akan tamat',assignBody:function(t,c,d){return t+(c?' ('+c+')':'')+(d===0?' perlu dihantar hari ini':' perlu dihantar esok')},
      cls:'Kelas bakal bermula',clsBody:function(c,s,r){return c+' pada '+s+(r?' · '+r:'')},
      exam:'Peperiksaan hampir tiba',examBody:function(c,d,tm,v){return c+(d===0?' hari ini':d===1?' esok':' dalam '+d+' hari')+' pada '+tm+(v?' · '+v:'')},
      fin:'Amaran bajet',finBody:function(s,b){return 'Anda telah berbelanja RM'+s.toFixed(2)+' bulan ini, melebihi bajet RM'+b.toFixed(2)},
      test:'UniLife OS',testBody:'Pemberitahuan push berfungsi'}
};

// ---------- API actions ----------
function pushSubscribe(uid,d){
  var tok=d&&d.token,pl=d&&d.platform;
  if(typeof tok!=='string'||tok.length<20||tok.length>4096||/\s/.test(tok))throw fail('invalid');
  if(['ios','android','desktop'].indexOf(pl)<0)throw fail('invalid');
  var t=table('PushSubscriptions'),h=SCHEMA.PushSubscriptions;
  var same=t.rows.filter(function(r){return r.token===tok})[0];
  if(same){ // token already known: (re)assign to this user
    var row={id:same.id,user_id:uid,token:tok,platform:pl,created_at:same.created_at||new Date().toISOString()};
    t.s.getRange(same._r,1,1,h.length).setValues([h.map(function(k){return row[k]})]);
    return;
  }
  var mine=t.rows.filter(function(r){return r.user_id===uid});
  if(mine.length>=PUSH.MAX_TOKENS)t.s.deleteRow(mine[0]._r); // drop the oldest device
  append('PushSubscriptions',{id:newId(),user_id:uid,token:tok,platform:pl,created_at:new Date().toISOString()});
}
function pushUnsubscribe(uid,d){
  var tok=d&&d.token;if(typeof tok!=='string')throw fail('invalid');
  var t=table('PushSubscriptions');
  t.rows.filter(function(r){return r.user_id===uid&&r.token===tok}).map(function(r){return r._r}).sort(function(a,b){return b-a}).forEach(function(r){t.s.deleteRow(r)});
}


function pushTest(uid) {
  var cache = CacheService.getScriptCache();
  var k = 'pushtest:' + uid;

  if (cache.get(k)) throw fail('tooSoon');
  if (!prop('FCM_SERVICE_ACCOUNT')) throw fail('nopush');

  var toks = table('PushSubscriptions').rows.filter(
    function(r) { return r.user_id === uid; }
  );

  if (!toks.length) throw fail('nodevice');

  var L = PUSH_TXT[getPrefs(uid).prefs.lang] || PUSH_TXT.en;
  var ok = 0;
  var failed = 0;

  toks.forEach(function(r) {
    try {
      console.log('Testing device:', r.id);

      var sent = fcmSend(r.token, {
        title: L.test,
        body: L.testBody,
        tag: 'test',
        url: '#/settings'
      });

      if (sent === true) {
        ok++;
      } else {
        failed++;
      }

      console.log('FCM send result:', sent);

    } catch(e) {
      failed++;
      console.error('FCM exception:', e.message || String(e));
    }
  });

  console.log('Successful:', ok);
  console.log('Failed:', failed);

  if (ok === 0) {
    throw fail('server');
  }

  cache.put(k, '1', PUSH.TEST_COOLDOWN_SEC);

  return {
    sent: ok,
    failed: failed
  };
}


// ---------- FCM transport ----------
function b64url(s){return Utilities.base64EncodeWebSafe(s).replace(/=+$/,'')}
function fcmAccount(){var raw=prop('FCM_SERVICE_ACCOUNT');if(!raw)throw fail('nopush');try{return JSON.parse(raw)}catch(e){throw fail('nopush')}}
function fcmAccessToken(){
  var cache=CacheService.getScriptCache(),c=cache.get('fcm_at');if(c)return c;
  var sa=fcmAccount(),now=Math.floor(Date.now()/1000);
  var head=b64url(JSON.stringify({alg:'RS256',typ:'JWT'})),
      claim=b64url(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})),
      sig=b64url(Utilities.computeRsaSha256Signature(head+'.'+claim,sa.private_key));
  var r=UrlFetchApp.fetch('https://oauth2.googleapis.com/token',{method:'post',muteHttpExceptions:true,payload:{grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:head+'.'+claim+'.'+sig}});
  var j=JSON.parse(r.getContentText());
  if(!j.access_token){console.error('FCM auth failed: '+r.getContentText());throw fail('server')}
  cache.put('fcm_at',j.access_token,3300);return j.access_token;
}
// Data-only message: the service worker always shows the notification (required on iOS).


function fcmSend(token, m) {
  if (typeof token !== 'string' || !token.trim()) {
    console.error('FCM ERROR: Token is empty');
    return false;
  }

  var sa = fcmAccount();

  var message = {
    message: {
      token: token.trim(),
      data: {
        title: String(m.title || 'UniLife OS'),
        body: String(m.body || 'Test notification'),
        tag: String(m.tag || 'test'),
        url: String(m.url || '#/dashboard')
      },
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '3600'
        }
      }
    }
  };

  console.log('FCM PROJECT:', sa.project_id);
  console.log('TOKEN PRESENT:', !!message.message.token);
  console.log('TOKEN LENGTH:', message.message.token.length);
  console.log('MESSAGE RECIPIENT PRESENT:', !!message.message.token);

  var r = UrlFetchApp.fetch(
    'https://fcm.googleapis.com/v1/projects/' +
    sa.project_id + '/messages:send',
    {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      headers: {
        Authorization: 'Bearer ' + fcmAccessToken()
      },
      payload: JSON.stringify(message)
    }
  );

  var code = r.getResponseCode();
  var body = r.getContentText();

  console.log('FCM HTTP STATUS:', code);
  console.log('FCM RESPONSE:', body);

  if (code === 200) return true;

  try {
    var error = JSON.parse(body);
    var details = error.error && error.error.details || [];

    var unregistered = details.some(function(d) {
      return d.errorCode === 'UNREGISTERED';
    });

    if (unregistered) {
      removeToken(token);
    }
  } catch (e) {
    console.error('FCM RESPONSE PARSE ERROR:', e.message);
  }

  return false;
}



// ---------- scheduled reminders (time-driven trigger, every 15 min) ----------

// =====================================================
// UNILIFE OS - SCHEDULED REMINDER ENGINE
// Timetable: 60 / 30 / 15 minutes before class
// Scheduler: Every 5 minutes
// Retry: Up to 5 attempts
// =====================================================

function processReminders() {
  locked(runReminders);
}

function runReminders() {

  if (!prop('FCM_SERVICE_ACCOUNT')) {
    console.log('FCM service account not configured.');
    return;
  }

  var tz = Session.getScriptTimeZone();
  var now = new Date();

  var today = Utilities.formatDate(now, tz, 'yyyy-MM-dd');

  var hour = Number(
    Utilities.formatDate(now, tz, 'H')
  );

  var mins =
    hour * 60 +
    Number(Utilities.formatDate(now, tz, 'm'));

  var dow = DAYS[
    Number(Utilities.formatDate(now, tz, 'u')) - 1
  ];

  var month = today.slice(0, 7);

  function addDays(n) {
    return Utilities.formatDate(
      new Date(now.getTime() + n * 864e5),
      tz,
      'yyyy-MM-dd'
    );
  }

  function diff(d) {
    return Math.round(
      (
        new Date(d + 'T00:00:00Z') -
        new Date(today + 'T00:00:00Z')
      ) / 864e5
    );
  }

  // -------------------------------------------------
  // LOAD DATABASE
  // -------------------------------------------------

  var subs = table('PushSubscriptions').rows;

  if (!subs.length) {
    console.log('No registered push devices.');
    return;
  }

  var users = {};

  subs.forEach(function(s) {
    if (!s.token || !s.user_id) return;

    if (!users[s.user_id]) {
      users[s.user_id] = [];
    }

    users[s.user_id].push(s.token);
  });

  var prefRows = table('UserPreferences').rows;
  var A = table('Assignments').rows;
  var X = table('Examinations').rows;
  var C = table('Timetable').rows;
  var F = table('Finance').rows;

  var nt = table('Notifications');

  // -------------------------------------------------
  // INDEX EXISTING NOTIFICATION RECORDS
  // -------------------------------------------------

  var existing = {};

  nt.rows.forEach(function(r) {

    var k = r.user_id + '|' + r.ref_id;
    var previous = existing[k];

    // Always preserve a successful record.
    if (!previous ||
        (previous.status !== 'sent' &&
          (r.status === 'sent' ||
           Number(r._r) > Number(previous._r)))) {
      existing[k] = r;
    }

  });

  var queue = [];
  var queued = {};

  // -------------------------------------------------
  // ADD NOTIFICATION TO QUEUE
  // -------------------------------------------------

  function add(uid, type, key, title, body, url) {

    var ref = type + ':' + key;
    var uniqueKey = uid + '|' + ref;

    // Prevent duplicate queue entries in one execution.
    if (queued[uniqueKey]) return;

    var old = existing[uniqueKey];

    // Already delivered successfully.
    if (old && old.status === 'sent') return;

    var attempts = old ? Number(old.attempts) || 0 : 0;

    // Stop retrying after maximum attempts.
    if (attempts >= PUSH.MAX_ATTEMPTS) return;

    queued[uniqueKey] = true;

    queue.push({
      uid: uid,
      type: type,
      ref_id: ref,
      title: title,
      body: body,
      url: url,
      tokens: users[uid],
      old: old,
      attempts: attempts
    });

  }

  // -------------------------------------------------
  // USER REMINDERS
  // -------------------------------------------------

  Object.keys(users).forEach(function(uid) {

    var pr = prefRows.filter(function(r) {
      return r.user_id === uid;
    })[0];

    var pf = getPrefs(uid);
    var n = pf.prefs.notif;

    if (!pr || !n.push) return;

    var L = PUSH_TXT[pf.prefs.lang] || PUSH_TXT.en;

    // -----------------------------------------------
    // ASSIGNMENT / EXAM / FINANCE DIGEST
    // -----------------------------------------------

    if (hour >= PUSH.DIGEST_HOUR) {

      if (n.assignments) {

        A.filter(function(r) {
          return r.user_id === uid &&
            r.status !== 'done' &&
            /^\d{4}-\d{2}-\d{2}$/.test(r.due);

        }).forEach(function(r) {

          var d = diff(r.due);

          if (d === 0 || d === 1) {

            add(
              uid,
              'assign',
              r.id + ':' + r.due + ':' + today,
              L.assign,
              L.assignBody(r.title, r.course, d),
              '#/assignments'
            );

          }

        });

      }

      if (n.exams) {

        X.filter(function(r) {
          return r.user_id === uid &&
            /^\d{4}-\d{2}-\d{2}$/.test(r.date);

        }).forEach(function(r) {

          var d = diff(r.date);

          if (d >= 0 && d <= 2) {

            add(
              uid,
              'exam',
              r.id + ':' + r.date + ':' + d,
              L.exam,
              L.examBody(r.course, d, r.time, r.venue),
              '#/exams'
            );

          }

        });

      }

      if (n.finance) {

        var spent = 0;

        F.forEach(function(r) {

          if (
            r.user_id === uid &&
            r.kind === 'tx' &&
            r.type === 'expense' &&
            String(r.date).slice(0, 7) === month
          ) {
            spent += Number(r.amount) || 0;
          }

        });

        var bud = Number(pf.extra.budget) || 0;

        if (bud > 0 && spent > bud) {

          add(
            uid,
            'fin',
            month,
            L.fin,
            L.finBody(spent, bud),
            '#/finance'
          );

        }

      }

    }

    // -----------------------------------------------
    // TIMETABLE REMINDERS
    // -----------------------------------------------

    if (n.classes) {

      C.filter(function(r) {

        var type=r.schedule_type||'recurring'; // blank means a legacy recurring class
        var matches=type==='one_time' ? r.date===today : r.day===dow;
        return r.user_id === uid &&
          matches &&
          /^\d{2}:\d{2}$/.test(r.start);

      }).forEach(function(r) {

        var startMinutes =
          Number(r.start.slice(0, 2)) * 60 +
          Number(r.start.slice(3));

        var left = startMinutes - mins;

        // Ignore classes that have already started.
        if (left <= 0) return;

        PUSH.CLASS_REMINDERS.forEach(function(offset) {

          var lowerBoundary;

          if (offset === 60) {
            lowerBoundary = 30;
          } else if (offset === 30) {
            lowerBoundary = 15;
          } else if (offset === 15) {
            lowerBoundary = 0;
          } else {
            lowerBoundary = Math.max(
              0,
              offset - 5
            );
          }

          // Each reminder has its own time window.
          if (
            left <= offset &&
            left > lowerBoundary
          ) {

            var title = L.cls;

            var body = L.clsBody(
              r.course,
              r.start,
              r.room
            );

            // Unique ID for every class, date and interval.
            var reminderKey =
              r.id + ':' + today + ':' + offset;

            add(
              uid,
              'cls',
              reminderKey,
              title,
              body + ' · ' + offset + ' min before',
              '#/timetable'
            );

          }

        });

      });

    }

  });

  // -------------------------------------------------
  // SEND QUEUED NOTIFICATIONS
  // -------------------------------------------------

  queue.forEach(function(q) {

    var success = 0;
    var failed = 0;

    q.tokens.forEach(function(tk) {

      try {

        var sent = fcmSend(tk, {
          title: q.title,
          body: q.body,
          tag: q.ref_id,
          url: q.url
        });

        if (sent === true) {
          success++;
        } else {
          failed++;
        }

      } catch(e) {

        failed++;

        console.error(
          'FCM send exception: ' +
          (e.message || String(e))
        );

      }

    });

    var attempts = q.attempts + 1;

    // At least one device accepted the message.
    // If every device fails, the reminder can retry.
    var status = success > 0 ? 'sent' : 'failed';

    var record = {
      id: q.old ? q.old.id : newId(),
      user_id: q.uid,
      type: q.type,
      ref_id: q.ref_id,
      fire_at: today,
      sent_at: new Date().toISOString(),
      status: status,
      attempts: attempts
    };

    // Update existing failed record instead of
    // creating another duplicate row.
    if (q.old && q.old._r) {

      var headers = SCHEMA.Notifications;

      nt.s.getRange(
        q.old._r,
        1,
        1,
        headers.length
      ).setValues([
        headers.map(function(k) {
          return record[k] === undefined
            ? ''
            : record[k];
        })
      ]);

    } else {

      append('Notifications', record);

    }

    console.log(
      'Reminder:',
      q.ref_id,
      '| Status:',
      status,
      '| Successful:',
      success,
      '| Failed:',
      failed,
      '| Attempt:',
      attempts
    );

  });

  // -------------------------------------------------
  // CLEAN OLD NOTIFICATION RECORDS
  // -------------------------------------------------

  purgeNotifications(
    nt,
    addDays(-PUSH.KEEP_DAYS)
  );

}


// -----------------------------------------------------
// PURGE OLD NOTIFICATIONS
// -----------------------------------------------------

function purgeNotifications(nt, cutoff) {

  var old = nt.rows.filter(function(r) {

    return r.fire_at &&
      String(r.fire_at) < cutoff;

  }).map(function(r) {
    return r._r;
  }).sort(function(a, b) {
    return b - a;
  });

  old.forEach(function(r) {
    nt.s.deleteRow(r);
  });

}


// -----------------------------------------------------
// INSTALL / REINSTALL TIME-DRIVEN TRIGGERS
// RUN ONCE AFTER DEPLOYMENT
// -----------------------------------------------------

function installTriggers() {

  ScriptApp.getProjectTriggers().forEach(function(t) {

    var f = t.getHandlerFunction();

    if (
      f === 'processReminders' ||
      f === 'purgeExpired'
    ) {
      ScriptApp.deleteTrigger(t);
    }

  });

  // Timetable and other reminders: every 5 minutes.
  ScriptApp.newTrigger('processReminders')
    .timeBased()
    .everyMinutes(1)
    .create();

  // Daily cleanup.
  ScriptApp.newTrigger('purgeExpired')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();

  Logger.log(
    'UniLife OS reminder triggers installed.'
  );

}


 
function testPushManual() {
  var uid = 'ub18ec18b2239';

  try {
    console.log('Testing UID: ' + uid);

    var rows = table('PushSubscriptions').rows.filter(
      function(r) { return r.user_id === uid; }
    );

    console.log('Registered devices: ' + rows.length);

    var result = pushTest(uid);

    console.log('SUCCESS: ' + JSON.stringify(result));

  } catch(e) {
    console.error('ERROR OBJECT: ' + JSON.stringify(e));
    console.error('ERROR STRING: ' + String(e));

    if (e && e.message) {
      console.error('ERROR MESSAGE: ' + e.message);
    }

    if (e && e.stack) {
      console.error('STACK: ' + e.stack);
    }
  }
}


function debugTimetableReminder() {
  var tz = Session.getScriptTimeZone();
  var now = new Date();

  var today = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var dayIndex = Number(
    Utilities.formatDate(now, tz, 'u')
  ) - 1;

  var dow = DAYS[dayIndex];

  var mins =
    Number(Utilities.formatDate(now, tz, 'H')) * 60 +
    Number(Utilities.formatDate(now, tz, 'm'));

  console.log('========== REMINDER DEBUG ==========');
  console.log('Current time:', now.toString());
  console.log('Script timezone:', tz);
  console.log('Today:', today);
  console.log('DAYS value:', dow);
  console.log('Current minute:', mins);
  console.log('Reminder intervals:', JSON.stringify(PUSH.CLASS_REMINDERS));

  var triggers = ScriptApp.getProjectTriggers();

  var reminderTriggers = triggers.filter(function(t) {
    return t.getHandlerFunction() === 'processReminders';
  });

  console.log('Reminder triggers:', reminderTriggers.length);

  var subs = table('PushSubscriptions').rows;
  var classes = table('Timetable').rows;

  console.log('Registered devices:', subs.length);
  console.log('Timetable rows:', classes.length);

  var users = {};

  subs.forEach(function(s) {
    if (s.user_id) users[s.user_id] = true;
  });

  Object.keys(users).forEach(function(uid) {
    var pf = getPrefs(uid);
    var n = pf.prefs.notif || {};

    console.log('USER:', uid);
    console.log('Push enabled:', n.push);
    console.log('Class reminders enabled:', n.classes);

    var rows = classes.filter(function(r) {
      return r.user_id === uid;
    });

    console.log('User timetable rows:', rows.length);

    rows.forEach(function(r) {
      var type=r.schedule_type||'recurring';
      var dateMatches=type==='one_time' ? r.date===today : r.day===dow;
      var valid = /^\d{2}:\d{2}$/.test(r.start);
      var start = valid
        ? Number(r.start.slice(0, 2)) * 60 +
          Number(r.start.slice(3))
        : null;

      var left = valid ? start - mins : null;

      var due = [];

      (PUSH.CLASS_REMINDERS || []).forEach(function(offset) {
        var lower = offset === 60 ? 30 :
                    offset === 30 ? 15 :
                    offset === 15 ? 0 :
                    Math.max(0, offset - 5);

        if (left !== null && left <= offset && left > lower) {
          due.push(offset);
        }
      });

      console.log('CLASS:', JSON.stringify({
        id: r.id,
        course: r.course,
        dayInSheet: r.day,
        expectedDay: dow,
        scheduleType: type,
        classDate: r.date || '',
        dayMatches: dateMatches,
        start: r.start,
        minutesLeft: left,
        dueIntervals: due
      }));
    });
  });

  console.log('========== END DEBUG ==========');
}

// Remove a stale FCM registration token from the subscription sheet.
function removeToken(token){
  if(typeof token!=='string'||!token)return;
  var t=table('PushSubscriptions');
  t.rows.filter(function(r){return r.token===token;})
    .map(function(r){return r._r;}).sort(function(a,b){return b-a;})
    .forEach(function(row){t.s.deleteRow(row);});
}

// ============================================================
// Web app entry points
// ============================================================
function json(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function fail(c){return {code:c};}
function doGet(){return json({ok:true,data:{service:'UniLife OS API',version:CFG.VERSION}});}
function doPost(e){
  var out;
  try{
    if(!e||!e.postData||typeof e.postData.contents!=='string')throw fail('invalid');
    var req=JSON.parse(e.postData.contents);
    if(!req||typeof req!=='object'||typeof req.action!=='string')throw fail('invalid');
    out={ok:true,data:handle(req)};
  }catch(x){
    out={ok:false,error:x&&x.code?x.code:'server'};
    if(!(x&&x.code))console.error(x&&x.stack||x);
  }
  return json(out);
}

function debugCalendarConnection() {
  var uid = 'ub18ec18b22398'; // Gantikan dengan UID sebenar

  Logger.log('UID: ' + uid);
  Logger.log('Valid UID: ' + calendarValidUid_(uid));

  var service = getCalendarService_(uid);

  Logger.log('OAuth service created: YES');
  Logger.log('Has access: ' + service.hasAccess());
  Logger.log('Token exists: ' + !!service.getAccessToken());
}