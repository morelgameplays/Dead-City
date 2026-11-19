/* ZUMBI ESCALADOR — sobe pelas paredes, anda de ponta-cabeça no teto e se joga em cima dos jogadores (casas e prédios).
   Atlas próprio: assets/z/hclimb.webp. Quadros: 0-6 correr · 7-11 bote/mergulho (9-11 no ar) · 12-16 ataque agachado · 17-20 rastejar curvado · 21-23 queda/morte
   Modos (z.cm):  0 teto (patrulha/persegue/prepara o bote) · 1 subindo a parede · 2 chão (corre e ataca) · 3 bote no ar (causa dano) · 4 queda
   Só o host/solo simula (climberUpdate); os clientes recebem x, y, cm e wd (ver multiplayer.js) e apenas desenham. */
SPR_META.hc={src:'assets/z/hclimb.webp',w:1024,h:435};
HZF.trepa=[[2,2,104,126,52.0],[108,2,112,124,56.0],[222,2,112,123,56.0],[336,2,126,120,63.0],[464,2,122,123,61.0],[588,2,114,120,57.0],[704,2,95,118,47.5],[801,2,142,97,71.0],[2,130,160,94,80.0],[164,130,174,76,87.0],[340,130,192,82,96.0],[534,130,210,84,105.0],[746,130,134,102,67.0],[882,130,132,94,66.0],[2,234,156,104,78.0],[160,234,148,104,74.0],[310,234,209,127,104.5],[521,234,90,96,45.0],[613,234,78,90,39.0],[693,234,120,78,60.0],[815,234,132,68,66.0],[2,363,144,70,72.0],[148,363,116,48,58.0],[266,363,140,41,70.0]];
const CL_CEIL=CEILB+9;     /* y onde os pés ficam colados no teto */
const CL_G=1800;           /* gravidade do bote/queda */
ZT.zclimb={a:'trepa',im:'hc',climb:1,
  pa:[17,18,19,20],ch:[0,1,2,3,4,5,6],at:[12,13,14,15,16],dy:[21,22,23],lg:[9,10,11],
  fps:6,cfps:15,s:.92,hw:30,h:108,hp:4,spd:120,reach:62,dmg:1,atT:.32,cdn:.8,dash:240,life:7,blood:'#b3121c',
  cspd:60,       /* patrulha no teto (px/s); perseguindo anda 2.6x mais rápido */
  rx:420,rx2:700,/* alcance horizontal de detecção (novo / já perseguindo) */
  pdist:170,     /* distância horizontal em que arma o bote */
  wu:.3,         /* tempo agachado no teto antes de pular */
  wspd:150,      /* velocidade de subida na parede */
  ftime:5.5};    /* tempo no chão antes de voltar para o teto */

function climberInit(z){
  if(!ZT[z.k].climb)return;
  z.cm=0;z.cmT=0;z.y=CL_CEIL;z.wd=1;z.d=z.id%2?1:-1;z.gw=0;z.fl=0;z.lost=0;z.hitP=0;z.vx=0;z.vy=0;
}
function climberSpawnFix(L){L.forEach(climberInit);return L}
function cmSet(z,m){z.cm=m;z.cmT=S.T}

/* alvo: jogador vivo da mesma zona mais próximo na horizontal (no teto não importa a altura) */
function climberTarget(z,T){
  const RX=z.ag?T.rx2:T.rx;let best=null,bd=1e9;
  for(const id in S.players){const p=S.players[id];if(p.dead||(p.z||'c')!=z.zn)continue;
    const dx=Math.abs(p.x-z.x);if(dx>RX||dx>=bd)continue;bd=dx;best=p}
  return best;
}
/* parede mais próxima: bordas da zona e divisões entre os cômodos */
function climberPickWall(z){
  const Zn=ZN[z.zn],xs=[4];for(const r of Zn.rooms)xs.push(r.x+r.w);xs[xs.length-1]=Zn.W-4;
  let bx=xs[0],bd=1e9;for(const x of xs){const d=Math.abs(x-z.x);if(d<bd){bd=d;bx=x}}
  z.wx=bx;z.wd=bx>=z.x?1:-1;z.gw=1;
}
function climberClamp(z){const W=ZN[z.zn].W;z.x=Math.max(22,Math.min(W-22,z.x))}

