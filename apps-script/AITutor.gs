/* =========================================================
   PHASE 5 — AI LEARNING COACH
   AI-generated practice, validated answer keys and evidence-based
   topic performance. Every row is scoped to the authenticated user.
========================================================= */
function aiTutorParseJson_(raw) {
  var text = String(raw || '').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  var start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw fail('aiQuizFormat');
  try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { throw fail('aiQuizFormat'); }
}
function aiTutorGenerateQuiz_(uid, data) {
  data = data || {};
  var course = String(data.course || '').trim().slice(0,80);
  var topic = String(data.topic || '').trim().slice(0,160);
  var difficulty = String(data.difficulty || 'adaptive');
  if (!topic || ['easy','medium','hard','adaptive'].indexOf(difficulty) < 0) throw fail('invalid');
  var courses = table('Courses').rows.filter(function(r){ return r.user_id === uid; });
  if (course && !courses.some(function(r){ return String(r.code) === course || String(r.name) === course; })) throw fail('invalid');
  var prompt = [
    'Create exactly 5 multiple-choice study questions for a university student.',
    'Course: ' + (course || 'General'), 'Topic: ' + topic, 'Difficulty: ' + difficulty,
    'Return ONLY valid JSON with this shape: {"questions":[{"question":"...","options":["...","...","...","..."],"correct_index":0,"explanation":"...","concept":"..."}]}.',
    'Each question must have exactly four distinct options, one correct_index from 0 to 3, a concise explanation, and a short concept label.',
    'Avoid ambiguous questions. Do not include markdown or any text outside JSON.'
  ].join('\n');
  var generated = aiStudyHubGenerate_([{role:'system',content:'You are a careful academic assessment writer. Output strict JSON only.'},{role:'user',content:prompt}]);
  var parsed = aiTutorParseJson_(generated.reply);
  if (!Array.isArray(parsed.questions) || parsed.questions.length !== 5) throw fail('aiQuizFormat');
  var questions = parsed.questions.map(function(q, i) {
    if (!q || typeof q.question !== 'string' || q.question.length > 700 || !Array.isArray(q.options) || q.options.length !== 4 || !Number.isInteger(Number(q.correct_index)) || Number(q.correct_index) < 0 || Number(q.correct_index) > 3) throw fail('aiQuizFormat');
    var options = q.options.map(function(v){ if(typeof v!=='string'||!v.trim()||v.length>300)throw fail('aiQuizFormat'); return v.trim(); });
    if (new Set(options).size !== 4) throw fail('aiQuizFormat');
    return {id:String(i),question:q.question.trim(),options:options,concept:String(q.concept||topic).slice(0,100)};
  });
  var key = parsed.questions.map(function(q,i){ return {id:String(i),correct_index:Number(q.correct_index),explanation:String(q.explanation||'').slice(0,1000),concept:String(q.concept||topic).slice(0,100)}; });
  var id = newId();
  append('AITutorQuizzes',{id:id,user_id:uid,course:course,topic:topic,difficulty:difficulty,questions_json:JSON.stringify(questions),answer_key_json:JSON.stringify(key),created_at:new Date().toISOString(),status:'open'});
  return {quiz:{id:id,course:course,topic:topic,difficulty:difficulty,questions:questions}};
}
function aiTutorSubmitQuiz_(uid, data) {
  data=data||{}; var id=String(data.quiz_id||''), answers=data.answers;
  if (!/^[a-f0-9]{12,40}$/i.test(id) || !answers || typeof answers!=='object') throw fail('invalid');
  var t=table('AITutorQuizzes'), quiz=t.rows.filter(function(r){return r.id===id&&r.user_id===uid;})[0];
  if(!quiz)throw fail('notFound');
  if(quiz.status==='completed')throw fail('quizCompleted');
  var questions=JSON.parse(String(quiz.questions_json||'[]')), key=JSON.parse(String(quiz.answer_key_json||'[]'));
  if(questions.length!==5||key.length!==5)throw fail('aiQuizFormat');
  var score=0,details=questions.map(function(q,i){var chosen=Number(answers[q.id]);var k=key[i];var valid=Number.isInteger(chosen)&&chosen>=0&&chosen<4;var correct=valid&&chosen===k.correct_index;if(correct)score++;return{question_id:q.id,selected_index:valid?chosen:-1,correct_index:k.correct_index,correct:correct,explanation:k.explanation,concept:k.concept};});
  locked(function(){
    append('AITutorAttempts',{id:newId(),user_id:uid,quiz_id:id,course:String(quiz.course||''),topic:String(quiz.topic||''),score:score,total:questions.length,answers_json:JSON.stringify(details),completed_at:new Date().toISOString()});
    aiStudyHubSetCell_('AITutorQuizzes',quiz._r,'status','completed');
  });
  return {score:score,total:questions.length,percentage:Math.round(score/questions.length*100),details:details,dashboard:aiTutorDashboard_(uid)};
}
function aiTutorDashboard_(uid) {
  var attempts=table('AITutorAttempts').rows.filter(function(r){return r.user_id===uid;}).sort(function(a,b){return String(b.completed_at).localeCompare(String(a.completed_at));});
  var groups={};
  attempts.forEach(function(a){var k=String(a.course||'General')+'||'+String(a.topic||'');if(!groups[k])groups[k]={course:String(a.course||''),topic:String(a.topic||''),score:0,total:0,attempts:0,last:a.completed_at};groups[k].score+=Number(a.score)||0;groups[k].total+=Number(a.total)||0;groups[k].attempts++;});
  var topics=Object.keys(groups).map(function(k){var g=groups[k];return{course:g.course,topic:g.topic,attempts:g.attempts,accuracy:g.total?Math.round(g.score/g.total*100):0,last_attempt:g.last};}).sort(function(a,b){return a.accuracy-b.accuracy;});
  return {attempt_count:attempts.length,average_accuracy:attempts.length?Math.round(attempts.reduce(function(n,a){return n+(Number(a.total)?Number(a.score)/Number(a.total)*100:0);},0)/attempts.length):0,weak_topics:topics.filter(function(x){return x.attempts>=1&&x.accuracy<70;}).slice(0,6),topics:topics.slice(0,10),recent:attempts.slice(0,5).map(function(a){return{course:String(a.course||''),topic:String(a.topic||''),score:Number(a.score)||0,total:Number(a.total)||0,completed_at:String(a.completed_at||'')};})};
}
