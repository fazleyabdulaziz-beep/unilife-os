UL.i18n={dict:{},
 async load(l){const r=await fetch(`locales/${l}.json`);this.dict=await r.json();this.lang=l},
 t(k){return this.dict[k]??k},
 loc(){return UL.prefs.lang==='ms'?'ms-MY':'en-MY'},
 date(d,o){return new Date(d+'T00:00').toLocaleDateString(this.loc(),o||{day:'numeric',month:'short'})},
 num(n,o){return new Intl.NumberFormat(this.loc(),o).format(n)},
 money(n){return this.num(n,{style:'currency',currency:'MYR'})}
};
