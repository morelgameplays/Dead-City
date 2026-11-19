/* DEAD CITY — mochila e loot. Itens vão para a mochila (6 espaços, até 5 por pilha), podem ser usados, largados no chão
   ou dados a outro jogador. No multiplayer o HOST é a autoridade do loot: quem pega, larga ou dá um item passa por ele,
   então dois jogadores nunca pegam o mesmo item. A mochila de cada jogador fica só no aparelho dele. */
const ITEMS={ /* heal = vida recuperada (a vida máxima é 5) — ajuste aqui */
  med:{name:'Kit médico',heal:3,desc:'Recupera 3 de vida'},
  bandage:{name:'Atadura',heal:2,desc:'Recupera 2 de vida'},
  food:{name:'Comida enlatada',hunger:35,desc:'Mata 35% da fome'}, /* hunger/thirst = % recuperado (0–100) */
  water:{name:'Água',thirst:40,desc:'Mata 40% da sede'},
  /* ARMAS CORPO A CORPO — dur = golpes até quebrar · melee: dmg (zumbis têm 3–4 de vida; pistola = 1), cd = tempo entre golpes (s), reach = alcance (px) */
  bat:{name:'Taco de madeira',dur:15,melee:{dmg:2,cd:.45,reach:70},desc:'Corpo a corpo · dano 2 · 15 golpes. Usar = equipar'},
  pipe:{name:'Barra de ferro',dur:35,melee:{dmg:3,cd:.55,reach:76},desc:'Corpo a corpo · dano 3 · 35 golpes. Usar = equipar'}
};
const BAGN=6,STK=5,BAG={slots:[],open:false,sel:-1,pend:{},fullT:0,gi:0};

/* ---------- ícones (desenhados em canvas, sem arquivos) ---------- */
const ICONC={},ICONU={};
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
function mkIcon(t){
  const cv2=document.createElement('canvas');cv2.width=cv2.height=32;const x=cv2.getContext('2d');
  x.lineWidth=1.5;x.strokeStyle='rgba(20,15,30,.9)';
  if(t=='med'){rr(x,4,9,24,18,3);x.fillStyle='#f4f4f4';x.fill();x.stroke();rr(x,11,4,10,6,2);x.stroke();
    x.fillStyle='#d11';x.fillRect(14,12,4,12);x.fillRect(10,16,12,4)}
  else if(t=='bandage'){rr(x,4,11,24,12,5);x.fillStyle='#efe2c0';x.fill();x.stroke();
    x.fillStyle='#d33';x.fillRect(5,15,22,4);x.fillStyle='#fff';x.fillRect(13,13,6,8);x.fillStyle='#d33';x.fillRect(15,14,2,6);x.fillRect(14,16,4,2)}
  else if(t=='food'){x.fillStyle='#b9bdc6';rr(x,6,8,20,19,3);x.fill();x.stroke();
    x.fillStyle='#e0852d';x.fillRect(6,12,20,11);x.fillStyle='#fff3c8';x.beginPath();x.arc(16,17.5,4,0,7);x.fill();
    x.fillStyle='#e6e8ec';x.fillRect(7,8,18,3)}
  else if(t=='water'){x.fillStyle='rgba(120,200,255,.95)';rr(x,10,10,12,19,4);x.fill();x.stroke();
    x.fillStyle='rgba(120,200,255,.95)';x.fillRect(13,5,6,6);x.strokeRect(13,5,6,6);x.fillStyle='#2f9e5a';x.fillRect(12,2,8,4);
    x.fillStyle='rgba(255,255,255,.7)';x.fillRect(12,13,2,11)}
  else if(t=='bat'){x.save();x.translate(16,16);x.rotate(-.75);x.fillStyle='#b9854a';x.beginPath();x.moveTo(-2,-14);x.lineTo(4,-14);x.lineTo(5,6);x.lineTo(2,14);x.lineTo(-2,14);x.lineTo(-4,6);x.closePath();x.fill();x.stroke();
    x.fillStyle='#6b4423';x.fillRect(-2,8,4,7);x.restore()}
  else if(t=='pipe'){x.save();x.translate(16,16);x.rotate(-.75);x.fillStyle='#9aa3b0';x.fillRect(-3,-15,6,30);x.strokeRect(-3,-15,6,30);
    x.fillStyle='#d5dbe4';x.fillRect(-1,-14,2,28);x.fillStyle='#5b6370';x.fillRect(-4,-15,8,4);x.fillRect(-4,11,8,4);x.restore()}
  return cv2;
}
const iconC=t=>ICONC[t]||(ICONC[t]=mkIcon(t));
const iconURL=t=>ICONU[t]||(ICONU[t]=iconC(t).toDataURL());

