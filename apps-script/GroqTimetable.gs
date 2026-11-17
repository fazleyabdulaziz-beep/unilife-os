// Smart Timetable Import — Groq Vision (Qwen). Store GROQ_API_KEY in Script Properties.
var GROQ_TIMETABLE = {
  ENDPOINT: 'https://api.groq.com/openai/v1/chat/completions',
  DEFAULT_MODEL: 'qwen/qwen3.8-27b',
  MAX_IMAGES: 3,
  MAX_IMAGE_CHARS: 2800000,
  MAX_TEXT: 12000,
  MAX_CLASSES: 100,
  USER_WINDOW_LIMIT: 10
};

function analyzeTimetableWithGroq_(uid, data) {
  var apiKey = prop('GROQ_API_KEY');
  if (!apiKey) throw fail('aiConfig');
  data = data || {};
  var images = Array.isArray(data.images) ? data.images : [];
  var text = typeof data.text === 'string' ? data.text.slice(0, GROQ_TIMETABLE.MAX_TEXT) : '';
  if (!images.length && !text.trim()) throw fail('invalid');
  if (images.length > GROQ_TIMETABLE.MAX_IMAGES) throw fail('invalid');

  // Per-user throttling protects the shared free-tier organization quota.
  var cache = CacheService.getScriptCache();
  var busyKey = 'groq_busy_' + uid;
  if (cache.get(busyKey)) throw fail('aiBusy');
  cache.put(busyKey, '1', 15);
  var windowKey = 'groq_window_' + Math.floor(Date.now() / 21600000) + '_' + uid;
  var used = Number(cache.get(windowKey) || 0);
  if (used >= GROQ_TIMETABLE.USER_WINDOW_LIMIT) throw fail('aiLimit');
  cache.put(windowKey, String(used + 1), 21600);

  var prompt = [
    'You are a precise university timetable extraction engine. Read the supplied timetable image(s) and/or lecturer text.',
    'Return ONLY valid JSON with this exact top-level shape: {"classes":[],"warnings":[]}.',
    'Each class object must contain: course, date, start, end, room, lecturer, confidence, notes.',
    'course: class or subject name, maximum 80 characters; preserve the subject name and course code when both are visible.',
    'date: mandatory actual calendar date in YYYY-MM-DD. Do not return weekday names instead of dates.',
    'start and end: 24-hour HH:mm. If unclear, return empty string; never guess.',
    'Create one one-time class session row for every actual dated class in the source. Expand weekly or weekday-based classes into individual dates only when the source provides a clear date range or explicit session dates.',
    'Do not return day or schedule_type fields. UniLife OS calculates the weekday from the actual date.',
    'room and lecturer may be empty strings if unavailable. A missing room or venue must never prevent extraction. confidence must be a number from 0 to 1. notes should explain uncertainty briefly.',
    'If a date, subject or time is ambiguous, do not fabricate it. Put a concise explanation in warnings and leave the uncertain field empty; such a row will require user correction before import.',
    'Do not include Markdown fences or any text outside the JSON object.',
    text ? 'Additional lecturer text:\n' + text : ''
  ].join('\n');

  var content = [{ type: 'text', text: prompt }];
  images.forEach(function(image) {
    if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > GROQ_TIMETABLE.MAX_IMAGE_CHARS) {
      throw fail('invalid');
    }
    content.push({ type: 'image_url', image_url: { url: image } });
  });

  var model = prop('GROQ_TIMETABLE_MODEL') || GROQ_TIMETABLE.DEFAULT_MODEL;
  var payload = {
    model: model,
    messages: [{ role: 'user', content: content }],
    temperature: 0.1,
    max_completion_tokens: 5000,
    response_format: { type: 'json_object' }
  };
  var response;
  try {
    response = UrlFetchApp.fetch(GROQ_TIMETABLE.ENDPOINT, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    console.error('Groq timetable network error: ' + (err && err.message ? err.message : err));
    throw fail('aiFailed');
  }
  var status = response.getResponseCode();
  var raw = response.getContentText();
  if (status === 401 || status === 403) throw fail('aiConfig');
  if (status === 429) throw fail('aiLimit');
  if (status < 200 || status >= 300) {
    console.error('Groq timetable API returned HTTP ' + status + ': ' + raw.slice(0, 500));
    throw fail('aiFailed');
  }

  var envelope, parsed;
  try {
    envelope = JSON.parse(raw);
    var answer = envelope.choices && envelope.choices[0] && envelope.choices[0].message && envelope.choices[0].message.content;
    if (typeof answer !== 'string') throw new Error('Missing model content');
    answer = answer.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    parsed = JSON.parse(answer);
  } catch (err) {
    console.error('Groq timetable response parse failed: ' + (err && err.message ? err.message : err));
    throw fail('aiFailed');
  }

  var classes = Array.isArray(parsed.classes) ? parsed.classes.slice(0, GROQ_TIMETABLE.MAX_CLASSES) : [];
  classes = classes.map(function(item) {
    item = item && typeof item === 'object' ? item : {};
    return {
      course: groqText_(item.course, 80),
      day: '',
      start: groqNormalizeTime_(item.start),
      end: groqNormalizeTime_(item.end),
      room: groqText_(item.room, 60),
      lecturer: groqText_(item.lecturer, 80),
      schedule_type: 'one_time',
      date: groqNormalizeDate_(item.date),
      confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
      notes: groqText_(item.notes, 240)
    };
  });
  var warnings = Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 20).map(function(x) { return groqText_(x, 240); }).filter(Boolean) : [];
  if (!classes.length) warnings.push('No class sessions were confidently identified. Try a clearer image or add more details.');
  return { classes: classes, warnings: warnings, model: model };
}

function groqText_(value, max) {
  return String(value == null ? '' : value).replace(/[<>]/g, '').trim().slice(0, max);
}
function groqNormalizeDay_(value) {
  var v = String(value || '').trim().toLowerCase().slice(0, 3);
  var map = { mon: 'mon', tue: 'tue', wed: 'wed', thu: 'thu', fri: 'fri', sat: 'sat', sun: 'sun' };
  return map[v] || '';
}
function groqNormalizeDate_(value) {
  var v = String(value || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  var d = new Date(v + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === v ? v : '';
}
function groqNormalizeTime_(value) {
  var v = String(value || '').trim().toLowerCase().replace(/\./g, '');
  var m = v.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (m) {
    var h = Number(m[1]) % 12;
    if (m[3] === 'pm') h += 12;
    v = String(h).padStart(2, '0') + ':' + String(m[2] || '00').padStart(2, '0');
  }
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : '';
}
