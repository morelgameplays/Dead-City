/* DEAD CITY — controles de celular e controle bluetooth (mesma lógica do Super Irmãos).
   Toque: analógico esquerdo (anda/agacha) + arrastar no lado direito (mira 360° e atira sozinho) + botão de pulo.
   Controle (padrão Xbox 360, com tela "CONFIGURAR CONTROLE" para qualquer controle): analógico esq./direcional move ·
   analógico dir. MIRA em 360° e ATIRA enquanto estiver inclinado (solta = para) · RT (R2) também atira enquanto pressionado ·
   A pula · B agacha (segurar) · X porta/escada · LB (L1) mochila.
   Mochila aberta: direcional/analógico escolhe · A usa · X larga · Y dá · B/LB fecha. No menu: direcional navega · A confirma · Start joga solo. */

/* ---------- analógico esquerdo (toque) ---------- */
(function(){
  const st=$('stick'),kn=$('knob');let sid=null;
  function sv(e){const r=st.getBoundingClientRect(),R=r.width/2,L=R*.85;
    let dx=e.clientX-(r.left+R),dy=e.clientY-(r.top+R);const m=Math.hypot(dx,dy);
    if(m>L){dx*=L/m;dy*=L/m}
    kn.style.transform=`translate(${dx}px,${dy}px)`;STICK.x=dx/L;STICK.y=dy/L}
  function sr(){sid=null;STICK.x=STICK.y=0;kn.style.transform='translate(0,0)'}
  st.addEventListener('pointerdown',e=>{if(sid!==null)return;e.preventDefault();sid=e.pointerId;try{st.setPointerCapture(sid)}catch(_){}sv(e)});
  st.addEventListener('pointermove',e=>{if(e.pointerId===sid){e.preventDefault();sv(e)}});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>st.addEventListener(ev,e=>{if(e.pointerId===sid)sr()}));
})();

/* ---------- mira por arrasto (lado direito da tela): atira enquanto o dedo estiver na tela ---------- */
(function(){
  const el=$('aim'),ring=$('aimr'),kn=$('aimk');let cx=0,cy=0;
  const RR=()=>Math.max(60,Math.min(130,Math.min(innerWidth,innerHeight)*.26));
  function av(e){const L=RR(),dz=L*.1;let dx=e.clientX-cx,dy=e.clientY-cy;const m=Math.hypot(dx,dy),k=m>L?L/m:1,rad=ring.getBoundingClientRect().width/2*.8;
    kn.style.transform=`translate(${dx*k/L*rad}px,${dy*k/L*rad}px)`;
    AIM.fr=Math.max(0,Math.min(1,(m-dz)/(L-dz)));if(m>dz){AIM.ax=dx/m;AIM.ay=dy/m}}
  function off(){AIM.on=false;AIM.id=null;ring.style.display='none';kn.style.transform='translate(0,0)'}
  el.addEventListener('pointerdown',e=>{if(AIM.id!==null)return;e.preventDefault();
    const me=S.players[S.myId];AIM.id=e.pointerId;AIM.on=true;AIM.pad=false;AIM.ax=(me&&me.face)||1;AIM.ay=0;AIM.fr=0;cx=e.clientX;cy=e.clientY;
    const b=el.getBoundingClientRect();ring.style.left=(cx-b.left)+'px';ring.style.top=(cy-b.top)+'px';ring.style.display='block';kn.style.transform='translate(0,0)';
    try{el.setPointerCapture(e.pointerId)}catch(_){}});
  el.addEventListener('pointermove',e=>{if(e.pointerId===AIM.id){e.preventDefault();av(e)}});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>el.addEventListener(ev,e=>{if(e.pointerId===AIM.id)off()}));
})();

/* ---------- controle bluetooth (Gamepad API) ---------- */
const PAD={on:false,rep:{},ub:{},foc:null,code:false,ci:0,sup:0,aim:false,blk:{},cfgAsked:0};

