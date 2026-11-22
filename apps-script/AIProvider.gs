/* AI Study Hub provider adapter.
 * Uses Groq GPT-OSS 20B by default for fast text generation.
 * Optional Script Property AI_CHAT_MODEL can override the default.
 * Timetable image extraction remains on its separate vision-capable model.
 */
var AI_CHAT_DEFAULT_MODEL = 'openai/gpt-oss-20b';

function aiChatModel_() {
  return prop('AI_CHAT_MODEL') || AI_CHAT_DEFAULT_MODEL;
}

function aiStudyHubGenerate_(messages, modelOverride) {
  var apiKey = prop('GROQ_API_KEY');
  if (!apiKey) throw fail('aiConfig');
  var model = modelOverride || aiChatModel_();
  var response;
  try {
    response = UrlFetchApp.fetch(GROQ_TIMETABLE.ENDPOINT, {
      method:'post',contentType:'application/json',
      headers:{Authorization:'Bearer ' + apiKey},
      payload:JSON.stringify(model.indexOf('gpt-oss') >= 0
        ? {model:model,messages:messages,reasoning_effort:'low',max_completion_tokens:1800}
        : {model:model,messages:messages,temperature:0.2,max_completion_tokens:1800}),
      muteHttpExceptions:true
    });
  } catch (err) {
    console.error('AI Study Hub provider network error: ' + (err && err.message ? err.message : err));
    throw fail('aiFailed');
  }
  var status = response.getResponseCode();
  var raw = response.getContentText();
  if (status === 401 || status === 403) throw fail('aiConfig');
  if (status === 429) throw fail('aiLimit');
  if (status < 200 || status >= 300) {
    console.error('AI Study Hub provider HTTP ' + status + ': ' + raw.slice(0,400));
    throw fail('aiFailed');
  }
  var parsed;
  try { parsed = JSON.parse(raw); } catch (err) { throw fail('aiFailed'); }
  var reply = parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content;
  if (typeof reply !== 'string' || !reply.trim()) throw fail('aiFailed');
  return {model:model,reply:reply.trim().slice(0,AI_STUDY_HUB.MAX_REPLY)};
}
