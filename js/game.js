/* DEAD CITY — núcleo: carregamento, entrada, laço principal, desenho e HUD. */
'use strict';
let VW=800;const VH=480,GS=.75;
/* ZOOM DE CÂMERA (teste): >1 aproxima o mundo e reduz o campo de visão (mais tela cheia, mais tensão).
   VW = largura do canvas (HUD) · VWW = largura do MUNDO visível (VW/zoom) · RES = nitidez do canvas · camY = câmera vertical.
   Níveis no botão 🔍 (salvo no aparelho) ou ?zoom=1.6 na URL. */
const ZLV=[1,1.25,1.5,1.75,2];
let ZOOM=(()=>{const u=parseFloat(new URLSearchParams(location.search).get('zoom'));if(u>=1&&u<=2.5)return u;
  try{const v=parseFloat(localStorage.getItem('dc-zoom'));if(v>=1&&v<=2.5)return v}catch(_){}return 1.5})();
let VWW=800,RES=1,camY=0;
const zoomNow=()=>S.mode=='play'?ZOOM:1;
const $=id=>document.getElementById(id);
const cv=$('g'),c=cv.getContext('2d');cv.width=VW;cv.height=VH;c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
/* tela responsiva: altura do mundo fixa (480), largura acompanha a proporção real da tela (sem bordas pretas) */
function fitScreen(){
  const nw=Math.max(640,Math.min(1400,Math.round(VH*innerWidth/innerHeight)));
  const nr=Math.max(1,Math.min(1.5,Math.round(innerHeight*(devicePixelRatio||1)/VH*2)/2)); /* nitidez: até 1,5× (importante com zoom) */
  if(nw!==VW||nr!==RES||cv.width!==Math.round(nw*nr)){VW=nw;RES=nr;cv.width=Math.round(VW*RES);cv.height=Math.round(VH*RES);vig=null;c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high'}
  const st=$('stage');st.style.aspectRatio=VW+'/'+VH;st.style.width='min(100vw,calc(100dvh * '+VW+' / '+VH+'))';
}
addEventListener('resize',fitScreen);addEventListener('orientationchange',()=>setTimeout(fitScreen,200));
if(window.visualViewport)visualViewport.addEventListener('resize',fitScreen);
const IMG={},TINT={};
const S={mode:'menu',myId:0,players:{},Z:[],B:[],FX:[],taken:[],T:0,win:0,winT:0,flash:0,room:'',fade:0,snap:0,drops:[],dropId:1,toasts:[]};
const K={l:0,r:0,u:0,d:0,j:0,f:0,e:0};
/* entradas analógicas: STICK = analógico esquerdo (toque), AIM = mira 360° (toque ou analógico direito), PADIN = controle bluetooth */
const STICK={x:0,y:0},AIM={on:false,id:null,ax:1,ay:0,fr:0,pad:false},PADIN={x:0,y:0,u:0,d:0,jump:0,fire:0,use:0};
let vig=null,cam=0,MYNAME='Sobrevivente',MYCH='k',ready=false;

/* ---------- carregamento ---------- */
function loadAll(cb){
  const ks=Object.keys(SPR_META);let n=0;
  for(const k of ks){const i=new Image();i.onload=i.onerror=()=>{if(++n==ks.length)cb()};i.src=SPR_META[k].src;IMG[k]=i}
}
function msg(t,err){const e=$('msg');e.textContent=t;e.className=err?'err':''}

/* ---------- sessão ---------- */
function readProfile(){
  MYNAME=($('nm').value.trim()||'Sobrevivente').slice(0,12);
  MYCH=document.querySelector('.ch.on').dataset.c;
  try{localStorage.setItem('dc-profile',JSON.stringify({n:MYNAME,c:MYCH}))}catch(_){}
}
function beginSession(isClient){
  if(!isClient){S.myId=0;S.players={0:newPlayer(0,MYNAME,MYCH)}}
  resetLevel(isClient);if(!isClient)clkReset();
  S._ws=0;S.mode='play';$('menu').hidden=true;$('bBag').hidden=false;$('bZoom').hidden=false;zoomLabel();
  try{const el=document.documentElement;(el.requestFullscreen?el.requestFullscreen():Promise.reject()).then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape')).catch(()=>{})}catch(_){}
  if(matchMedia('(pointer:coarse)').matches||'ontouchstart' in window)$('pad').hidden=false;
}
function toMenu(t){
  resetNet();S.mode='menu';S.players={};S.myId=0;$('menu').hidden=false;$('pad').hidden=true;$('bBag').hidden=true;$('bZoom').hidden=true;bagReset();S.drops=[];
  for(const k in K)K[k]=0;STICK.x=STICK.y=0;AIM.on=false;AIM.id=null;msg(t||'',!!t);
}
function resetLevel(keepZ){
  S.Z=spawnZombies();S.B=[];S.FX=[];S.drops=[];S.taken=MAP.pick.map(()=>0);S.fsr=MAP.furn.map(()=>0);S.fpend={};S.win=0;S.winT=0;
  for(const id in S.players){const p=S.players[id];respawn(p);p.inv=0;p.hp=MAXHP;p.food=p.water=100;p.sd=0;p.ammo=40;p.kl=0;p.tx=p.x;p.ty=p.y}
}

/* ---------- entrada ---------- */
const KEYMAP={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'u',KeyW:'u',ArrowDown:'d',KeyS:'d',Space:'j',KeyK:'j',KeyJ:'f',KeyZ:'f',KeyX:'f',KeyE:'e'};
addEventListener('keydown',e=>{const k=KEYMAP[e.code];if(!k||S.mode!='play')return;K[k]=1;e.preventDefault()});
addEventListener('keyup',e=>{const k=KEYMAP[e.code];if(k)K[k]=0});
addEventListener('blur',()=>{for(const k in K)K[k]=0});
document.querySelectorAll('#pad button').forEach(b=>{
  const k=b.dataset.k,on=v=>{K[k]=v;b.classList.toggle('on',!!v)};
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);on(1)});
  for(const ev of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>on(0));
});
addEventListener('contextmenu',e=>e.preventDefault());