/* perfil do controle: cada ação lógica (a,b,x,y,lb,rt,du,dd,dl,dr) aponta para um botão {b:índice}, um eixo {a:índice,s:±1,r:repouso}
   ou uma posição de direcional-eixo {a:índice,v:valor}; rs = analógico direito (eixos, sinais e ponto de repouso).
   O padrão é o Xbox 360 "standard"; a tela CONFIGURAR CONTROLE grava o perfil do seu controle no aparelho. */
const PM_STD={a:{b:0},b:{b:1},x:{b:2},y:{b:3},lb:{b:4},rt:{b:7,t:1},du:{b:12},dd:{b:13},dl:{b:14},dr:{b:15},rs:{x:2,y:3,mx:1,my:1,ox:0,oy:0}};
const PROFN='dc_pad2_';
let PROF=PM_STD,PROFK='',PROFC=false;
function padProfile(g){const k=g.id||'?';if(k===PROFK)return;PROFK=k;PROF=PM_STD;PROFC=false;
  try{const s=localStorage.getItem(PROFN+k);if(s){const o=JSON.parse(s);if(o&&o.a&&o.rs){PROF=Object.assign({},PM_STD,o);PROFC=true}}}catch(_){}}
function padSpec(g,sp){if(!sp)return false;
  if(sp.b!=null){const t=g.buttons[sp.b];return !!t&&(t.pressed||t.value>(sp.t?0.3:0.5))}
  if(sp.a!=null){const v=(g.axes||[])[sp.a];if(v==null)return false;return sp.v!=null?Math.abs(v-sp.v)<.13:(v-sp.r)*sp.s>.45}
  return false}
function padHat(g,k){ /* direcional como eixo em controles genéricos sem perfil gravado */
  if(PROFC||g.mapping=='standard')return false;const ax=g.axes||[];if(ax.length<10||g.buttons.length>12)return false;
  const v=ax[9],n=t=>Math.abs(v-t)<.1;
  return k=='dr'?(n(-.714)||n(-.428)||n(-.142)):k=='dd'?(n(-.142)||n(.142)||n(.428)):k=='dl'?(n(.428)||n(.714)||n(1)):k=='du'?(n(-1)||n(-.714)||n(1)):false}
const padBtn=(g,k)=>typeof k=='number'?!!(g.buttons[k]&&(g.buttons[k].pressed||g.buttons[k].value>.5)):(padSpec(g,PROF[k])||padHat(g,k));
function padGet(){const gs=(navigator.getGamepads?navigator.getGamepads():[])||[];for(const x of gs)if(x&&x.connected)return x;return null}
function padVisible(e){const r=e.getBoundingClientRect();return r.width>2&&r.height>2&&e.offsetParent!==null&&getComputedStyle(e).visibility!='hidden'}
function padCands(root){return[...root.querySelectorAll('button,input')].filter(e=>!e.hidden&&!e.disabled&&padVisible(e))}
function padFocus(e){if(PAD.foc)PAD.foc.classList.remove('gpf');PAD.foc=e;if(e)e.classList.add('gpf')}
function padMove(root,dir){const cs=padCands(root);if(!cs.length)return;
  if(!PAD.foc||!cs.includes(PAD.foc)){const on=root.querySelector('.ch.on');padFocus(on&&cs.includes(on)?on:cs[0]);return}
  const cur=PAD.foc,a=cur.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;let best=null,bs=1e9;
  for(const e of cs){if(e===cur)continue;const r=e.getBoundingClientRect(),dx=r.left+r.width/2-ax,dy=r.top+r.height/2-ay;let p,q;
    if(dir=='left'){p=-dx;q=dy}else if(dir=='right'){p=dx;q=dy}else if(dir=='up'){p=-dy;q=dx}else{p=dy;q=dx}
    if(p<=2)continue;const s=p+Math.abs(q)*2.2;if(s<bs){bs=s;best=e}}
  if(best)padFocus(best)}