/* ---------- desenho no mundo ---------- */
function drawItem(t,wx,wy,label){
  const x=wx-cam;if(x<-40||x>VWW+40)return;
  c.save();c.globalAlpha=.35;c.fillStyle='#000';c.beginPath();c.ellipse(x,GY+1,14,4,0,0,7);c.fill();c.restore();
  const g=c.createRadialGradient(x,wy-18,2,x,wy-18,26);g.addColorStop(0,'rgba(255,240,160,.32)');g.addColorStop(1,'rgba(255,240,160,0)');
  c.fillStyle=g;c.fillRect(x-28,wy-46,56,56);
  c.drawImage(iconC(t),x-23,wy-48,46,46);
  if(label){c.font='bold 11px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='rgba(0,0,0,.85)';c.strokeText(label,x,wy-54);c.fillStyle="#fff";c.fillText(label,x,wy-54)}
}
function drawDrops(){
  const zn=curZone(),me=S.players[S.myId];
  for(const d of S.drops){if(d.zn!=zn)continue;const bob=Math.sin(S.T*3+d.id)*2.5,near=me&&Math.abs(me.x-d.x)<70;
    drawItem(d.it,d.x,GY-4+bob,near?ITEMS[d.it].name+(d.n>1?' x'+d.n:''):'')}
}

/* ---------- mochila ---------- */
const bagCount=()=>BAG.slots.reduce((a,s)=>a+s.n,0);
const bagRoom=t=>{if(ITEMS[t].dur)return BAGN-BAG.slots.length;let r=(BAGN-BAG.slots.length)*STK;for(const s of BAG.slots)if(s.t==t)r+=STK-s.n;return r};
function bagAdd(t,n){ /* devolve quantos NÃO couberam */
  if(ITEMS[t]&&ITEMS[t].dur){while(n>0&&BAG.slots.length<BAGN){BAG.slots.push({t,n:1,d:ITEMS[t].dur});n--}bagRender();return n} /* armas não empilham: cada uma tem a sua durabilidade (d) */
  for(const s of BAG.slots)if(s.t==t&&n>0){const k=Math.min(STK-s.n,n);s.n+=k;n-=k}
  while(n>0&&BAG.slots.length<BAGN){const k=Math.min(STK,n);BAG.slots.push({t,n:k});n-=k}
  bagRender();return n;
}
function bagTakeOne(i){
  const s=BAG.slots[i];if(!s)return null;const t=s.t;
  if(--s.n<=0){BAG.slots.splice(i,1);if(BAG.sel>=BAG.slots.length)BAG.sel=BAG.slots.length-1}
  bagRender();return t;
}
function bagReset(){BAG.slots=[];BAG.sel=-1;BAG.open=false;document.body.classList.remove('bagopen');BAG.pend={};$('bag').hidden=true;bagRender()}
function toast(t,col){S.toasts.push({t,ttl:2.6,col});if(S.toasts.length>3)S.toasts.shift()}

function bagUse(i){
  const me=S.players[S.myId],s=BAG.slots[i];if(!me||me.dead||!s)return;
  const it=ITEMS[s.t];
  if(it.melee){ /* equipar / guardar a arma corpo a corpo (com ela equipada, o botão de tiro dá o golpe) */
    me.eq=me.eq===s?null:s;toast(me.eq?'Equipado: '+it.name:'Guardado · voltou a pistola','#ffe27a');bagRender();return}
  if(it.hunger||it.thirst){ /* comida e água: recuperam fome e sede */
    const k=it.hunger?'food':'water',v=it.hunger||it.thirst;
    if(me[k]>=97){toast((it.hunger?'Sem fome':'Sem sede')+' · '+it.name+' guardado','#ffd27a');return}
    me[k]=Math.min(100,me[k]+v);me.sd=0;bagTakeOne(i);
    burst(me.x,me.y-70,it.hunger?'#e0b050':'#6cc0ff',8,me.z);toast('+'+v+'% · '+it.name,'#9dffb0');return}
  if(me.hp>=MAXHP){toast('Vida cheia · '+it.name+' guardado','#ffd27a');return}
  me.hp=Math.min(MAXHP,me.hp+it.heal);bagTakeOne(i);
  burst(me.x,me.y-70,'#7dff9a',10,me.z);toast('+'+it.heal+' de vida · '+it.name,'#9dffb0');
}
function bagDrop(i){
  const me=S.players[S.myId];if(!me||!BAG.slots[i])return;
  if(ITEMS[BAG.slots[i].t].melee){toast('Arma não pode ser largada (a durabilidade se perderia)','#ffd27a');return}
  const t=bagTakeOne(i);dropRequest(me.x+me.face*42,me.z||'c',t,1);toast('Largou: '+ITEMS[t].name,'#ddd');
}
function bagGive(i,pid){
  const me=S.players[S.myId],tp=S.players[pid],s=BAG.slots[i];if(!me||!tp||!s)return;
  if((tp.z||'c')!=(me.z||'c')||Math.abs(tp.x-me.x)>320){toast('Chegue mais perto de '+tp.name,'#ffd27a');return}
  if(ITEMS[s.t].melee){toast('Arma não pode ser dada (a durabilidade se perderia)','#ffd27a');return}
  const t=bagTakeOne(i);sendGive(pid,t,1);toast('Você deu '+ITEMS[t].name+' a '+tp.name,'#9fe7ff');
}

/* ---------- rede do loot ---------- */
function dropRequest(x,zn,it,n){
  if(isAuth())hostAddDrop(x,zn,it,n,S.myId);
  else rawSend(NET.hostConn,{t:'drop',x:Math.round(x),zn,it,n});
}
function markDrop(d){if(d.by==S.myId)d.until=S.T+2} /* quem largou não repega na hora */
function hostAddDrop(x,zn,it,n,by){
  const d={id:S.dropId++,x:Math.round(x),zn,it,n,by};S.drops.push(d);markDrop(d);bcast({t:'dr',...d});sfxDrop(d.x,d.zn,null,by==S.myId);
}
function hostTake(pid,kind,i){ /* host decide quem leva o item */
  let it,n=1;
  if(kind=='s'){if(S.taken[i])return;const q=MAP.pick[i];if(!q||!ITEMS[q.t])return;S.taken[i]=1;it=q.t;bcast({t:'pk',i})}
  else{const j=S.drops.findIndex(d=>d.id==i);if(j<0)return;const d=S.drops[j];it=d.it;n=d.n;S.drops.splice(j,1);bcast({t:'dx',id:i})}
  if(pid==S.myId)recvLoot(it,n);else netSendTo(pid,{t:'got',it,n});
}
function recvLoot(it,n){
  if(!ITEMS[it])return;const left=bagAdd(it,n);sfxPickup(it);
  toast('+ '+ITEMS[it].name+(n>1?' x'+n:''),'#fff2a8');
  if(left>0){const me=S.players[S.myId];if(me)dropRequest(me.x+30,me.z||'c',it,left);toast('Mochila cheia — sobrou no chão','#ff9a9a')}
}
function sendGive(to,it,n,bk){
  if(to==S.myId){recvGive(S.myId,it,n,bk);return}
  if(isAuth())netSendTo(to,{t:'give',from:S.myId,it,n,bk:bk?1:0});
  else rawSend(NET.hostConn,{t:'give',to,from:S.myId,it,n,bk:bk?1:0});
}
function recvGive(from,it,n,bk){
  if(!ITEMS[it])return;
  const left=bagAdd(it,n),got=n-left,fp=S.players[from];
  if(got>0)toast((bk?'Devolvido: ':(fp?fp.name+' deu: ':'Recebeu: '))+ITEMS[it].name,'#9fe7ff');
  if(left>0){
    if(!bk&&from!=S.myId&&fp){sendGive(from,it,left,1);toast('Mochila cheia — devolvi o item','#ff9a9a')}
    else{const me=S.players[S.myId];if(me)dropRequest(me.x+30,me.z||'c',it,left);toast('Mochila cheia — largado no chão','#ff9a9a')}
  }
}
function lootTake(kind,id,it){ /* pedido de pegar um item do chão/mapa */
  const key=kind+id;if(BAG.pend[key]>S.T)return;
  if(bagRoom(it)<1){if(S.T>BAG.fullT){BAG.fullT=S.T+1.5;toast('Mochila cheia','#ff9a9a')}return}
  BAG.pend[key]=S.T+1.2;
  if(isAuth())hostTake(S.myId,kind,id);else rawSend(NET.hostConn,{t:'take',k:kind,i:id});
}
function bagCheckDrops(p){
  const zn=p.z||'c';
  for(const d of S.drops){if(d.zn!=zn||Math.abs(p.x-d.x)>32||(d.until&&S.T<d.until))continue;lootTake('d',d.id,d.it)}
}
function lootFromZombie(z){ /* host: zumbis podem soltar itens ao morrer */
  if(Math.random()>.3)return;
  const r=Math.random(),it=r<.35?'food':r<.6?'water':r<.85?'bandage':'med';
  hostAddDrop(z.x,z.zn,it,1,-1);
}

/* ---------- interface ---------- */
function bagToggle(){
  if(S.mode!='play')return;BAG.open=!BAG.open;
  if(BAG.open&&BAG.sel<0&&BAG.slots.length)BAG.sel=0;
  $('bag').hidden=!BAG.open;document.body.classList.toggle('bagopen',BAG.open);bagRender();
}
function bagRender(){
  const n=bagCount(),b=$('bagN');b.textContent=n||'';b.hidden=!n;
  $('bagCap').textContent=BAG.slots.length+'/'+BAGN+' espaços';
  if(!BAG.open)return;
  const g=$('bagGrid');g.innerHTML='';
  for(let i=0;i<BAGN;i++){
    const s=BAG.slots[i],el=document.createElement('button');el.type='button';
    const me0=S.players[S.myId];
    el.className='bs'+(i==BAG.sel?' sel':'')+(s?'':' empty')+(s&&me0&&me0.eq===s?' eq':'');
    if(s)el.innerHTML='<img alt="" src="'+iconURL(s.t)+'"><b>'+(s.d!=null?s.d:s.n)+'</b>';
    el.onclick=()=>{if(s){BAG.sel=i;bagRender()}};g.appendChild(el);
  }
  const s=BAG.slots[BAG.sel],info=$('bagInfo'),act=$('bagAct');act.innerHTML='';
  if(!s){info.textContent=BAG.slots.length?'Toque em um item':'Mochila vazia — pegue itens pelo mapa';return}
  const it=ITEMS[s.t];const me1=S.players[S.myId],isEq=!!(me1&&me1.eq===s);
  info.innerHTML='<b>'+it.name+'</b> · '+it.desc+(s.d!=null?' · restam '+s.d+'/'+it.dur:'')+(isEq?' · EQUIPADA':'');
  const mk=(txt,cls,fn)=>{const e=document.createElement('button');e.type='button';e.className='ba '+cls;e.textContent=txt;e.onclick=fn;e.dataset.pb={use:'A',drop:'X',give:'Y'}[cls]||'';act.appendChild(e)};
  mk(it.melee?(isEq?'Guardar':'Equipar'):'Usar','use',()=>bagUse(BAG.sel));mk('Largar','drop',()=>bagDrop(BAG.sel));
  for(const id in S.players)if(id!=S.myId){const p=S.players[id];mk('Dar → '+p.name,'give',()=>bagGive(BAG.sel,+id))}
}
function bagNav(d){
  if(!BAG.slots.length)return;let i=BAG.sel<0?0:BAG.sel;
  i+=d=='left'?-1:d=='right'?1:d=='up'?-3:3;BAG.sel=Math.max(0,Math.min(BAG.slots.length-1,i));bagRender();
}
function bagPad(g,E){ /* controle com a mochila aberta: direcional escolhe · A usa · X larga · Y dá · B (ou LB) fecha */
  const now=performance.now(),ax=g.axes||[],X=ax[0]||0,Y=ax[1]||0;
  const D={left:X<-.5||padBtn(g,'dl'),right:X>.5||padBtn(g,'dr'),up:Y<-.5||padBtn(g,'du'),down:Y>.5||padBtn(g,'dd')};
  for(const d in D){if(D[d]){const t=PAD.rep['b'+d];if(!t||now>t){PAD.rep['b'+d]=now+(t?160:380);bagNav(d)}}else PAD.rep['b'+d]=0}
  if(E.a)bagUse(BAG.sel);
  else if(E.x)bagDrop(BAG.sel);
  else if(E.y){const ids=Object.keys(S.players).filter(id=>id!=S.myId);
    if(!ids.length)toast('Nenhum outro jogador na sala','#ffd27a');else bagGive(BAG.sel,+ids[BAG.gi++%ids.length])}
  else if(E.b)bagToggle();
}
$('bBag').onclick=bagToggle;$('bagX').onclick=bagToggle;
addEventListener('keydown',e=>{
  if(S.mode!='play')return;
  if(e.code=='KeyI'||e.code=='Tab'){e.preventDefault();bagToggle()}
  else if(/^Digit[1-6]$/.test(e.code))bagUse(+e.code.slice(5)-1);
});
bagRender();
