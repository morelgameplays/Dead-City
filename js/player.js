/* Jogador: movimento, física, animação (sprites do herói com arma da Fase 7), vida e coleta. */
const MAXHP=5;
/* FOME E SEDE — ajuste o ritmo aqui. foodMin/waterMin = minutos para ir de 100% a 0%. Com 0%, perde 1 de vida a cada starveSec s. */
const NEED={foodMin:12,waterMin:8,starveSec:15,killer:false,warn:25}; /* killer:false = a fome/sede nunca mata (para em 1 de vida) */
function needsUpdate(p,dt){
  p.food=Math.max(0,p.food-dt*100/(NEED.foodMin*60));p.water=Math.max(0,p.water-dt*100/(NEED.waterMin*60));
  if(p.food<NEED.warn&&!p._wf){p._wf=1;toast('Você está com fome','#ffb86b')}else if(p.food>=NEED.warn)p._wf=0;
  if(p.water<NEED.warn&&!p._ww){p._ww=1;toast('Você está com sede','#7fc8ff')}else if(p.water>=NEED.warn)p._ww=0;
  if(p.food>0&&p.water>0){p.sd=0;return}
  p.sd=(p.sd||0)+dt;if(p.sd<NEED.starveSec)return;p.sd=0;
  if(p.hp>(NEED.killer?0:1)){p.hp--;S.flash=.18;toast(p.water<=0?'A sede está te matando!':'A fome está te matando!','#ff6b6b');
    if(p.hp<=0){p.hp=0;p.dead=1;p.deadT=3.5}}
}
let jPrev=0,uPrev=0;
function newPlayer(id,name,ch){
  const sx=MAP.start[id%4];
  return {id,name,ch,x:sx,y:GY,vx:0,vy:0,face:1,on:1,hp:MAXHP,eq:null,food:100,water:100,sd:0,ammo:40,z:'c',nd:null,aim:0,ax:1,ay:0,ae:0,mv:0,rt:0,la:0,crouch:0,dead:0,deadT:0,inv:0,t:0,cd:0,flash:0,fk:'i',kl:0,kb:0,tx:sx,ty:GY};
}
/* direção da mira por elevação (graus): 0 frente · 1 diagonal p/ cima · 2 cima · 3 baixo */
function aimDir(e){return e>=67.5?2:e>=22.5?1:e<=-40?3:0}
function pickFrame(p){
  const a=aimDir(p.ae||0);
  if(!p.on){if(a==1)return 'jd';if(a==2)return 'ju';if(a==3)return 'jw';return p.vy<-250?'u':p.vy>250?'f':'a'}
  if(p.crouch){if(a==1)return 'cd';if(a==2)return 'cu';if(a==3)return 'cw';return Math.abs(p.vx)>1&&Math.floor(p.t*8)%2?'c1':'c0'}
  if(Math.abs(p.vx)>10){const i=Math.floor(p.rt)%4;
    if(a==1)return Math.floor(p.rt/2)%2?'rB':'rA';if(a==2)return 'su';if(a==3)return 'sw';return 'r'+i}
  return a==1?'sd':a==2?'su':a==3?'sw':'i';
}
const DEADZ=.2,RUNSPD=290;
function updMe(p,dt){
  p.t+=dt;p.cd-=dt;p.flash-=dt;if(p.inv>0)p.inv-=dt;
  if(p.dead){p.deadT-=dt;if(p.deadT<=0)respawn(p);return}
  if(S.mode=='play')needsUpdate(p,dt);
  /* movimento: analógico (toque) > analógico/direcional (controle) > teclado */
  const ax=Math.abs(STICK.x)>.01?STICK.x:(Math.abs(PADIN.x)>.01?PADIN.x:(K.r-K.l));
  const ay=(Math.abs(STICK.x)>.01||STICK.y>.01)?STICK.y:PADIN.y;
  const dir=Math.abs(ax)>DEADZ?Math.sign(ax):0,mag=dir?Math.min(1,(Math.abs(ax)-DEADZ)/(1-DEADZ)):0;
  const dn=K.d||PADIN.d||(ay>.55&&Math.abs(ax)<.6);
  p.crouch=(dn&&p.on)?1:0;
  /* mira: 360° por toque/controle; sem isso, mira do teclado (frente / diagonal / cima) */
  let vx,vy;
  if(AIM.on){vx=AIM.ax;vy=AIM.ay;if(Math.abs(vx)>.2)p.face=vx>0?1:-1;else if(dir)p.face=dir}
  else{
    if(dir)p.face=dir;const f=p.face;
    if(!p.crouch&&(K.u||PADIN.u)){vx=dir?f*.7:0;vy=dir?-.7:-1}
    else if(!p.crouch&&K.d&&!p.on){vx=f*.7;vy=.7}
    else{vx=f;vy=0}
  }
  const n=Math.hypot(vx,vy)||1;p.ax=vx/n;p.ay=vy/n;p.ae=Math.atan2(-p.ay,Math.abs(p.ax))*57.2958;
  const kb=p.kb;p.kb*=Math.pow(.02,dt);
  /* velocidade com aceleração suave (antes era instantânea) e mínimo de 50% como no Super Irmãos */
  const want=p.crouch?0:dir*RUNSPD*(.5+.5*mag),acc=(want==0?4200:3400)*dt;
  p.mv+=Math.max(-acc,Math.min(acc,want-p.mv));
  p.vx=p.mv+kb;
  /* ciclo de corrida sincronizado com a velocidade (sem "deslizar" os pés) e sempre começando no quadro r0 */
  const sp=Math.abs(p.vx);
  if(p.on&&!p.crouch&&sp>10)p.rt+=dt*8*Math.max(.6,Math.min(1.3,sp/RUNSPD));else if(sp<=10)p.rt=0;
  /* porta/escada mais próxima: botão E, 🚪 ou X no controle */
  p.nd=nearDoor(p);p.nf=nearFurn(p);
  if(p.nd&&p.nf){if(Math.abs(p.x-p.nf.x)<Math.abs(p.x-p.nd.x))p.nd=null;else p.nf=null} /* o mais perto ganha o botão */
  const un=K.e||PADIN.use;if(un&&!uPrev&&p.on){if(p.nf)startSearch(p,p.nf);else if(p.nd)useDoor(p,p.nd)}uPrev=un;
  updSearch(p,dt);
  const jn=K.j||PADIN.jump;
  if(jn&&!jPrev&&p.on){p.vy=-760;p.on=0}
  jPrev=jn;
  const Zn=ZN[p.z||'c'];
  const oy=p.y;p.vy+=1900*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.on=0;
  if(p.y>=GY){p.y=GY;p.vy=0;p.on=1}
  else if(p.vy>=0)for(const q of Zn.plats){
    if(p.x>q.x-8&&p.x<q.x+q.w+8&&oy<=q.y+2&&p.y>=q.y){p.y=q.y;p.vy=0;p.on=1;break}}
  if(Zn.id!='c'&&p.y<CEIL){p.y=CEIL;if(p.vy<0)p.vy=0} /* teto do cômodo */
  p.x=Math.max(20,Math.min(Zn.W-20,p.x));
  p.fk=pickFrame(p);
  /* tiro enquanto o dedo está na área de mira (toque) ou o analógico direito está inclinado (controle) · RT/R2 e J também atiram, só enquanto pressionados */
  if(p.eq&&!BAG.slots.includes(p.eq))p.eq=null; /* a arma equipada saiu da mochila (quebrou) */
  if((K.f||PADIN.fire||AIM.on)&&p.cd<=0){if(p.eq)meleeSwing(p);else if(p.ammo>0)fireWeapon(p);else{p.cd=.3;sfxClick()}}
  checkPickups(p);
}
function updRemote(p,dt){const f=Math.min(1,dt*14);p.x+=(p.tx-p.x)*f;p.y+=(p.ty-p.y)*f}
function checkPickups(p){
  MAP.pick.forEach((k,i)=>{
    if(S.taken[i]||(k.zn||'c')!=(p.z||'c')||Math.abs(p.x-k.x)>30||Math.abs(p.y-k.y)>60)return;
    if(k.t=='ammo'){S.taken[i]=1;p.ammo=Math.min(WEAPONS.pistol.ammoMax,p.ammo+15);burst(k.x,k.y-20,'#ffd34a',8,p.z);netPickup(i)}
    else if(ITEMS[k.t])lootTake('s',i,k.t); /* kit médico, comida etc. vão para a mochila (mesmo com a vida cheia) */
  });
  bagCheckDrops(p);
}
function hurtMe(d,fromX){
  const p=S.players[S.myId];if(!p||p.dead||p.inv>0)return;
  p.sr=null; /* levar dano interrompe a busca */
  p.hp-=d;sfxHurt(p.hp<=0);p.inv=1;S.flash=.3;p.kb=(p.x>=fromX?1:-1)*260;p.vy=-260;p.on=0;burst(p.x,p.y-60,'#d22',8,p.z);
  if(p.hp<=0){p.hp=0;p.dead=1;p.deadT=3.5}
}
function respawn(p){
  p.food=Math.max(p.food,60);p.water=Math.max(p.water,60);p.sd=0;p.dead=0;p.hp=MAXHP;p.inv=2;p.ammo=Math.max(p.ammo,25);p.x=MAP.start[p.id%4];p.y=GY;p.vx=p.vy=0;p.mv=0;p.rt=0;p.kb=0;p.z='c';p.nd=null;p.on=1;if(p.id==S.myId)S.snap=1;
}
function drawPlayer(p,mine,noName){
  const k=p.ch+'.'+p.fk,m=SPR_META[k],im=IMG[k];if(!m||!im)return;
  const sx=p.x-cam;
  c.save();c.translate(sx,p.y);
  if(p.dead){c.rotate(p.face*1.45);c.globalAlpha=.5}
  else if(p.inv>0&&Math.floor(p.inv*14)%2)c.globalAlpha=.4;
  const br=p.fk=='i'?1+Math.sin(S.T*7+p.id)*.008:1;
  if(p.on&&!p.crouch&&Math.abs(p.vx)>10&&/^(su|sw|rA|rB)$/.test(p.fk))c.translate(0,-Math.abs(Math.sin(p.rt*Math.PI/1.5))*5); /* mira em movimento: passinho */
  c.scale(p.face*br,br);
  c.drawImage(im,-m.ax*GS,-m.ay*GS,m.w*GS,m.h*GS);
  if(p.flash>0&&!p.dead){ /* clarão do disparo da Glock */
    const fx=m.mx*GS+3,fy=m.my*GS,q=Math.min(1,p.flash/.07),L=14+8*q;
    c.save();c.translate(fx,fy);c.rotate(Math.atan2(p.ay,Math.abs(p.ax))); c.globalAlpha=1;
    c.fillStyle='#fff3b0';c.beginPath();c.moveTo(-2,0);c.lineTo(L*.45,-5);c.lineTo(L,0);c.lineTo(L*.45,5);c.closePath();c.fill();
    c.fillStyle='#ff9d2e';c.globalAlpha=.85;c.beginPath();c.moveTo(0,0);c.lineTo(L*.3,-9*q);c.lineTo(L*.55,0);c.lineTo(L*.3,9*q);c.closePath();c.fill();
    c.restore()}
  c.restore();
  if(noName)return;
  c.font='bold 13px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='rgba(0,0,0,.8)';
  c.strokeText(p.name,sx,p.y-m.h*GS-10);c.fillStyle=mine?'#ffe27a':'#9fe7ff';c.fillText(p.name,sx,p.y-m.h*GS-10);
}