function climberHit(z,dir){ /* levou tiro no teto/parede: despenca */
  const T=ZT[z.k];z.ag=1;z.gw=0;z.fl=0;
  if(z.cm===0){z.y+=T.h*.45;cmSet(z,4);z.vx=dir*110;z.vy=-80}
  else if(z.cm===1){z.x-=z.wd*T.h*.45;cmSet(z,4);z.vx=-z.wd*90;z.vy=-60}
}
function climberDead(z,dt){ /* morto fora do chão: cai e só então começa a animação de morte */
  const T=ZT[z.k];if(z.cm===2)return;
  if(z.cm===0){z.y+=T.h*.45;cmSet(z,4);z.vx=0;z.vy=-40}
  else if(z.cm===1){z.x-=z.wd*T.h*.45;cmSet(z,4);z.vx=-z.wd*60;z.vy=-40}
  else if(z.cm===3)cmSet(z,4);
  z.vy+=CL_G*dt;z.y+=z.vy*dt;z.x+=z.vx*dt;z.vx*=.97;climberClamp(z);
  if(z.y>=GY-40){z.y=GY;cmSet(z,2);z.dead=0}
}

function climberUpdate(z,T,dt){
  const m=z.cm;
  if(m===2){ /* ---------- chão ---------- */
    if(z.st==2){z.hurt-=dt;z.x=Math.max(20,Math.min(ZN[z.zn].W-30,z.x+z.kb*dt));z.kb*=.88;if(z.hurt<=0)setZ(z,0);return}
    if(z.st==1){z.at-=dt;z.x+=z.d*(T.dash||0)*dt;climberClamp(z);
      if(z.at<=0){
        for(const id in S.players){const p=S.players[id];
          if(!p.dead&&(p.z||'c')==z.zn&&Math.abs(p.x-z.x)<=T.reach+16&&Math.abs(p.y-z.y)<90)damagePlayer(+id,T.dmg,z.x)}
        z.cd=T.cdn;setZ(z,0)}
      return}
    const tg=climberTarget(z,T);z.ag=tg?1:0;z.fl+=dt;
    if(tg)z.lost=0;else z.lost+=dt;
    if(!z.gw&&(z.fl>T.ftime||z.lost>1.5))climberPickWall(z);
    if(tg){const dx=tg.x-z.x;
      if(Math.abs(dx)<=T.reach&&Math.abs(tg.y-z.y)<90&&z.cd<=0){z.d=dx>=0?1:-1;setZ(z,1);z.at=T.atT;return}
      if(!z.gw){z.d=dx>=0?1:-1;if(Math.abs(dx)>T.reach*.7)z.x+=z.d*T.spd*1.6*dt;climberClamp(z);return}}
    if(z.gw){ /* corre até a parede e começa a subir */
      z.d=z.wd;z.x+=z.wd*T.spd*1.6*dt;
      if(Math.abs(z.x-z.wx)<=12){z.x=z.wx;z.y=GY-60;cmSet(z,1);z.gw=0;z.fl=0}}
    return}
  if(m===1){ /* ---------- subindo a parede ---------- */
    z.y-=T.wspd*dt;
    if(z.y<=CL_CEIL+60){z.x=z.wx-z.wd*36;z.y=CL_CEIL;z.d=-z.wd;z.cd=.6;cmSet(z,0);climberClamp(z)}
    return}
  if(m===0){ /* ---------- teto ---------- */
    if(z.st==1){ /* agachado: prepara o bote */
      z.at-=dt;
      if(z.at<=0){
        const tg=climberTarget(z,T);
        if(!tg){setZ(z,0);z.cd=1;return}
        const tf0=.4,tx=tg.x+(tg.vx||0)*tf0*.5,ty=tg.y-50;
        z.y+=T.h*.45;
        const dist=Math.hypot(tx-z.x,ty-z.y),tf=Math.max(.3,Math.min(.55,dist/620));
        z.vx=(tx-z.x)/tf;z.vy=(ty-z.y)/tf-.5*CL_G*tf;z.d=z.vx>=0?1:-1;z.hitP=0;
        setZ(z,0);cmSet(z,3)}
      return}
    if(z.st==2){z.hurt-=dt;if(z.hurt<=0)setZ(z,0);return}
    const tg=climberTarget(z,T);z.ag=tg?1:0;
    if(tg){const dx=tg.x-z.x;z.d=dx>=0?1:-1;
      if(Math.abs(dx)<=T.pdist&&z.cd<=0){setZ(z,1);z.at=T.wu;return}
      z.x+=z.d*T.cspd*2.6*dt;
    }else{
      if(z.x>z.x1+4||z.x<z.x0-4){z.d=z.x>z.x1?-1:1;z.x+=z.d*T.cspd*dt}
      else{z.x+=z.d*T.cspd*dt;if(z.x>z.x1){z.x=z.x1;z.d=-1}else if(z.x<z.x0){z.x=z.x0;z.d=1}}
    }
    climberClamp(z);return}
  /* ---------- no ar: 3 = bote · 4 = queda ---------- */
  z.hurt-=dt;if(z.st==2&&z.hurt<=0)setZ(z,0);
  z.vy+=CL_G*dt;z.x+=z.vx*dt;z.y+=z.vy*dt;climberClamp(z);
  if(z.y<CL_CEIL+30&&z.vy<0){z.y=CL_CEIL+30;z.vy=0}
  if(m===3&&!z.hitP){
    for(const id in S.players){const p=S.players[id];
      if(p.dead||(p.z||'c')!=z.zn)continue;
      if(Math.abs(p.x-z.x)<44&&Math.abs((p.y-48)-z.y)<58){damagePlayer(+id,T.dmg,z.x);z.hitP=1;z.vx*=-.25;z.vy=-260;break}}}
  if(z.y>=GY-40&&z.vy>0){
    z.y=GY;z.vx=0;z.vy=0;cmSet(z,2);z.fl=0;z.lost=0;
    if(m===4){setZ(z,2);z.hurt=.45;z.kb=0}else{z.cd=T.cdn;if(z.st==2&&z.hurt<=0)setZ(z,0)}}
}

