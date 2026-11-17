// Entry points. The frontend POSTs JSON as text/plain (avoids CORS preflight).
function json(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function fail(c){return {code:c}}
function doGet(){return json({ok:true,data:{service:'UniLife OS API',version:CFG.VERSION}})}
function doPost(e){
  var out;
  try{
    var req=JSON.parse(e.postData.contents);
    if(!req||typeof req!=='object'||typeof req.action!=='string')throw fail('invalid');
    out={ok:true,data:handle(req)};
  }catch(x){
    out={ok:false,error:x&&x.code?x.code:'server'};
    if(!(x&&x.code))console.error(x&&x.stack||x);
  }
  return json(out);
}
