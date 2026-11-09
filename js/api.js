// Thin client for the Apps Script Web App. text/plain avoids a CORS preflight (Apps Script cannot answer OPTIONS).
UL.api={
  token(){return localStorage.getItem('ul_token')},
  async call(action,data={}){
    if(!UL.config.apiUrl)throw{code:'noApi'};
    let r,j;
    try{r=await fetch(UL.config.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,token:this.token(),data})})}catch(e){throw{code:'network'}}
    try{j=await r.json()}catch(e){throw{code:'server'}}
    if(!j.ok){
      if(j.error==='auth'&&!['login','register','bootstrap'].includes(action)){localStorage.removeItem('ul_token');location.reload()}
      throw{code:j.error||'server'}}
    return j.data}
};
