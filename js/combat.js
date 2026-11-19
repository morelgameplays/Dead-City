/* Armas e projéteis. Estrutura pronta para novas armas (facas, espingarda, rifle…). */
const WEAPONS={
  pistol:{name:'Glock 19',dmg:1,rate:.22,speed:900,range:640,ammoMax:99}
};
function fireWeapon(p){
  const W=WEAPONS.pistol,m=SPR_META[p.ch+'.'+p.fk];if(!m)return;
  const f=p.face,A=[p.ax,p.ay];
  const x=p.x+f*m.mx*GS,y=p.y+m.my*GS;
  p.ammo--;p.cd=W.rate;p.flash=.07;sfxShot(x,p.z||'c',y,1);
  const b={x,y,vx:A[0]*W.speed,vy:A[1]*W.speed,l:W.range/W.speed,o:p.id,dmg:W.dmg,cos:!isAuth(),zn:p.z||'c'};
  S.B.push(b);
  S.FX.push({zn:p.z||'c',x:p.x+f*m.mx*GS*.4,y:y+3,vx:-f*(50+Math.random()*70),vy:-140-Math.random()*90,l:.45,c:'#e8c45a'}); /* cápsula */
  netFire(b);
}
/* golpe corpo a corpo: um "projétil" curtíssimo (alcance = reach) na direção que o jogador olha; reaproveita o dano e a rede dos tiros */
function meleeSwing(p){
  const s=p.eq,it=s&&ITEMS[s.t];if(!it||!it.melee){p.eq=null;return}
  const W=it.melee,f=p.face;p.cd=W.cd;
  const b={x:p.x+f*14,y:p.y-48,vx:f*W.reach/.1,vy:0,l:.1,o:p.id,dmg:W.dmg,cos:!isAuth(),zn:p.z||'c',m:1};
  S.B.push(b);netFire(b);
  if(--s.d<=0){const i=BAG.slots.indexOf(s);if(i>=0)BAG.slots.splice(i,1);p.eq=null;if(BAG.sel>=BAG.slots.length)BAG.sel=BAG.slots.length-1;
    toast('Seu '+it.name+' quebrou!','#ff9a9a');burst(p.x+f*30,p.y-50,'#c9a36a',12,p.z)}
  bagRender();
}
function drawReticle(){
  const p=S.players[S.myId];if(!p||p.dead||!AIM.on)return;
  const d=90+AIM.fr*210,x=p.x-cam+p.ax*d,y=p.y-55+p.ay*d;
  c.save();c.strokeStyle=p.ammo?'#ffe27a':'#ff6b6b';c.globalAlpha=.85;c.lineWidth=2;
  c.beginPath();c.arc(x,y,9,0,7);c.moveTo(x-15,y);c.lineTo(x-5,y);c.moveTo(x+5,y);c.lineTo(x+15,y);c.moveTo(x,y-15);c.lineTo(x,y-5);c.moveTo(x,y+5);c.lineTo(x,y+15);c.stroke();c.restore();
}
function updBullets(dt){
  const auth=isAuth();
  for(const b of S.B){
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.l-=dt;
    if(b.y>=GY-4||b.x<0||b.x>ZN[b.zn||'c'].W||(b.zn&&b.zn!='c'&&b.y<CEILB))b.l=0;
    if(b.l<=0)continue;
    for(const z of S.Z){
      if(z.st==3||z.zn!=(b.zn||'c'))continue;const T=ZT[z.k];
      if(zHit(z,T,b.x,b.y)){
        if(auth&&!b.cos)hurtZombie(z,b.dmg,b.vx>=0?1:-1,b.o);
        sfxHit(b.x,b.zn||'c',b.y);burst(b.x,b.y,T.blood||'#8fe04a',T.blood?7:5,b.zn);b.l=0;break}
    }
  }
  S.B=S.B.filter(b=>b.l>0);
}
function drawBullets(){
  c.lineCap='round';
  const zn=curZone();
  for(const b of S.B){if((b.zn||'c')!=zn)continue;
    if(b.m){const d=Math.sign(b.vx)||1;c.save();c.translate(b.x-cam,b.y);c.scale(d,1);c.globalAlpha=.25+.6*b.l/.1;c.strokeStyle='#fff';c.lineWidth=5;c.lineCap='round';c.beginPath();c.arc(-30,0,40,-.95,.95);c.stroke();c.restore();continue}
    const n=Math.hypot(b.vx,b.vy)||1,x=b.x-cam,y=b.y;
    c.globalAlpha=.3;c.strokeStyle='#ffb347';c.lineWidth=5;c.beginPath();c.moveTo(x,y);c.lineTo(x-b.vx/n*20,y-b.vy/n*20);c.stroke();
    c.globalAlpha=1;c.strokeStyle='#fff1b8';c.lineWidth=2.2;c.beginPath();c.moveTo(x,y);c.lineTo(x-b.vx/n*13,y-b.vy/n*13);c.stroke()}
  c.globalAlpha=1;
}
function burst(x,y,col,n,zn){zn=zn||curZone();for(let i=0;i<n;i++)S.FX.push({zn,x,y,vx:(Math.random()-.5)*220,vy:-Math.random()*200,l:.4+Math.random()*.3,c:col})}
function updFX(dt){for(const f of S.FX){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=700*dt;f.l-=dt}S.FX=S.FX.filter(f=>f.l>0)}
function drawFX(){const zn=curZone();for(const f of S.FX){if(f.zn!=zn)continue;c.globalAlpha=Math.min(1,f.l*3);c.fillStyle=f.c;c.fillRect(f.x-cam-2,f.y-2,4,4)}c.globalAlpha=1}
