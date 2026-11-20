/* =========================================================
   PHASE 4 — PERSONAL STUDY INTELLIGENCE
   Deterministic revision planning + SM-2 spaced repetition.
   All records are scoped to the authenticated user.
========================================================= */
function aiStudyIntelligenceDashboard_(uid) {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var sessions = table('AIStudySessions').rows.filter(function(r){return r.user_id===uid;});
  var cards = table('AIFlashcards').rows.filter(function(r){return r.user_id===uid;});
  var due = cards.filter(function(r){return !r.due_date || String(r.due_date)<=today;});
  var upcoming = sessions.filter(function(r){return r.status!=='done' && String(r.study_date)>=today;})
    .sort(function(a,b){return String(a.study_date).localeCompare(String(b.study_date));}).slice(0,12);
  var done = sessions.filter(function(r){return r.status==='done';});
  var total = sessions.length;
  var completion = total ? Math.round(done.length/total*100) : 0;
  var mastered = cards.filter(function(r){return Number(r.interval_days)>=21;}).length;
  var exams = table('Examinations').rows.filter(function(r){return r.user_id===uid && String(r.date)>=today;})
    .sort(function(a,b){return String(a.date).localeCompare(String(b.date));}).slice(0,8).map(function(e){
      var related=sessions.filter(function(x){return x.exam_id===e.id;});
      var completed=related.filter(function(x){return x.status==='done';}).length;
      var ratio=related.length?Math.round(completed/related.length*100):0;
      var days=Math.max(0,Math.ceil((new Date(e.date+'T00:00:00Z')-new Date(today+'T00:00:00Z'))/86400000));
      var readiness=ratio;
      return {id:String(e.id),course:String(e.course||''),date:String(e.date||''),days_left:days,session_count:related.length,completed:completed,readiness:readiness};
    });
  return {today:today,stats:{planned:total,completed:done.length,completion:completion,total_cards:cards.length,due_cards:due.length,mastered_cards:mastered},
    sessions:upcoming.map(function(r){return{id:String(r.id),course:String(r.course||''),title:String(r.title||''),study_date:String(r.study_date||''),duration_minutes:Number(r.duration_minutes)||30,status:String(r.status||'planned')};}),
    due_cards:due.slice(0,20).map(function(r){return{id:String(r.id),course:String(r.course||''),front:String(r.front||''),back:String(r.back||''),due_date:String(r.due_date||'')};}),exams:exams};
}
function aiStudyIntelligenceGeneratePlan_(uid) {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var exams = table('Examinations').rows.filter(function(r){return r.user_id===uid && String(r.date)>=today;})
    .sort(function(a,b){return String(a.date).localeCompare(String(b.date));}).slice(0,10);
  if(!exams.length) throw fail('noUpcomingExams');
  var made=0;
  locked(function(){
    exams.forEach(function(exam){
      var existing=table('AIStudyPlans').rows.some(function(p){return p.user_id===uid&&p.exam_id===exam.id&&p.status==='active';});
      if(existing) return;
      var planId=newId(), examDate=new Date(String(exam.date)+'T00:00:00Z');
      append('AIStudyPlans',{id:planId,user_id:uid,exam_id:String(exam.id),course:String(exam.course||''),exam_date:String(exam.date),created_at:new Date().toISOString(),status:'active'});
      var days=Math.max(1,Math.ceil((examDate-new Date(today+'T00:00:00Z'))/86400000));
      var count=Math.min(7,days);
      for(var i=0;i<count;i++){
        var offset=Math.max(0,Math.floor((i+1)*days/(count+1))-1);
        var date=new Date(new Date(today+'T00:00:00Z').getTime()+offset*86400000);
        var label=['Review core concepts','Practise key questions','Recall without notes','Review weak areas','Timed practice','Correct mistakes','Final active recall'][i%7];
        append('AIStudySessions',{id:newId(),user_id:uid,plan_id:planId,exam_id:String(exam.id),course:String(exam.course||''),title:label,study_date:date.toISOString().slice(0,10),duration_minutes:30,status:'planned',completed_at:'',created_at:new Date().toISOString()});
        made++;
      }
    });
  });
  return {created_sessions:made,dashboard:aiStudyIntelligenceDashboard_(uid)};
}
function aiStudyIntelligenceCompleteSession_(uid,data){
  var id=String(data&&data.session_id||'');
  var t=table('AIStudySessions'),r=t.rows.filter(function(x){return x.id===id&&x.user_id===uid;})[0];
  if(!r)throw fail('notFound');
  if(r.status!=='done'){
    aiStudyHubSetCell_('AIStudySessions',r._r,'status','done');
    aiStudyHubSetCell_('AIStudySessions',r._r,'completed_at',new Date().toISOString());
  }
  return {dashboard:aiStudyIntelligenceDashboard_(uid)};
}
function aiStudyIntelligenceAddCard_(uid,data){
  data=data||{};
  var front=String(data.front||'').trim(),back=String(data.back||'').trim(),course=String(data.course||'').trim();
  if(!front||!back||front.length>500||back.length>1200||course.length>80)throw fail('invalid');
  var cards=table('AIFlashcards').rows.filter(function(r){return r.user_id===uid;});
  if(cards.length>=500)throw fail('cardLimit');
  var id=newId(),today=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  append('AIFlashcards',{id:id,user_id:uid,document_id:'',course:course,front:front,back:back,ease_factor:2.5,interval_days:0,repetitions:0,due_date:today,last_reviewed:'',created_at:new Date().toISOString()});
  return {id:id,dashboard:aiStudyIntelligenceDashboard_(uid)};
}
function aiStudyIntelligenceReviewCard_(uid,data){
  data=data||{};var id=String(data.card_id||''),quality=Number(data.quality);
  if(!/^[a-f0-9]{12,40}$/i.test(id)||quality<0||quality>5||Math.floor(quality)!==quality)throw fail('invalid');
  var t=table('AIFlashcards'),r=t.rows.filter(function(x){return x.id===id&&x.user_id===uid;})[0];
  if(!r)throw fail('notFound');
  var reps=Number(r.repetitions)||0,interval=Number(r.interval_days)||0,ease=Number(r.ease_factor)||2.5;
  if(quality<3){reps=0;interval=1;}else{if(reps===0)interval=1;else if(reps===1)interval=6;else interval=Math.max(1,Math.round(interval*ease));reps++;}
  ease=Math.max(1.3,ease+(0.1-(5-quality)*(0.08+(5-quality)*0.02)));
  var today=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  var due=new Date(new Date(today+'T00:00:00Z').getTime()+interval*86400000).toISOString().slice(0,10);
  locked(function(){
    aiStudyHubSetCell_('AIFlashcards',r._r,'repetitions',reps);
    aiStudyHubSetCell_('AIFlashcards',r._r,'interval_days',interval);
    aiStudyHubSetCell_('AIFlashcards',r._r,'ease_factor',ease.toFixed(2));
    aiStudyHubSetCell_('AIFlashcards',r._r,'due_date',due);
    aiStudyHubSetCell_('AIFlashcards',r._r,'last_reviewed',new Date().toISOString());
    append('AIReviewLogs',{id:newId(),user_id:uid,card_id:id,quality:quality,reviewed_at:new Date().toISOString(),interval_days:interval});
  });
  return {next_review:due,interval_days:interval,dashboard:aiStudyIntelligenceDashboard_(uid)};
}