/* caixa de acerto em coordenadas do mundo (tiros e golpes) */
function zHit(z,T,x,y){
  const m=z.cm;
  if(!T.climb||m===2||m===undefined){const B=zBox(z,T);return Math.abs(x-z.x)<B[0]+4&&y>z.y-B[1]&&y<z.y+4}
  if(m===0)return Math.abs(x-z.x)<T.hw+8&&y>z.y-4&&y<z.y+T.h;
  if(m===1){const a=z.x,b=z.x-z.wd*T.h*.95;return x>Math.min(a,b)-4&&x<Math.max(a,b)+4&&Math.abs(y-z.y)<58}
  return Math.hypot(x-z.x,(y-z.y)*1.1)<T.hw+14;
}

/* rede (clientes): posição vertical, modo e lado da parede vindos do host */
function climberNet(z,y,cm,wd){
  z.sy=y;z.wd=wd||1;
  if(cm!==z.cm){if(cm===2&&z.st==3)z.dead=0;z.cm=cm;z.cmT=S.T}
}
function climberClientSmooth(z,dt){if(z.sy!==undefined)z.y+=(z.sy-z.y)*Math.min(1,dt*14)}

/* ---------- desenho ---------- */
function drawClimber(z,T){
  const m=z.cm||0,sx=z.x-cam;
  if(sx<-270||sx>VWW+270)return;
  const im=IMG[T.im];if(!im||!im.complete)return;
  if(m===2){if(IMG.hz&&IMG.hz.complete)drawHZombie(z,T,sx);return}
  const dead=z.st==3,now=S.T;
  if(z.lx===undefined){z.lx=z.x;z.ly=z.y;z.lt=now;z.vx2=0;z.vy2=0}
  else if(now>z.lt){const dd=now-z.lt;
    if(dd>.25){z.vx2=0;z.vy2=0}else{z.vx2+=((z.x-z.lx)/dd-z.vx2)*Math.min(1,dd*14);z.vy2+=((z.y-z.ly)/dd-z.vy2)*Math.min(1,dd*14)}
    z.lx=z.x;z.ly=z.y;z.lt=now}
  const ct=now-(z.cmT||0);
  let fi;
  if(dead)fi=21;
  else if(m===0){
    if(z.st==1)fi=T.at[Math.floor(z.stT*14)%2?1:2];
    else if(z.st==2)fi=T.pa[1];
    else if(Math.abs(z.vx2)>T.cspd*1.6)fi=T.ch[Math.floor(z.t*T.cfps)%T.ch.length];
    else if(Math.abs(z.vx2)>6)fi=T.pa[Math.floor(z.t*T.fps)%T.pa.length];
    else fi=T.pa[0];
  }
  else if(m===1)fi=T.ch[Math.floor(z.t*T.cfps)%T.ch.length];
  else if(m===3)fi=T.lg[Math.min(T.lg.length-1,Math.floor(ct/.1))];
  else fi=T.pa[2];
  const f=HZF.trepa[fi],s=T.s,w=f[2]*s,h=f[3]*s,ax=f[4]*s;
  let dx0,dy0;
  c.save();c.translate(sx,z.y);
  if(m===0){c.scale(z.d<0?-1:1,-1);dx0=-ax;dy0=-h}                 /* de ponta-cabeça: pés no teto */
  else if(m===1){c.scale(z.wd,1);c.rotate(-Math.PI/2);dx0=-ax;dy0=-h}  /* colado na parede, cabeça para cima */
  else{
    const fd=Math.abs(z.vx2)>20?(z.vx2>=0?1:-1):(z.d<0?-1:1);
    c.scale(fd,1);
    c.rotate(m===3?Math.atan2(z.vy2,Math.max(80,Math.abs(z.vx2)))*.9:ct*(dead?5:7));
    dx0=-w/2;dy0=-h/2}
  c.drawImage(im,f[0],f[1],f[2],f[3],dx0,dy0,w,h);
  if(!dead){
    if(z.st==2){c.globalAlpha=.7;c.drawImage(hzTintFrame(T,fi,'#fff'),dx0,dy0,w,h)}
    else if(z.st==1){c.globalAlpha=.25+.3*Math.sin(z.stT*30);c.drawImage(hzTintFrame(T,fi,'#f22'),dx0,dy0,w,h)}}
  c.restore();
  { /* sombrinha no chão: avisa onde ele está acima do jogador */
    const hh=Math.max(0,Math.min(1,(GY-z.y)/240));
    c.save();c.globalAlpha=.28*(1-hh*.4);c.fillStyle='#000';c.beginPath();c.ellipse(sx-(m===1?z.wd*T.h*.5:0),GY+4,(m===1?T.h*.5:w*.3)*(1-hh*.3),5,0,0,7);c.fill();c.restore()}
  if(z.hp<z.mhp&&!dead){
    const bw=42,by=m===0?z.y+T.h+8:z.y-(m===1?64:52),bx=sx-(m===1?z.wd*T.h*.5:0);
    c.fillStyle='rgba(0,0,0,.6)';c.fillRect(bx-bw/2,by,bw,5);
    c.fillStyle='#e33';c.fillRect(bx-bw/2+1,by+1,(bw-2)*Math.max(0,z.hp/z.mhp),3)}
}