function padCodeExit(){PAD.code=false;const f=PAD.foc;if(f&&f.tagName=='INPUT'){f.inputMode='';f.blur()}}
function padCodeMove(d){const f=PAD.foc;if(!f)return;let v=f.value.toUpperCase().replace(/[^A-Z]/g,'');
  if(d=='left')PAD.ci=Math.max(0,PAD.ci-1);
  else if(d=='right'){PAD.ci=Math.min(3,PAD.ci+1);v=v.padEnd(PAD.ci+1,'A')}
  else{v=v.padEnd(PAD.ci+1,'A');const k=(v.charCodeAt(PAD.ci)-65+(d=='up'?1:25))%26;v=v.slice(0,PAD.ci)+String.fromCharCode(65+k)+v.slice(PAD.ci+1)}
  f.value=v.slice(0,4);try{f.setSelectionRange(PAD.ci,PAD.ci+1)}catch(_){}}
function padPress(g,i){const p=padBtn(g,i),was=PAD.ub[i];PAD.ub[i]=p;return p&&!was}
/* menu com controle: direcional/analógico navega, A confirma, Start joga solo */
function padUI(g,root){const ax=g.axes||[],X=ax[0]||0,Y=ax[1]||0,now=performance.now();
  const A=padPress(g,'a'),B=padPress(g,'b'),Xb=padPress(g,'x'),St=padPress(g,9);
  if(!PAD.foc||!root.contains(PAD.foc)||!padVisible(PAD.foc))padMove(root,'');
  const D={left:X<-.5||padBtn(g,'dl'),right:X>.5||padBtn(g,'dr'),up:Y<-.5||padBtn(g,'du'),down:Y>.5||padBtn(g,'dd')};
  for(const d in D){if(D[d]){const t=PAD.rep[d];if(!t||now>t){PAD.rep[d]=now+(t?130:380);PAD.code?padCodeMove(d):padMove(root,d)}}else PAD.rep[d]=0}
  if(PAD.code){if(Xb){const f=PAD.foc;f.value=f.value.slice(0,-1);PAD.ci=Math.max(0,f.value.length-1)}
    if(A||B)padCodeExit();return}
  if(A&&PAD.foc){PAD.sup=1;
    if(PAD.foc.id=='jc'){PAD.code=true;PAD.ci=Math.min(3,Math.max(0,PAD.foc.value.length-1));PAD.foc.inputMode='none';PAD.foc.focus({preventScroll:true})}
    else if(PAD.foc.tagName=='INPUT')PAD.foc.focus();
    else PAD.foc.click()}
  else if(St){PAD.sup=1;$('bSolo').click()}}
function padRelease(){PADIN.x=PADIN.y=PADIN.u=PADIN.d=PADIN.jump=PADIN.fire=PADIN.use=0;if(PAD.aim){AIM.on=false;AIM.pad=false;PAD.aim=false}}

/* ---------- tela CONFIGURAR CONTROLE: o jogo aprende quais botões/eixos do SEU controle são cada ação ---------- */
const PSTEPS=[
  {k:'rsx',h:'Empurre o <b>ANALÓGICO DIREITO</b> para a <b>DIREITA</b> →'},
  {k:'rsy',h:'Empurre o <b>ANALÓGICO DIREITO</b> para <b>CIMA</b> ↑'},
  {k:'rt',h:'Aperte e segure o gatilho <span class="pb rt">RT / R2</span><small>atirar</small>'},
  {k:'a',h:'Aperte <span class="pb a">A / ✕</span><small>pular · usar item da mochila</small>'},
  {k:'b',h:'Aperte <span class="pb b">B / ○</span><small>agachar · fechar mochila</small>'},
  {k:'x',h:'Aperte <span class="pb x">X / □</span><small>porta · escada · largar item</small>'},
  {k:'y',h:'Aperte <span class="pb y">Y / △</span><small>dar item a outro jogador</small>'},
  {k:'lb',h:'Aperte <span class="pb lb">LB / L1</span><small>abrir e fechar a mochila</small>'},
  {k:'du',h:'Direcional: aperte para <b>CIMA</b> ↑'},
  {k:'dd',h:'Direcional: aperte para <b>BAIXO</b> ↓'},
  {k:'dl',h:'Direcional: aperte para a <b>ESQUERDA</b> ←'},
  {k:'dr',h:'Direcional: aperte para a <b>DIREITA</b> →'}
];
const PW={on:false,i:0,prof:{},rs:{},used:new Set(),rest:null,t0:0,armed:false,key:'',shown:''};
function padCfgShow(){const s=PSTEPS[PW.i],t=(PW.rest&&PW.armed)?s.h:'Solte todos os botões e analógicos…';
  if(PW.shown===PW.i+'|'+t)return;PW.shown=PW.i+'|'+t;$('pcN').textContent=(PW.i+1)+' / '+PSTEPS.length;$('pcT').innerHTML=t}
