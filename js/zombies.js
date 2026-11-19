/* Zumbis: tipos (sprites da Fase 6) e IA. A IA roda só no host/solo; os outros jogadores recebem o estado. */
const ZT={
  z1:{fr:['za0','za1','za2','za3'],fps:8,s:1.2,hw:24,h:114,hp:3,spd:70,reach:46,dmg:1},
  z2:{fr:['zb0','zb1','zb2','zb1'],fps:7,s:1.2,hw:24,h:112,hp:3,spd:80,reach:46,dmg:1},
  z3:{fr:['zc0','zc1','zc2','zc3'],fps:8,s:1.2,hw:24,h:116,hp:4,spd:62,reach:46,dmg:1},
  z4:{fr:['zd0','zd1','zd2','zd3'],fps:8,s:1.2,hw:24,h:122,hp:3,spd:90,reach:46,dmg:1},
  zdog:{fr:['ze0','ze1'],fps:9,s:1.15,hw:52,h:78,hp:2,spd:150,reach:72,dmg:1},
  zfat:{fr:['zf0','zf1'],fps:3.5,s:.95,hw:38,h:110,hp:10,spd:40,reach:62,dmg:2}
};
/* Zumbis do hospital (atlas HZF). a=linha do atlas · pa=andando · ch=perseguindo · at=ataque · dy=morte (quadros) · s=escala · pool=poça de sangue */
Object.assign(ZT,{
  hcomum:{a:'comum',pa:[0,1,2,3],ch:[7,8,9,10],at:[11,12],dy:[13,14],fps:6,cfps:11,s:1.15,hw:24,h:116,hp:3,spd:68,reach:48,dmg:1,blood:'#b3121c'},
  hfem:  {a:'fem',  pa:[0,1,2,3],ch:[6,7,8,9], at:[10,11],dy:[12,13],fps:6,cfps:11,s:1.08,hw:24,h:118,hp:3,spd:76,reach:48,dmg:1,blood:'#b3121c'},
  hmed:  {a:'medico',pa:[0,1,2,3],ch:[7,8,9,10],at:[10,11],dy:[12,14,15],fps:6,cfps:11,s:1.1,hw:25,h:120,hp:4,spd:64,reach:50,dmg:1,blood:'#b3121c'},
  henf:  {a:'enf',  pa:[2,3,4,5],ch:[6,7,8,9], at:[10,11],dy:[12,13,14],fps:7,cfps:12,s:1.18,hw:23,h:116,hp:3,spd:84,reach:46,dmg:1,blood:'#b3121c'},
  hgordo:{a:'gordo',pa:[0,1,2,3],ch:[6,7,8,9], at:[10,10],dy:[11,12,13],fps:4,cfps:7,s:1.0,hw:36,h:120,hp:10,spd:42,reach:62,dmg:2,blood:'#8d0f17'},
  hmut:  {a:'mut',  pa:[0,1,2,3],ch:[4,6,7,8], at:[5,5],dy:[9,10,11],fps:5,cfps:9,s:1.08,hw:38,h:128,hp:14,spd:56,reach:72,dmg:2,blood:'#8d0f17'},
  hrun:  {a:'esp',  pa:[0,1,2],ch:[0,1,2],at:[1,1],dy:[],fps:10,cfps:14,s:.92,hw:30,h:118,hp:2,spd:135,reach:54,dmg:1,blood:'#b3121c'},
  hhaz:  {a:'esp',  pa:[3,4],ch:[3,4],at:[5,5],dy:[],fps:4,cfps:6,s:.85,hw:30,h:122,hp:7,spd:50,reach:56,dmg:1,blood:'#d9b300'},
  hmil:  {a:'esp',  pa:[6,7,8,9],ch:[6,7,8,9],at:[8,8],dy:[],fps:5,cfps:8,s:.9,hw:26,h:124,hp:6,spd:72,reach:50,dmg:2,blood:'#b3121c'},
  /* BEBÊ ZUMBI: engatinha (patrulha) → avista o jogador → levanta (riseT s) → corre e ataca.
     Hitbox BAIXA: hc/hwc = engatinhando · h/hw = em pé correndo. Tiro reto de pé (~63px) passa por cima; engatinhando, até o agachado (~47-51px) passa: tem que mirar para baixo. */
  hbaby: {a:'bebe',baby:1,im:'hb',pa:[0,1,2,1],rise:[2,3,4,5,7,8],ch:[9,10,11,12,13,14,15,16],at:[17,18],st:[20],dy:[22,24,25,26],fps:5,cfps:14,s:.68,
          hwc:36,hc:36,hw:29,h:56,hp:2,spd:125,pspd:30,reach:40,dmg:1,riseT:.7,blood:'#b3121c'},
  /* CORREDOR FURIOSO (casa): detecta de longe, nunca solta o jogador, parte para cima com uma investida (pounce) e ataca de novo logo em seguida.
     atT = tempo do bote · cdn = pausa entre botes · pounce = distância em que ele salta · dash = velocidade do salto · rx/rx2 = alcance de detecção (novo / já perseguindo) */
  zrun:  {a:'corre',im:'hr',pa:[17,18],ch:[0,1,2,3,4,5,6],at:[12,14,16],dy:[18,21,23],fps:6,cfps:17,s:1.12,hw:28,h:112,hp:3,spd:155,reach:60,dmg:1,
          atT:.28,cdn:.55,pounce:150,dash:470,lunge:0,rx:600,rx2:1000,blood:'#b3121c'}
});
for(const k in ZT)if(ZT[k].a)ZT[k].life=7; /* quanto tempo o corpo fica no chão (s) */
/* caixa de acerto atual [meia-largura, altura]: o bebê é baixinho e cresce enquanto levanta */
function zBox(z,T){
  if(!T.baby)return [T.hw,T.h];
  const bm=z.bm||0,u=bm==0?0:bm==1?Math.min(1,(z.bt||0)/T.riseT):1;
  return [T.hwc+(T.hw-T.hwc)*u,T.hc+(T.h-T.hc)*u];
}
function setBM(z,m){z.bm=m;z.bt=0;z.lost=0;if(m==1)sfxZState(z,1)} /* 0 engatinha · 1 levantando · 2 correndo */
function babyAI(z,T,tg,dt){
  const bm=z.bm||0;
  if(tg){
    z.lost=0;const dx=tg.x-z.x;z.d=dx>=0?1:-1;
    if(bm==0){setBM(z,1);return}                                    /* avistou: começa a levantar */
    if(bm==1){if(z.bt>=T.riseT)setBM(z,2);else z.x+=z.d*T.pspd*1.5*dt;return}
    if(Math.abs(dx)<=T.reach&&Math.abs(tg.y-z.y)<90&&z.cd<=0){setZ(z,1);z.at=.4}
    else if(Math.abs(dx)>T.reach*.7)z.x+=z.d*T.spd*1.6*dt;           /* corre */
    return}
  if(bm){z.lost+=dt;if(z.lost>3)setBM(z,0);return}                  /* perdeu o jogador: ofega e volta a engatinhar */
  if(z.x>z.x1+4||z.x<z.x0-4){z.d=z.x>z.x1?-1:1;z.x+=z.d*T.pspd*dt}
  else{z.x+=z.d*T.pspd*dt;if(z.x>z.x1){z.x=z.x1;z.d=-1}else if(z.x<z.x0){z.x=z.x0;z.d=1}}
}
/* estados: 0 andando/parado · 1 atacando · 2 ferido · 3 morto */
function spawnZombies(){
  return climberSpawnFix(MAP.zs.map(([k,x0,x1,zn],i)=>({id:i,k,zn:zn||'c',x:(x0+x1)/2,sx:(x0+x1)/2,y:GY,d:1,hp:ZT[k].hp,mhp:ZT[k].hp,st:0,stT:0,
    t:Math.random()*5,at:0,cd:0,hurt:0,kb:0,dead:0,x0,x1})));
}
function nearestTarget(z){
  const TT=ZT[z.k],RX=z.ag?(TT.rx2||640):(TT.rx||420),RY=z.ag?280:200; /* quem já está perseguindo tem alcance maior (não larga o jogador de repente) */
  let best=null,bd=1e9;
  for(const id in S.players){const p=S.players[id];if(p.dead)continue;
    if((p.z||'c')!=z.zn)continue;
    const dx=p.x-z.x,dy=p.y-z.y;if(Math.abs(dx)>RX||Math.abs(dy)>RY)continue;
    if(Math.abs(dx)<bd){bd=Math.abs(dx);best=p}}
  return best;
}
function updZombies(dt){ /* só autoridade */
  const act=new Set(S.mode=='menu'?['c']:Object.values(S.players).map(p=>p.z||'c')); /* só simula zonas com jogador dentro */
  for(const z of S.Z){
    z.t+=dt;z.stT+=dt;z.bt=(z.bt||0)+dt;
    if(z.st==3){z.dead+=dt;if(ZT[z.k].climb)climberDead(z,dt);continue}
    if(!act.has(z.zn))continue;
    const T=ZT[z.k];z.cd-=dt;
    if(T.climb){climberUpdate(z,T,dt);continue} /* escalador: teto/parede/bote (js/climber.js) */
    if(z.st==2){z.hurt-=dt;z.x=Math.max(20,Math.min(ZN[z.zn].W-30,z.x+z.kb*dt));z.kb*=.88;
      if(z.hurt<=0)setZ(z,0);continue}
    if(z.st==1){z.at-=dt;if(T.dash)z.x+=z.d*T.dash*dt; /* investida */
      if(z.at<=0){
        for(const id in S.players){const p=S.players[id];
          if(!p.dead&&(p.z||'c')==z.zn&&Math.abs(p.x-z.x)<=T.reach+16&&Math.abs(p.y-z.y)<90)damagePlayer(+id,T.dmg,z.x)}
        z.cd=T.cdn||1.1;setZ(z,0)}
      continue}
    const tg=nearestTarget(z);z.ag=tg?1:0;
    if(T.baby){babyAI(z,T,tg,dt);continue}
    if(tg){const dx=tg.x-z.x;z.d=dx>=0?1:-1;
      if(Math.abs(dx)<=(T.pounce||T.reach)&&Math.abs(tg.y-z.y)<90&&z.cd<=0){setZ(z,1);z.at=T.atT||.4}
      else if(Math.abs(dx)>T.reach*.7)z.x+=z.d*T.spd*1.6*dt;
    }else if(z.x>z.x1+4||z.x<z.x0-4){
      /* perdeu o jogador longe da área de patrulha: volta andando (antes era teleportado de volta ao ponto de origem) */
      z.d=z.x>z.x1?-1:1;z.x+=z.d*T.spd*.8*dt;
    }else{
      z.x+=z.d*T.spd*.5*dt;
      if(z.x>z.x1){z.x=z.x1;z.d=-1}else if(z.x<z.x0){z.x=z.x0;z.d=1}
    }
  }
}
function setZ(z,st){z.st=st;z.stT=0;sfxZState(z,st)}
function hurtZombie(z,dmg,dir,shooterId){
  if(z.st==3)return;
  if(ZT[z.k].climb)climberHit(z,dir); /* no teto/parede: cai com o tiro */
  z.hp-=dmg;z.hurt=.16;z.kb=dir*170;z.at=0;
  if(z.hp>0)setZ(z,2);
  else{setZ(z,3);z.dead=0;const p=S.players[shooterId];if(p)p.kl++;lootFromZombie(z)}
}
function clientZombieAnim(dt){ /* nos clientes: só animação e suavização do que o host mandou */
  for(const z of S.Z){z.t+=dt;z.stT+=dt;z.bt=(z.bt||0)+dt;if(z.st==3)z.dead+=dt;z.x+=(z.sx-z.x)*Math.min(1,dt*12);if(ZT[z.k].climb)climberClientSmooth(z,dt)}
}
function tintImg(k,col){
  const key=k+col;if(TINT[key])return TINT[key];
  const im=IMG[k],cv2=document.createElement('canvas');cv2.width=im.naturalWidth;cv2.height=im.naturalHeight;
  const x=cv2.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.fillStyle=col;x.fillRect(0,0,cv2.width,cv2.height);
  return TINT[key]=cv2;
}
const hzTint={};
function hzFrame(T,i){return HZF[T.a][i]}
function hzTintFrame(T,i,col){ /* cópia colorida de um quadro do atlas (flash de dano / ataque) */
  const key=T.a+i+col;if(hzTint[key])return hzTint[key];
  const f=hzFrame(T,i),cv2=document.createElement('canvas');cv2.width=f[2];cv2.height=f[3];
  const x=cv2.getContext('2d');x.drawImage(IMG[T.im||'hz'],f[0],f[1],f[2],f[3],0,0,f[2],f[3]);
  x.globalCompositeOperation='source-atop';x.fillStyle=col;x.fillRect(0,0,f[2],f[3]);
  return hzTint[key]=cv2;
}
function hzPickBaby(z,T){
  const bm=z.bm||0,v=z.vel||0;
  if(z.st==1)return T.at[Math.min(T.at.length-1,Math.floor(Math.min(.999,z.stT/.4)*T.at.length))];
  if(z.st==3){const q=bm==0?[T.dy[1],T.dy[2],T.dy[3]]:T.dy;return q[Math.min(q.length-1,Math.floor(z.dead/(.5/q.length)))]}
  if(z.st==2)return bm==0?T.pa[1]:bm==1?T.rise[2]:T.ch[1];
  if(bm==0)return v<6?T.pa[0]:T.pa[Math.floor(z.t*T.fps)%T.pa.length];
  if(bm==1){const n=T.rise.length;return T.rise[Math.min(n-1,Math.floor(Math.min(.999,(z.bt||0)/T.riseT)*n))]}
  return v<8?T.st[0]:T.ch[Math.floor(z.t*T.cfps)%T.ch.length];
}
function hzPick(z,T){ /* escolhe o quadro conforme o estado */
  if(T.baby)return hzPickBaby(z,T);
  if(z.st==1){const n=T.at.length;return T.at[Math.min(n-1,Math.floor(Math.min(.999,z.stT/(T.atT||.4))*n))]}
  if(z.st==3&&T.dy.length){const n=T.dy.length,u=z.dead;return n==1?T.dy[0]:n==2?T.dy[u<.2?0:1]:T.dy[u<.14?0:u<.4?1:2]}
  if(z.st==2)return T.pa[1%T.pa.length];
  const v=z.vel||0;
  if(v<8)return T.pa[0];                         /* parado */
  if(v>T.spd*1.0)return T.ch[Math.floor(z.t*T.cfps)%T.ch.length]; /* perseguindo */
  return T.pa[Math.floor(z.t*T.fps)%T.pa.length];                  /* patrulhando */
}
function drawHZombie(z,T,sx){
  /* velocidade suavizada (funciona igual no host e nos clientes, sem precisar de rede) */
  if(z.px===undefined){z.px=z.x;z.pt=S.T;z.vel=0}
  else if(S.T>z.pt){const dd=S.T-z.pt;if(dd>.25)z.vel=0;else z.vel+=(Math.abs(z.x-z.px)/dd-z.vel)*Math.min(1,dd*10);z.px=z.x;z.pt=S.T}
  const dead=z.st==3,life=T.life;
  if(dead&&z.dead>life)return;
  const fi=hzPick(z,T),f=hzFrame(T,fi),s=T.s,w=f[2]*s,h=f[3]*s,ax=f[4]*s;
  let fade=1;if(dead&&z.dead>life-1.5)fade=Math.max(0,(life-z.dead)/1.5);
  c.save();c.translate(sx+(z.st==1?z.d*Math.min(1,z.stT/(T.atT||.4))*10:0),z.y+4);
  c.scale(z.d<0?-1:1,1);
  /* poça de sangue sob o corpo + sombra */
  if(dead){const u=Math.min(1,Math.max(0,(z.dead-.1)/.5)),pf=HZF.esp[10];
    c.globalAlpha=fade*u;const pw=Math.max(T.baby?54:70,w*.9)*(.5+.5*u),ph=pf[3]*(pw/pf[2]);
    c.drawImage(IMG.hz,pf[0],pf[1],pf[2],pf[3],-pw/2,-ph+4,pw,ph);
    if(z.dead<.45){ /* respingo no momento da morte */
      const sp=HZF.esp[[11,12,14][z.id%3]],q=Math.min(1,z.dead/.12),sw=sp[2]*.8*(.5+q*.5),sh=sp[3]*.8*(.5+q*.5);
      c.globalAlpha=(1-z.dead/.45)*.9;c.drawImage(IMG.hz,sp[0],sp[1],sp[2],sp[3],-sw/2,-T.h*.62-sh/2,sw,sh)}
  }else{c.globalAlpha=.32;c.fillStyle='#000';c.beginPath();c.ellipse(0,0,w*.32,6,0,0,7);c.fill()}
  c.globalAlpha=fade;
  if(dead&&!T.dy.length){const u=Math.min(1,z.dead/.45);c.rotate(-u*1.5)} /* tipos sem animação de queda: tombam */
  c.drawImage(IMG[T.im||'hz'],f[0],f[1],f[2],f[3],-ax,-h,w,h);
  if(z.st==2){c.globalAlpha=.7*fade;c.drawImage(hzTintFrame(T,fi,'#fff'),-ax,-h,w,h)}
  else if(z.st==1){c.globalAlpha=.25+.3*Math.sin(z.stT*30);c.drawImage(hzTintFrame(T,fi,'#f22'),-ax,-h,w,h)}
  c.restore();
  if(z.hp<z.mhp&&!dead){const bw=T.baby?36:T.hw>30?48:38,bh=zBox(z,T)[1];c.fillStyle='rgba(0,0,0,.6)';c.fillRect(sx-bw/2,z.y-bh-14,bw,5);
    c.fillStyle='#e33';c.fillRect(sx-bw/2+1,z.y-bh-13,(bw-2)*Math.max(0,z.hp/z.mhp),3)}
}
function drawZombie(z){
  const T=ZT[z.k];if(z.zn!=curZone())return;
  if(T.climb){drawClimber(z,T);return}
  if(T.a){const sx=z.x-cam;if(sx<-170||sx>VWW+170)return;if(IMG.hz&&IMG.hz.complete&&IMG[T.im||'hz'].complete)drawHZombie(z,T,sx);return}
  if(z.st==3&&z.dead>1)return;
  const fk=T.fr[Math.floor(z.t*T.fps)%T.fr.length],m=SPR_META[fk],im=IMG[fk];if(!m||!im)return;
  const w=m.w*T.s,h=m.h*T.s,sx=z.x-cam;if(sx<-150||sx>VWW+150)return;
  c.save();c.translate(sx+(z.st==1?z.d*Math.min(1,z.stT/.4)*10:0),z.y+4);
  if(z.st==3){const u=Math.min(1,z.dead/.45);c.rotate(-z.d*u*1.5);c.globalAlpha=1-Math.max(0,z.dead-.5)*2}
  c.scale(z.d<0?-1:1,1);c.drawImage(im,-w/2,-h,w,h);
  if(z.st==2){c.globalAlpha=.7;c.drawImage(tintImg(fk,'#fff'),-w/2,-h,w,h)}
  else if(z.st==1){c.globalAlpha=.25+.3*Math.sin(z.stT*30);c.drawImage(tintImg(fk,'#f22'),-w/2,-h,w,h)}
  c.restore();
  if(z.hp<z.mhp&&z.st!=3){const bw=38;c.fillStyle='rgba(0,0,0,.6)';c.fillRect(sx-bw/2,z.y-h-12,bw,5);
    c.fillStyle='#e33';c.fillRect(sx-bw/2+1,z.y-h-11,(bw-2)*Math.max(0,z.hp/z.mhp),3)}
}
