window.UL={config:{
  apiUrl:'https://script.google.com/macros/s/AKfycbyE_tNv6NBm2ch7iy9f-h8Qeny0iAtveD1fI0qx-RI6IVPQdipxFGLUxPBiyZtrKfq5xw/exec', // Phase 2: Google Apps Script Web App URL
  fonts:['Inter','Poppins','Roboto','Nunito','Plus Jakarta Sans','DM Sans','Lato'],
  nav:['dashboard','ai','academics','assignments','timetable','exams','finance','productivity','settings'],
  icons:{dashboard:'layout-dashboard',ai:'brain',academics:'book-open',assignments:'clipboard-list',timetable:'calendar-days',exams:'timer',finance:'wallet',productivity:'target',settings:'settings'}
}};

window.ULPalette=function(v){return ['aurora','sunset','mint','rose','lagoon','graphite'].indexOf(v)>-1?v:'aurora'};

// Complete visual theme packs; separate from the legacy accent palette setting.
window.ULVisualTheme=function(v){return ['classic','lofi','forest','sky','gamer'].indexOf(v)>-1?v:'classic'};
window.ULThemePacks=[
 {id:'classic',name:'Classic',description:'The familiar UniLife look',colors:['#7c8cff','#4be1ec'],mascot:'UniBot'},
 {id:'lofi',name:'Lofi Study',description:'Warm paper, sketch lines and a sleepy cat',colors:['#c99b70','#e7c9a2'],mascot:'Cat'},
 {id:'forest',name:'Forest Camp',description:'Mossy greens, natural surfaces and a fox',colors:['#537b58','#b1c58a'],mascot:'Fox'},
 {id:'sky',name:'Dreamy Sky',description:'Cloud-soft blues and a cloud companion',colors:['#78bce5','#c3e5f5'],mascot:'Cloud'},
 {id:'gamer',name:'Pixel Gamer',description:'Dark arcade surfaces and a neon robot',colors:['#9b7bff','#43e7d2'],mascot:'Bot'}
];