function padCfgOpen(){const g=padGet();if(!g){msg('Conecte o controle e aperte um botão primeiro.',1);return}
  Object.assign(PW,{on:true,i:0,prof:{},rs:{},used:new Set(),rest:null,armed:false,key:g.id||'?',shown:'',t0:performance.now()+900});
  padFocus(null);PAD.code=false;$('padCfg').hidden=false;padCfgShow()}
function padCfgClose(){PW.on=false;$('padCfg').hidden=true;PAD.sup=1}
function padCfgNext(){PW.i++;PW.armed=false;PW.shown='';
  if(PW.i<PSTEPS.length){padCfgShow();return}
  const o=Object.assign({},PM_STD,PW.prof);
  if(PW.rs.x!=null&&PW.rs.y!=null)o.rs=PW.rs;
  try{localStorage.setItem(PROFN+PW.key,JSON.stringify(o))}catch(_){}
  PROF=o;PROFC=true;PROFK=PW.key;padCfgClose();msg('🎮 Controle configurado! Jogue com ele normalmente.')}
function padNeutral(g){const R=PW.rest,ax=g.axes||[];
  for(let i=0;i<g.buttons.length;i++){const t=g.buttons[i],p=t.pressed||t.value>.5;if(p!=!!R.bt[i])return false}
  for(let i=0;i<ax.length;i++)if(Math.abs(ax[i]-(R.ax[i]||0))>.3)return false;return true}
function padDetect(g,k){const R=PW.rest,ax=g.axes||[],stick=k=='rsx'||k=='rsy',dp=k[0]=='d'&&k!='dr'||k=='dr';
  if(!stick)for(let i=0;i<g.buttons.length;i++){const t=g.buttons[i],p=t.pressed||t.value>.5;
    if(p&&!R.bt[i]&&!PW.used.has('b'+i))return{b:i,t:k=='rt'?1:0}}
  for(let i=2;i<ax.length;i++){ /* eixos 0 e 1 são o analógico esquerdo */
    if(!(dp&&!stick)&&PW.used.has('a'+i))continue;
    const d=ax[i]-(R.ax[i]||0);if(Math.abs(d)<=.6)continue;
    return(dp&&!stick)?{a:i,v:ax[i]}:{a:i,s:d>0?1:-1,r:R.ax[i]||0}}
  return null}
function padWizard(g){padRelease();PAD.on=true;document.body.classList.add('padmode');
  const now=performance.now();
  if(!PW.rest){if(now<PW.t0)return;PW.rest={ax:[...(g.axes||[])],bt:[...g.buttons].map(t=>!!(t.pressed||t.value>.5))};PW.armed=true;padCfgShow();return}
  if(!PW.armed){if(padNeutral(g)){PW.armed=true;padCfgShow()}return}
  const s=PSTEPS[PW.i],r=padDetect(g,s.k);if(!r)return;
  if(s.k=='rsx'){PW.rs={x:r.a,mx:r.s,ox:r.r,y:null,my:1,oy:0};PW.used.add('a'+r.a)}
  else if(s.k=='rsy'){PW.rs.y=r.a;PW.rs.my=-r.s;PW.rs.oy=r.r;PW.used.add('a'+r.a)}
  else{PW.prof[s.k]=r;if(r.b!=null)PW.used.add('b'+r.b);else if(s.k[0]!='d')PW.used.add('a'+r.a)}
  padCfgNext()}
$('bCfg').onclick=()=>padCfgOpen();
$('pcSkip').onclick=()=>{if(PW.on&&PW.rest)padCfgNext()};
$('pcCancel').onclick=()=>padCfgClose();
$('pcDef').onclick=()=>{try{localStorage.removeItem(PROFN+PW.key)}catch(_){}PROF=PM_STD;PROFC=false;padCfgClose();msg('🎮 Voltou ao padrão Xbox 360.')};
addEventListener('keydown',e=>{if(PW.on&&e.code=='Escape')padCfgClose()});

