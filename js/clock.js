/* RELÓGIO · DIA E NOITE · DIAS SOBREVIVIDOS
   O tempo do jogo corre bem mais rápido que o real: 1 dia (24 h) = CLK_DAY_SEC segundos reais.
   O host/solo conta e manda S.clk (minutos de jogo desde o início) aos clientes junto com o pacote 'w'.
   Sprites (folha do cenário): sol e lampião recortados em assets/hud/. */
const CLK_DAY_SEC=600;   /* ← duração de 1 dia de jogo em segundos reais (600 = 10 min; 1 hora do jogo = 25 s) */
const CLK_START=7*60;    /* começa às 07:00 do dia 1 */
SPR_META.ksun={src:'assets/hud/sun.png',w:66,h:66};
/* 4 visuais tirados das folhas de sprites que você enviou */
for(const k of ['night','sunset','morning','noon'])SPR_META['bg'+k]={src:'assets/z/bg_'+k+'.webp',w:1648,h:212};
/* grade de cor dos sprites por fase (medida comparando a folha-base com cada folha): saída = entrada*M + A  ·  sky = cor do céu acima do cenário */
const CLK_PH={
  night:  {M:[.82,.83,1],A:[0,0,1],sky:[1,7,48]},
  sunset: {M:[1,.96,.88],A:[8,0,0],sky:[209,115,178]},   /* usado no entardecer e no amanhecer */
  morning:{M:[.99,1,1],A:[0,2,3],sky:[2,135,250]},
  noon:   {M:[1,1,1],A:[2,10,4],sky:[17,148,249]}};
/* linha do tempo: [hora, fase] — entre dois pontos a mistura é gradual */
const CLK_KF=[[0,'night'],[5,'night'],[6.5,'sunset'],[8,'morning'],[11,'noon'],[15,'noon'],[17.5,'sunset'],[19.5,'night'],[24,'night']];
SPR_META.klamp={src:'assets/hud/lantern.png',w:104,h:172};
function clkReset(){S.clk=CLK_START;S._day=1}
const clkDay=()=>1+Math.floor((S.clk||0)/1440);           /* dia atual (1, 2, 3…) */
const clkHour=()=>(((S.clk||0)%1440)+1440)%1440/60;        /* hora do dia 0–24 */
function clkPhase(){ /* [fase A, fase B, 0..1 de A para B] */
  const h=clkHour();
  for(let k=0;k<CLK_KF.length-1;k++){const p=CLK_KF[k],q=CLK_KF[k+1];
    if(h>=p[0]&&h<q[0]){let t=(h-p[0])/(q[0]-p[0]);t=t*t*(3-2*t);return[p[1],q[1],t]}}
  return['night','night',0];
}
function clkDark(){ /* 0 = claro · 1 = noite (usado no ícone, no brilho do lampião) */
  const p=clkPhase(),w=ph=>(p[0]==ph?1-p[2]:0)+(p[1]==ph?p[2]:0);
  return Math.min(1,w('night')+.3*w('sunset'));
}
function clkUpdate(dt){
  if(S.mode!='play'||S.clk===undefined)return;
  S.clk+=dt*1440/CLK_DAY_SEC;
  const d=clkDay();
  if(S._day===undefined)S._day=d;
  if(d>S._day){S._day=d;toast('☀ Você sobreviveu ao dia '+(d-1)+'! Começa o dia '+d,'#ffe27a')}
}
/* grade de cor do mundo inteiro (cenário, sprites, zumbis, jogadores) + brilho do lampião em volta do herói */
function clkDraw(zn){
  if(S.mode!='play'||S.clk===undefined)return;
  const p=clkPhase(),A=CLK_PH[p[0]],B=CLK_PH[p[1]],t=p[2],s=zn=='c'?1:.5;
  const M=[0,1,2].map(k=>1-(1-(A.M[k]+(B.M[k]-A.M[k])*t))*s),Ad=[0,1,2].map(k=>(A.A[k]+(B.A[k]-A.A[k])*t)*s);
  if(M.some(v=>v<.995)){c.save();c.globalCompositeOperation='multiply';c.fillStyle='rgb('+M.map(v=>Math.round(v*255)).join(',')+')';c.fillRect(0,0,VW,VH);c.restore()}
  if(Ad.some(v=>v>.5)){c.save();c.globalCompositeOperation='lighter';c.fillStyle='rgb('+Ad.map(v=>Math.round(v)).join(',')+')';c.fillRect(0,0,VW,VH);c.restore()}
  const dk=clkDark();if(dk<=.05)return;
  const me=S.players[S.myId];if(!me||me.dead)return;
  const Z=zoomNow(),px=(me.x-cam)*Z,py=(me.y-55-camY)*Z,R=(zn=='c'?230:170)*Z;
  const g=c.createRadialGradient(px,py,8,px,py,R);
  g.addColorStop(0,'rgba(255,190,90,'+(.3*dk)+')');g.addColorStop(1,'rgba(255,190,90,0)');
  c.save();c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(px-R,py-R,R*2,R*2);c.restore();
}
function clkHud(){
  if(S.clk===undefined)return;
  const h=clkHour(),hh=Math.floor(h),mm=Math.floor((h-hh)*60),dk=clkDark(),night=dk>.5;
  const W=176,H=46,x=VW/2-W/2,y=8;
  c.save();
  c.fillStyle='rgba(10,10,24,.68)';c.beginPath();c.roundRect(x,y,W,H,12);c.fill();
  c.strokeStyle=night?'#6f86d6':'#ffd35a';c.globalAlpha=.8;c.lineWidth=2;c.stroke();c.globalAlpha=1;
  /* ícone: sol (sprite) de dia · lua à noite */
  const ix=x+26,iy=y+H/2,sun=IMG.ksun;
  if(!night&&sun&&sun.complete){c.save();c.translate(ix,iy);c.rotate(S.T*.25);c.drawImage(sun,-17,-17,34,34);c.restore()}
  else{c.fillStyle='#dfe6ff';c.beginPath();c.arc(ix,iy,14,0,7);c.fill();c.fillStyle='rgba(10,10,24,1)';c.beginPath();c.arc(ix+7,iy-4,12,0,7);c.fill()}
  c.fillStyle='#fff';c.font='bold 22px monospace';c.textAlign='left';c.textBaseline='alphabetic';
  c.fillText((hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm,x+50,y+22);
  const lamp=IMG.klamp;
  if(lamp&&lamp.complete)c.drawImage(lamp,x+52,y+26,10,16.5);
  c.fillStyle=night?'#9fb4ff':'#ffe27a';c.font='bold 13px monospace';c.fillText('DIA '+clkDay(),x+66,y+39);
  /* barra de progresso do dia */
  c.fillStyle='rgba(255,255,255,.18)';c.fillRect(x+W-34,y+31,24,5);c.fillStyle=night?'#6f86d6':'#ffd35a';c.fillRect(x+W-34,y+31,24*(h/24),5);
  c.restore();
}