/* ---------- menu ---------- */
document.querySelectorAll('.ch').forEach(b=>b.onclick=()=>{document.querySelectorAll('.ch').forEach(x=>x.classList.remove('on'));b.classList.add('on')});
$('bSolo').onclick=()=>{if(!ready)return;readProfile();resetNet();beginSession()};
$('bHost').onclick=()=>{if(!ready)return;readProfile();hostRoom()};
$('bJoin').onclick=()=>{if(!ready)return;readProfile();const code=$('jc').value.trim().toUpperCase();
  if(code.length!=4){msg('Digite o código de 4 letras da sala.',1);return}joinRoom(code)};
try{const pr=JSON.parse(localStorage.getItem('dc-profile')||'null');if(pr){$('nm').value=pr.n||'';
  if(pr.c=='y'){document.querySelectorAll('.ch').forEach(x=>x.classList.toggle('on',x.dataset.c=='y'))}}}catch(_){}

/* ---------- área do analógico: o herói nunca fica atrás dele ---------- */
let padL=0,padR=0; /* px do canvas reservados à esquerda (analógico) e à direita (botões de pular/porta); 0 sem controles de toque */
function calcPadL(){
  const pd=$('pad');if(!pd||pd.hidden){padL=padR=0;return}
  const st=$('stage').getBoundingClientRect(),sk=$('stick').getBoundingClientRect(),bj=$('bJ').getBoundingClientRect();
  if(!st.width){padL=padR=0;return}
  padL=Math.max(0,(sk.right-st.left)*VWW/st.width+24);
  padR=Math.max(0,(st.right-bj.left)*VWW/st.width+24);
}
/* faixas escuras nas pontas do mapa, mostradas quando a câmera recua para o herói não ficar atrás dos controles */
function drawLeftVoid(){
  if(cam>=0)return;const w=-cam;
  c.fillStyle='#07050b';c.fillRect(0,0,w,VH);
  const g=c.createLinearGradient(w,0,w+34,0);g.addColorStop(0,'rgba(7,5,11,.9)');g.addColorStop(1,'rgba(7,5,11,0)');c.fillStyle=g;c.fillRect(w,0,34,VH);
}
function drawRightVoid(zw){
  const x=zw-cam;if(x>=VWW)return;
  c.fillStyle='#07050b';c.fillRect(x,0,VWW-x+1,VH);
  const g=c.createLinearGradient(x,0,x-34,0);g.addColorStop(0,'rgba(7,5,11,.9)');g.addColorStop(1,'rgba(7,5,11,0)');c.fillStyle=g;c.fillRect(x-34,0,34,VH);
}

