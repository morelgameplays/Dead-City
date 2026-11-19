/* DEAD CITY — abertura: cutscene curta (cortes rápidos com flash) → capa → "Toque para jogar" → menu.
   Tudo desenhado em tempo real com os sprites do próprio jogo: cidade vazia, zumbis pela rua, casa, hospital e 2 sobreviventes
   "online" atirando juntos. PULAR / Espaço / Enter / Esc pulam direto para a capa. */
const IN={on:0,t:0,i:-1,st:0,flash:0,shake:0,glitch:0,pl:[],cap:'',capT:0,dust:[],ready:0,coverT:0};
const rr2=(a,b)=>a+Math.random()*(b-a),ease=u=>u*u*(3-2*u);
/* fábrica de zumbis (mesmo formato do spawnZombies): [tipo, x mín, x máx] */
const zmk=(zn,l)=>l.map(([k,x0,x1],i)=>({id:i,k,zn,x:rr2(x0,x1),sx:x0,y:GY,d:Math.random()<.5?1:-1,hp:ZT[k].hp,mhp:ZT[k].hp,st:0,stT:0,t:Math.random()*5,at:0,cd:0,hurt:0,kb:0,dead:0,x0,x1}));
const zfrom=f=>spawnZombies().filter(f);
/* segmentos: d = duração (s) · z = zona · cam = [início, fim] da câmera · zs = zumbis · tint = cor do ambiente */
const SEG=[
  {d:1.6,z:'c',title:1,zs:()=>[],cam:[700,700]},
  {d:1.4,z:'c',cam:[650,1100],cap:'A cidade foi abandonada.',zs:()=>[],tint:'rgba(30,60,120,.20)'},
  {d:1.1,z:'c',cam:[8300,8560],cap:'A cidade foi abandonada.',zs:()=>[],tint:'rgba(30,60,120,.20)'},
  {d:1.4,z:'c',cam:[3020,3330],cap:'Mas ela não está vazia.',zs:()=>zmk('c',[['z1',3260,3420],['z3',3470,3650],['zfat',3700,3820],['zdog',3050,3200],['z4',3560,3700]]),tint:'rgba(40,10,40,.22)'},
  {d:1.2,z:'c',cam:[7480,7760],cap:'Mas ela não está vazia.',zs:()=>zfrom(z=>z.zn=='c'&&z.x>7400&&z.x<8700),tint:'rgba(40,10,40,.22)'},
  {d:1.4,z:'h1',cam:[260,840],cap:'Eles vagam pelas casas…',zs:()=>zfrom(z=>z.zn=='h1'),tint:'rgba(90,40,0,.14)'},
  {d:1.1,z:'h2',cam:[240,760],cap:'Eles vagam pelas casas…',zs:()=>zfrom(z=>z.zn=='h2'),tint:'rgba(90,40,0,.14)'},
  {d:1.4,z:'c',cam:[5020,5300],cap:'…pelos hospitais…',zs:()=>zfrom(z=>z.zn=='c'&&z.x>4950&&z.x<6000),tint:'rgba(0,70,50,.16)'},
  {d:1.4,z:'hp1',cam:[60,520],cap:'…pelos hospitais…',zs:()=>zfrom(z=>z.zn=='hp1'),tint:'rgba(0,70,50,.16)'},
  {d:1.1,z:'hp2',cam:[420,860],cap:'…pelos hospitais…',zs:()=>zfrom(z=>z.zn=='hp2'),tint:'rgba(0,70,50,.16)'},
  {d:3.9,z:'c',e:1,cap:'Sobreviva. Junto.',tint:'rgba(0,0,0,0)'}
];
let introKeyFn=null;
function startIntro(){
  if(location.hash=='#menu'){$('menu').hidden=false;return}
  S.mode='intro';$('menu').hidden=true;$('bSkip').hidden=false;
  const me=newPlayer(0,'x','k');me.dead=1;me.x=-99999;S.players={0:me};S.myId=0; /* só dá a "zona" à câmera; morto = zumbis não o enxergam */
  musIntro();
  IN.on=1;IN.t=0;IN.i=-1;IN.cap='';IN.dust=Array.from({length:46},()=>({x:Math.random(),y:Math.random(),s:rr2(.2,.9),r:rr2(.8,2)}));
  introKeyFn=e=>{if(IN.on&&(e.code=='Space'||e.code=='Enter'||e.code=='Escape')){e.preventDefault();endIntro()}};
  addEventListener('keydown',introKeyFn);
  nextSeg();
}
function introHit(f,g){IN.flash=f||.18;IN.shake=g||.22;IN.glitch=.2}
function nextSeg(){
  IN.i++;IN.st=0;if(IN.i>=SEG.length){endIntro();return}
  const sc=SEG[IN.i],me=S.players[0];me.z=sc.z;S.B=[];S.FX=[];
  if(IN.i>0)introHit(IN.i==SEG.length-1?.28:.2,IN.i%2?.2:.3);
  if(sc.e){ /* 2 sobreviventes online correndo juntos e atirando */
    const mk=(id,n,ch,x)=>{const p=newPlayer(id,n,ch);p.x=x;p.y=GY;p.z='c';p.on=1;p.face=1;p.ax=1;p.ay=0;p.ammo=999;p.cd=rr2(0,.2);return p};
    IN.pl=[mk(0,'Kemuel','k',2040),mk(1,'Yago','y',1960)];
    S.Z=zmk('c',[['z1',2600,2610],['z4',2740,2750],['z3',2880,2890],['zdog',3030,3040],['z2',3160,3170],['zfat',3300,3310],['z4',3440,3450],['z1',3580,3590]]);
    for(const z of S.Z){z.d=-1;z.x0=-1e5;z.x1=1e5}
  }else S.Z=sc.zs();
  if(sc.cap!==IN.cap){IN.cap=sc.cap||'';IN.capT=0}
}
function endIntro(){
  if(!IN.on)return;const nat=IN.i>=SEG.length;IN.on=0;musCover(nat);removeEventListener('keydown',introKeyFn);
  $('bSkip').hidden=true;S.players={};S.myId=0;S.Z=spawnZombies();S.B=[];S.FX=[];S.mode='menu';cam=0;
  const cv2=$('cover');cv2.hidden=false;void cv2.offsetWidth;cv2.classList.add('on');IN.coverT=0;IN.ready=0;
  setTimeout(()=>{if(!cv2.hidden){$('bPlay').classList.add('on');IN.ready=1}},2600); /* o botão aparece segundos depois da capa */
}
function coverPlay(){
  if(!IN.ready)return;IN.ready=0;musStop();
  const cv2=$('cover');cv2.classList.remove('on');$('menu').hidden=false;
  setTimeout(()=>{cv2.hidden=true;$('bPlay').classList.remove('on')},700);
}
function introUpdate(dt){
  IN.t+=dt;IN.st+=dt;IN.capT+=dt;IN.flash=Math.max(0,IN.flash-dt);IN.shake=Math.max(0,IN.shake-dt);IN.glitch=Math.max(0,IN.glitch-dt);
  const sc=SEG[IN.i];if(!sc)return;
  if(IN.st>=sc.d){nextSeg();return}
  const u=Math.min(1,IN.st/sc.d);
  if(sc.e){
    const pl=IN.pl;let lead=-1e9;
    for(const p of pl){
      p.t+=dt;p.cd-=dt;p.flash-=dt;p.vx=105+p.id*6;p.x+=p.vx*dt;p.on=1;p.rt+=dt*11*Math.max(.6,Math.min(1.3,p.vx/RUNSPD));p.fk=pickFrame(p);lead=Math.max(lead,p.x);
      const tg=S.Z.find(z=>z.st!=3&&z.x>p.x&&z.x-p.x<540);
      if(tg&&p.cd<=0){p.ay=(Math.random()-.5)*.04;fireWeapon(p);p.cd=.26+Math.random()*.12;const b=S.B[S.B.length-1];if(b)b.cos=true}
    }
    cam=lead-VW*.34;
    for(const b of S.B){ /* balas próprias: acertam os zumbis (sem loot nem dano real) */
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.l-=dt;if(b.l<=0)continue;
      for(const z of S.Z){if(z.st==3)continue;const T=ZT[z.k];
        if(Math.abs(b.x-z.x)<T.hw+4&&b.y>z.y-T.h&&b.y<z.y+4){
          b.l=0;z.ih=(z.ih||0)+1;burst(b.x,b.y,'#b3121c',5,'c');
          if(z.ih>=T.hp){setZ(z,3);z.dead=0;const p=pl[b.o];if(p)p.kl++}else{setZ(z,2);z.hurt=.12;z.kb=120}
          break}}}
    S.B=S.B.filter(b=>b.l>0);
  }else cam=sc.cam[0]+(sc.cam[1]-sc.cam[0])*ease(u);
  updZombies(dt);updFX(dt);
}
function drawIntro(){
  const sc=SEG[IN.i];if(!sc){c.fillStyle='#000';c.fillRect(0,0,VW,VH);return}
  const zn=sc.z,u=Math.min(1,IN.st/sc.d);
  c.fillStyle='#000';c.fillRect(0,0,VW,VH);
  if(sc.title){ /* cartela inicial */
    const a=Math.min(1,IN.st/.5)*Math.min(1,(sc.d-IN.st)/.35),fl=.85+Math.random()*.15;
    c.globalAlpha=a*fl;txt('DIA 347',VW/2,VH/2+6,54,'#e8e2d0','center');
    txt('o sinal de rádio parou de responder…',VW/2,VH/2+44,15,'#9a8fb0','center');c.globalAlpha=1;
    introPost(sc);return}
  c.save();
  const zm=1+.07*(sc.e?Math.min(1,IN.st/sc.d):u),sx=IN.shake?(Math.random()-.5)*IN.shake*46:0,sy=IN.shake?(Math.random()-.5)*IN.shake*30:0;
  c.translate(VW/2+sx,VH/2+sy);c.scale(zm,zm);c.translate(-VW/2,-VH/2);
  if(zn=='c'){drawBackdrop();drawWorld();drawLeftVoid();drawRightVoid(MAP.W)}else drawInterior(zn);
  for(const z of S.Z)drawZombie(z);
  if(sc.e){for(const p of IN.pl)drawPlayer(p,false,true);drawBullets();drawFX()}
  c.fillStyle='rgba(12,8,40,.22)';c.fillRect(0,0,VW,VH);
  if(sc.tint){c.fillStyle=sc.tint;c.fillRect(0,0,VW,VH)}
  if(!vig){vig=c.createRadialGradient(VW/2,VH/2,VH*.35,VW/2,VH/2,VW*.62);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.65)')}
  c.fillStyle=vig;c.fillRect(0,0,VW,VH);
  c.restore();
  if(sc.e){ /* "HUD" do online simulado (abaixo da barra de cinema) */
    const hy=VH*.115+22;
    txt('● ONLINE',14,hy,15,Math.floor(S.T*2)%2?'#ff4b4b':'#8a2222');
    txt('SALA K7QX',VW-14,hy,14,'#9fe7ff','right');
    let y=hy+22;for(const p of IN.pl){txt(p.name+'  ☠'+p.kl,VW-14,y,12,'#ffe27a','right');bar(VW-74,y+3,60,4,1,'#6c6');y+=20}
  }
  introPost(sc);
}
/* acabamento: barras de cinema, grão, poeira, legenda, glitch e flash dos cortes */
function introPost(sc){
  if(IN.glitch>0&&!sc.title)for(let k=0;k<6;k++){const y=Math.random()*VH,h=6+Math.random()*34,dx=(Math.random()-.5)*60*IN.glitch*5;c.drawImage(cv,0,y*RES,VW*RES,h*RES,dx,y,VW,h)}
  c.fillStyle='rgba(255,255,255,.5)';
  for(const d of IN.dust){const x=((d.x+S.T*.012*d.s)%1)*VW,y=((d.y+S.T*.02*d.s)%1)*VH;c.globalAlpha=.25*d.s;c.fillRect(x,y,d.r,d.r)}
  c.globalAlpha=1;
  for(let k=0;k<40;k++){c.fillStyle='rgba(255,255,255,'+(Math.random()*.07)+')';c.fillRect(Math.random()*VW,Math.random()*VH,2,2)}
  const bh=VH*.115;c.fillStyle='#000';c.fillRect(0,0,VW,bh);c.fillRect(0,VH-bh,VW,bh);
  if(IN.cap&&!sc.title){const n=Math.min(IN.cap.length,Math.floor(IN.capT*38)),a=Math.min(1,IN.capT*4);c.globalAlpha=a;txt(IN.cap.slice(0,n),VW/2,VH-bh-16,24,'#f4ecd8','center');c.globalAlpha=1}
  if(IN.flash>0){c.fillStyle='rgba(255,255,255,'+Math.min(1,IN.flash/.18)*.92+')';c.fillRect(0,0,VW,VH)}
  const fi=Math.min(1,IN.t/.4);if(fi<1){c.fillStyle='rgba(0,0,0,'+(1-fi)+')';c.fillRect(0,0,VW,VH)}
}
$('bSkip').addEventListener('click',endIntro);
$('bPlay').addEventListener('click',e=>{e.stopPropagation();coverPlay()});
$('cover').addEventListener('click',coverPlay);
addEventListener('keydown',e=>{if(!$('cover').hidden&&IN.ready&&(e.code=='Enter'||e.code=='Space')){e.preventDefault();coverPlay()}});