let gpOn=null;
function gpSync(on){if(on===gpOn)return;gpOn=on;document.body.classList.toggle('gpon',on)} /* controle conectado: ícone ON e botões virtuais escondidos */
function pollPad(){
  const g=padGet();gpSync(!!g);
  if(!g){padRelease();return}
  padProfile(g);
  if(PW.on){padWizard(g);return}
  if(!PAD.on&&(g.buttons.some(x=>x.pressed)||Math.abs(g.axes[0]||0)>.6||Math.abs(g.axes[1]||0)>.6)){PAD.on=true;document.body.classList.add('padmode')}
  if(S.mode=='menu'&&!$('menu').hidden){
    if(PAD.on&&!PROFC&&g.mapping!='standard'&&!PAD.cfgAsked){PAD.cfgAsked=1;padCfgOpen();return} /* controle desconhecido: configura na primeira vez */
    padRelease();padUI(g,$('menu'));return}
  if(PAD.foc){padFocus(null);PAD.code=false}
  if(S.mode!='play'){padRelease();return}
  const E={a:padPress(g,'a'),b:padPress(g,'b'),x:padPress(g,'x'),y:padPress(g,'y')},lb=padPress(g,'lb'),wasOpen=BAG.open;
  /* botões segurados com a mochila aberta (A/B/X) só voltam a valer depois de soltos: fechar a mochila não pula, agacha nem abre porta */
  if(wasOpen)for(const k of ['a','b','x'])if(padBtn(g,k))PAD.blk[k]=1;
  if(lb)bagToggle(); /* LB (L1) abre e fecha a mochila */
  if(BAG.open){padRelease();if(wasOpen)bagPad(g,E);for(const k of ['a','b','x'])if(padBtn(g,k))PAD.blk[k]=1;return}
  for(const k in PAD.blk)if(!padBtn(g,k))delete PAD.blk[k];
  const pb=k=>padBtn(g,k)&&!PAD.blk[k];
  const ax=g.axes||[],dz=.2;
  let X=ax[0]||0,Y=ax[1]||0;X=Math.abs(X)>dz?X:0;Y=Math.abs(Y)>dz?Y:0;
  const l=padBtn(g,'dl'),r=padBtn(g,'dr'),d=padBtn(g,'dd'),u=padBtn(g,'du');
  PADIN.x=r?1:l?-1:X;PADIN.y=d?1:Y;PADIN.u=u?1:0;PADIN.d=(d||pb('b'))?1:0;
  /* analógico direito: mira em 360° e atira enquanto estiver inclinado; solto = para de mirar e de atirar */
  const R=PROF.rs,X2=((ax[R.x]||0)-R.ox)*R.mx,Y2=((R.y==null?0:(ax[R.y]||0))-R.oy)*R.my,m=Math.hypot(X2,Y2);
  if(m>.28){AIM.on=true;AIM.pad=true;PAD.aim=true;AIM.ax=X2/m;AIM.ay=Y2/m;AIM.fr=Math.max(0,Math.min(1,(m-.28)/.62))}
  else if(PAD.aim){AIM.on=false;AIM.pad=false;PAD.aim=false}
  PADIN.fire=padBtn(g,'rt')?1:0;  /* RT (R2) atira enquanto estiver pressionado */
  PADIN.use=pb('x')?1:0;          /* X (□): porta / escada */
  let jump=pb('a');               /* A (✕): pula */
  if(PAD.sup){if(!jump)PAD.sup=0;jump=false} /* o A que confirmou o menu não conta como pulo */
  PADIN.jump=jump?1:0;
}
(function padLoop(){try{pollPad()}catch(_){}requestAnimationFrame(padLoop)})();
addEventListener('pointerdown',()=>{PAD.on=false;document.body.classList.remove('padmode');padFocus(null);PAD.code=false},true);
addEventListener('gamepadconnected',()=>{if(S.mode=='menu')msg('🎮 Controle conectado: direcional navega · A confirma · Start joga solo · botões trocados? toque em CONFIGURAR CONTROLE')});