/* ---------- atualização ---------- */
function update(dt){
  VWW=VW/zoomNow();
  S.T+=dt;S.flash=Math.max(0,S.flash-dt);
  for(const t of S.toasts)t.ttl-=dt;if(S.toasts.length&&S.toasts[0].ttl<=0)S.toasts=S.toasts.filter(t=>t.ttl>0);
  const auth=isAuth(),me=S.players[S.myId];
  ambUpdate(dt,me); /* trilha de terror por ambiente (js/ambience.js) */
  if(S.mode=='intro'){introUpdate(dt);return}
  if(S.mode=='menu'){updZombies(dt);cam=(S.T*40)%(MAP.W-VW);return}
  if(me)updMe(me,dt);
  for(const id in S.players)if(id!=S.myId)updRemote(S.players[id],dt);
  if(auth){
    updZombies(dt);
    if(!S.win&&S.Z.every(z=>z.st==3)){S.win=1;S.winT=0;bcast({t:'win'})}
    if(S.win){S.winT+=dt;if(S.winT>7){resetLevel();bcast({t:'reset'})}}
  }else clientZombieAnim(dt);
  clkUpdate(dt);updBullets(dt);updFX(dt);netTick(dt);
  if(me)sfxZombies(dt,me);
  if(me){/* câmera: antecipação pela direção do movimento, suavizada; cômodos menores que a tela ficam centralizados */
    me.la+=((Math.abs(me.mv)>20?Math.sign(me.mv)*60:0)-me.la)*Math.min(1,dt*2.5);
    calcPadL();
    const zw=ZN[me.z||'c'].W,t0=me.x-VWW/2+me.la,lo=-padL,hi=Math.max(lo,zw-VWW+padR),tg=zw<=VWW?Math.max(lo,Math.min(hi,(zw-VWW)/2)):Math.max(lo,Math.min(hi,t0));
    /* câmera vertical: base alinhada ao chão; sobe junto quando o herói pula/sobe em plataformas (a cabeça nunca sai da tela) */
    const tyy=Math.max(0,Math.min(Math.max(0,VH-25-VH/ZOOM),me.y-175)); /* base: mostra o teto e corta só um pouco do piso */
    if(S.snap){cam=tg;camY=tyy;S.snap=0}else{cam+=(tg-cam)*Math.min(1,dt*9);camY+=(tyy-camY)*Math.min(1,dt*10)}
    if(padL)cam=Math.min(cam,me.x-padL-16); /* garantia: o herói sempre fica à direita do analógico… */
    if(padR)cam=Math.max(cam,me.x-(VWW-padR-16)); /* …e à esquerda dos botões de pular/porta */
    S.fade=Math.max(0,S.fade-dt);
    const be=$('bE'),mode=me.dead?0:(me.nf?2:(me.nd?1:0)); /* 0 oculto · 1 porta 🚪 · 2 vasculhar ✋ */
    if(be&&be._m!==mode){be._m=mode;be.hidden=!mode;if(!mode){K.e=0;be.classList.remove('on')}else{be.textContent=mode==2?'✋':'🚪';be.setAttribute('aria-label',mode==2?'Vasculhar':'Porta')}}
  }
}

