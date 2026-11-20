/* AI Study Hub provider adapter.
 * Current adapter reuses the existing Groq Script Property/model.
 * Future provider choices can be implemented here without changing chat storage or UI.
 */
function aiStudyHubGenerate_(messages) {
  var apiKey = prop('GROQ_API_KEY');
  if (!apiKey) throw fail('aiConfig');
  var model = prop('GROQ_TIMETABLE_MODEL') || GROQ_TIMETABLE.DEFAULT_MODEL;
  var response;
  try {
    response = UrlFetchApp.fetch(GROQ_TIMETABLE.ENDPOINT, {
      method:'post',contentType:'application/json',
      headers:{Authorization:'Bearer ' + apiKey},
      payload:JSON.stringify({model:model,messages:messages,temperature:0.55,max_completion_tokens:1800}),
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