/* ---------- desenho ---------- */
function spr(n,x,y,s){const m=SPR_META[n],i=IMG[n];if(!m||!i)return;const w=m.w*s,h=m.h*s;c.drawImage(i,x-cam-w/2,y-h,w,h)}
function slice3(n,x,y,w,s,cap){
  const i=IMG[n],m=SPR_META[n];if(!i||!m)return;const W0=m.w,H0=m.h,cd=cap*s,dh=H0*s,mw=(W0-2*cap)*s;
  c.save();c.translate(-cam,0);
  c.drawImage(i,0,0,cap,H0,x,y,cd,dh);c.drawImage(i,W0-cap,0,cap,H0,x+w-cd,y,cd,dh);
  let k=0;for(let px=x+cd;px<x+w-cd;px+=mw,k++){
    if(px-cam>VWW||px+mw-cam<0)continue;
    const rw=Math.min(mw,x+w-cd-px);c.save();
    if(rw<mw){c.beginPath();c.rect(px,y,rw,dh);c.clip()}
    if(k&1){c.translate(px+mw,y);c.scale(-1,1);c.drawImage(i,cap,0,W0-2*cap,H0,0,0,mw,dh)}
    else c.drawImage(i,cap,0,W0-2*cap,H0,px,y,mw,dh);
    c.restore()}
  c.restore();
}
function bgTile(im,m,a){ /* faixa do cenário de fundo, com paralaxe, repetida e espelhada */
  const mw=m.w*1.45,mh=m.h*1.45,my=GY+6-mh,mc=cam*.25;c.globalAlpha=a;
  for(let k=Math.floor(mc/mw);k*mw-mc<VWW;k++){const x=k*mw-mc;c.save();
    if(((k%2)+2)%2){c.translate(x+mw,my);c.scale(-1,1);c.drawImage(im,0,0,mw,mh)}else c.drawImage(im,x,my,mw,mh);c.restore()}
  c.globalAlpha=1;
}
function drawBackdrop(){ /* 4 cenários da folha (noite, entardecer/amanhecer, manhã, meio-dia) em transição gradual pelo relógio (js/clock.js) */
  const p=(S.mode=='play'&&S.clk!==undefined)?clkPhase():['night','night',0],a=p[0],b=p[1],tt=p[2];
  const ca=CLK_PH[a].sky,cb=CLK_PH[b].sky;
  c.fillStyle='rgb('+ca.map((v,k)=>Math.round(v+(cb[k]-v)*tt)).join(',')+')';c.fillRect(0,0,VWW,VH);
  const ma=SPR_META['bg'+a],ia=IMG['bg'+a];if(ma&&ia&&ia.complete)bgTile(ia,ma,1);
  if(tt>0&&a!=b){const mb=SPR_META['bg'+b],ib=IMG['bg'+b];if(mb&&ib&&ib.complete)bgTile(ib,mb,tt)}
}
function drawPickups(){
  const zn=curZone();
  MAP.pick.forEach((k,i)=>{
    if(S.taken[i]||(k.zn||'c')!=zn)return;const bob=Math.sin(S.T*3+i)*3,x=k.x-cam;if(x<-40||x>VWW+40)return;
    if(k.t=='ammo'){spr('zcrate',k.x,k.y+bob,.42);c.fillStyle='#ffd34a';c.fillRect(x-5,k.y+bob-26,10,10)}
    else if(ITEMS[k.t])drawItem(k.t,k.x,k.y+bob);
  });
  drawDrops();
}
function drawWorld(){
  for(const b of MAP.bld||[]){const hw=(SPR_META[b.n]?SPR_META[b.n].w*b.s/2:300)+20;if(Math.abs(b.x-cam-VWW/2)>VWW/2+hw)continue;spr(b.n,b.x,b.y,b.s)}
  for(const d of MAP.decor){if(d.x-cam<-220||d.x-cam>VWW+220)continue;spr(d.n,d.x,d.y,d.s)}
  drawPickups();
  slice3('zblk',0,GY-8,MAP.W,.92,60);
  for(const q of MAP.plats){if(q.x-cam>VWW||q.x+q.w-cam<0)continue;slice3('zblk2',q.x,q.y-9,q.w,.85,45)}
}
function bar(x,y,w,h,v,col){c.fillStyle='rgba(0,0,0,.65)';c.fillRect(x-2,y-2,w+4,h+4);c.fillStyle=col;c.fillRect(x,y,w*Math.max(0,Math.min(1,v)),h)}
function txt(t,x,y,size,col,al){c.font='bold '+size+'px system-ui';c.textAlign=al||'left';c.lineWidth=4;c.strokeStyle='rgba(0,0,0,.85)';c.strokeText(t,x,y);c.fillStyle=col||'#fff';c.fillText(t,x,y)}
function drawHUD(){
  const me=S.players[S.myId];if(!me)return;
  bar(14,14,170,16,me.hp/MAXHP,me.hp<=2?'#e22':'#d23b3b');txt('VIDA '+me.hp+'/'+MAXHP,18,27,12,'#fff');
  bar(14,34,82,10,me.food/100,me.food<NEED.warn?'#e22':'#e0852d');txt('FOME',18,43,9,'#fff');
  bar(104,34,82,10,me.water/100,me.water<NEED.warn?'#e22':'#3aa0ff');txt('SEDE',108,43,9,'#fff');
  if(me.eq&&ITEMS[me.eq.t])txt('⚔ '+ITEMS[me.eq.t].name+'  ·  '+me.eq.d+'/'+ITEMS[me.eq.t].dur,14,66,15,me.eq.d<=3?'#ff9a6b':'#ffe27a');
  else txt('✹ '+me.ammo+'  ·  '+WEAPONS.pistol.name,14,66,15,me.ammo?'#ffe27a':'#ff6b6b');
  const left=S.Z.filter(z=>z.st!=3).length,zn=curZone(),here=S.Z.filter(z=>z.st!=3&&z.zn==zn).length;
  txt('ZUMBIS: '+left+'/'+S.Z.length,VW-14,26,16,'#c5ff8a','right');
  txt(ZN[zn].short.toUpperCase()+': '+here+(here?' zumbi'+(here>1?'s':''):' · limpo'),14,84,12,here?'#ffb86b':'#9fe7ff');
  if(S.room)txt('SALA '+S.room,VW-14,46,13,'#9fe7ff','right');
  let y=70;const list=Object.values(S.players).sort((a,b)=>a.id-b.id);
  if(list.length>1)for(const p of list){txt(p.name+'  ☠'+p.kl,VW-14,y,12,p.id==S.myId?'#ffe27a':'#ddd','right');
    bar(VW-74,y+3,60,4,p.hp/MAXHP,'#6c6');y+=20}
  S.toasts.forEach((t,i)=>{c.globalAlpha=Math.min(1,t.ttl*2);txt(t.t,VW/2,104+i*20,14,t.col||'#fff','center')});c.globalAlpha=1;
  if(me.dead)txt('VOCÊ CAIU — renascendo em '+Math.ceil(me.deadT)+'s',VW/2,VH/2,24,'#ff6b6b','center');
  if(S.win)txt('ÁREA LIMPA! Reiniciando…',VW/2,90,28,'#c5ff8a','center');
  if(S.flash>0){c.fillStyle='rgba(200,0,0,'+S.flash*.9+')';c.fillRect(0,0,VW,VH)}
}
function draw(){
  c.setTransform(RES,0,0,RES,0,0);VWW=VW/zoomNow();if(S.mode!='play')camY=0;
  if(S.mode=='intro'){drawIntro();return}
  const zn=curZone(),Z=zoomNow();
  c.save();c.setTransform(RES*Z,0,0,RES*Z,0,-camY*RES*Z); /* mundo com zoom · HUD e efeitos de tela ficam sem zoom */
  if(zn=='c'){drawBackdrop();drawWorld();drawLeftVoid();drawRightVoid(MAP.W)}else drawInterior(zn);
  drawDoorMarks(zn);
  for(const z of S.Z)drawZombie(z);
  if(S.mode=='play'){
    for(const id in S.players)if(id!=S.myId&&(S.players[id].z||'c')==zn)drawPlayer(S.players[id],false);
    const me=S.players[S.myId];if(me)drawPlayer(me,true);
    drawBullets();drawFX();drawReticle();
  }
  c.restore();
  const dk0=S.mode=='play'&&S.clk!==undefined?clkDark():1;if(!(S.mode=='play'&&S.clk!==undefined)){c.fillStyle='rgba(12,8,40,.22)';c.fillRect(0,0,VW,VH)}clkDraw(zn);
  if(!vig){vig=c.createRadialGradient(VW/2,VH/2,VH*.35,VW/2,VH/2,VW*.62);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.65)')}
  c.globalAlpha=.45+.55*dk0;c.fillStyle=vig;c.fillRect(0,0,VW,VH);c.globalAlpha=1;
  if(S.fade>0){c.fillStyle='rgba(0,0,0,'+Math.min(1,S.fade*2.4)+')';c.fillRect(0,0,VW,VH)}
  if(S.mode=='play'){drawHUD();clkHud()}
}

/* ---------- laço ---------- */
let last=0;
function loop(ts){requestAnimationFrame(loop);const dt=Math.min(.05,(ts-last)/1000||0);last=ts;if(!ready)return;update(dt);draw()}
fitScreen();
S.Z=spawnZombies();
loadAll(()=>{ready=true;$('imK').src=SPR_META['k.i'].src;$('imY').src=SPR_META['y.i'].src;
  msg(window.Peer?'Pronto! Escolha como jogar.':'Pronto! (modo online indisponível: sem servidor de salas)',!window.Peer);startIntro()});
requestAnimationFrame(loop);

/* botão 🔍: alterna o nível de zoom (teste) */
function zoomLabel(){const b=$('bZoom');if(b)b.textContent='🔍'+ZOOM.toFixed(2).replace(/\.?0+$/,'')+'×'}
$('bZoom').onclick=()=>{
  let i=ZLV.findIndex(v=>v>ZOOM+.001);ZOOM=i<0?ZLV[0]:ZLV[i];
  try{localStorage.setItem('dc-zoom',ZOOM)}catch(_){}
  zoomLabel();S.snap=1;
};
