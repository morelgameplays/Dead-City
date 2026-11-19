/* DEAD CITY — móveis vasculháveis. Dentro das construções o loot não fica mais solto no chão: está nos móveis.
   Chegando perto de um móvel ainda não revirado aparece uma setinha pulando; o botão de porta vira ✋ e, ao apertar,
   o jogador vasculha por um instante. O HOST sorteia o resultado (assim todos veem o mesmo): os itens caem no chão
   ao lado do móvel (pegue passando por cima) ou aparece "Vazio". Munição vai direto para o jogador que vasculhou. */
const SEARCH_T=.6,FURN_R=42,FURN_SEE=210;
/* tipo de móvel: nome · e = chance de estar vazio · n = qtd. de itens · w = pesos de cada item · ay = altura da setinha */
const FK={
  geladeira:{nm:'Geladeira',e:.12,n:[1,3],w:{food:5,water:5},ay:125},
  fogao:{nm:'Fogão',e:.5,n:[1,1],w:{food:3,water:1,ammo:1},ay:90},
  balcao:{nm:'Balcão',e:.35,n:[1,2],w:{food:2,water:2,bandage:1,ammo:2},ay:85},
  armario:{nm:'Armário',e:.3,n:[1,2],w:{bandage:2,food:2,water:1,med:1,ammo:2,bat:.5},ay:125},
  gaveta:{nm:'Gaveta',e:.4,n:[1,1],w:{bandage:2,ammo:3,med:1,food:1},ay:68},
  estante:{nm:'Estante',e:.45,n:[1,2],w:{food:2,water:1,bandage:1,ammo:2},ay:140},
  sofa:{nm:'Sofá',e:.65,n:[1,1],w:{food:1,ammo:2,water:1},ay:72},
  mesa:{nm:'Mesa',e:.55,n:[1,2],w:{food:3,water:2,ammo:1},ay:78},
  escrivaninha:{nm:'Escrivaninha',e:.5,n:[1,2],w:{ammo:3,bandage:1,med:1},ay:92},
  cama:{nm:'Cama',e:.6,n:[1,1],w:{bandage:2,ammo:1,med:1},ay:62},
  prateleira:{nm:'Prateleira',e:.3,n:[1,3],w:{food:4,water:3,ammo:2,bandage:1},ay:135},
  barril:{nm:'Barril',e:.55,n:[1,1],w:{water:3,ammo:1,food:1},ay:72},
  caixote:{nm:'Caixote',e:.4,n:[1,2],w:{ammo:3,food:1,bandage:1,med:.5,bat:.6,pipe:.3},ay:62},
  maquina:{nm:'Máquina de venda',e:.2,n:[1,2],w:{water:5,food:4},ay:138},
  armario_med:{nm:'Armário de remédios',e:.2,n:[1,2],w:{bandage:4,med:3,ammo:.5},ay:125},
  estante_med:{nm:'Prateleira de remédios',e:.2,n:[1,3],w:{bandage:4,med:3,water:1},ay:150},
  carrinho:{nm:'Carrinho médico',e:.4,n:[1,2],w:{bandage:3,med:2},ay:85},
  bancada:{nm:'Bancada',e:.3,n:[1,2],w:{med:3,bandage:3,water:1,pipe:.6},ay:98},
  freezer:{nm:'Freezer',e:.25,n:[1,2],w:{med:4,water:2,bandage:2},ay:135},
  rack:{nm:'Rack de equipamentos',e:.5,n:[1,1],w:{ammo:3,med:1},ay:128},
  arara:{nm:'Arara de roupas',e:.7,n:[1,1],w:{bandage:1,ammo:2,food:1},ay:125},
  manequim:{nm:'Manequim',e:.85,n:[1,1],w:{ammo:1,bandage:1},ay:135},
  banco:{nm:'Bancos',e:.7,n:[1,1],w:{water:1,food:1,ammo:1},ay:60},
  entulho:{nm:'Entulho',e:.7,n:[1,1],w:{ammo:1,food:1,bandage:1,bat:.6,pipe:.5},ay:52},
  container:{nm:'Contêiner',e:.3,n:[1,2],w:{ammo:3,med:1,food:1,water:1,pipe:.5,bat:.3},ay:88},
  pia:{nm:'Pia',e:.5,n:[1,1],w:{bandage:3,med:1},ay:88},
  box:{nm:'Box do banheiro',e:.75,n:[1,1],w:{bandage:1,water:1},ay:125}
};
/* móveis por cômodo: [x no sprite (px), tipo]. Para ajustar a posição de um móvel, mude só o primeiro número. */
const ROOMF={
  living:[[90,'sofa'],[185,'armario'],[268,'estante']],
  kitchen:[[97,'geladeira'],[152,'fogao'],[212,'balcao'],[258,'mesa']],
  bath:[[110,'pia'],[195,'box']],
  bed:[[24,'gaveta'],[105,'cama'],[223,'armario'],[285,'gaveta']],
  office:[[82,'escrivaninha'],[253,'estante']],
  dining:[[70,'armario'],[150,'mesa']],
  stairs:[],
  storage:[[76,'prateleira'],[217,'caixote']],
  base:[[42,'barril'],[95,'prateleira'],[180,'prateleira'],[275,'barril']],
  csuper:[[50,'prateleira'],[157,'prateleira'],[260,'balcao'],[380,'prateleira'],[435,'maquina'],[495,'maquina'],[550,'prateleira'],[670,'balcao'],[773,'prateleira'],[880,'prateleira']],
  cfarm:[[108,'armario_med'],[205,'balcao'],[337,'estante_med'],[501,'estante_med'],[633,'balcao'],[730,'armario_med']],
  cloja:[[84,'manequim'],[165,'arara'],[224,'arara'],[385,'balcao'],[483,'balcao'],[644,'arara'],[703,'arara'],[784,'manequim']],
  cposto:[[174,'mesa'],[311,'mesa'],[557,'mesa'],[694,'mesa']],
  cterm:[[247,'banco'],[405,'maquina'],[500,'maquina'],[582,'maquina'],[677,'maquina'],[835,'banco']],
  hrecep:[[144,'balcao'],[246,'banco'],[354,'maquina']],
  hhall:[[94,'carrinho'],[247,'armario_med']],
  hsurg:[[64,'carrinho'],[150,'cama'],[310,'carrinho']],
  hward:[[120,'gaveta'],[175,'cama'],[228,'gaveta'],[281,'carrinho']],
  hroom:[[40,'gaveta'],[200,'gaveta'],[250,'escrivaninha']],
  hstairs:[[285,'caixote']],
  hlab:[[70,'bancada'],[160,'bancada'],[320,'escrivaninha'],[378,'freezer']],
  hxray:[[100,'armario_med'],[330,'bancada']],
  hstore:[[40,'prateleira'],[85,'caixote'],[147,'barril'],[270,'prateleira'],[325,'barril']],
  hsecur:[[40,'rack'],[168,'escrivaninha'],[306,'rack']],
  hmorgue:[[67,'armario_med'],[169,'gaveta'],[320,'armario']],
  hcell:[[35,'armario'],[130,'cama'],[360,'barril']],
  hoffice:[[140,'escrivaninha'],[270,'entulho'],[414,'caixote']],
  hexit:[[285,'entulho']],
  hroof:[[62,'container'],[135,'container'],[383,'container'],[418,'barril']]
};
/* monta a lista de móveis do mundo (igual em todos os aparelhos: o índice é o id usado na rede) */
MAP.furn=[];
for(const zid in ZN){if(zid=='c')continue;const Z=ZN[zid];
  Z.rooms.forEach((r,ri)=>{for(const [l,k] of ROOMF[r.k]||[])MAP.furn.push({x:Math.round(Z.at(ri,l)),zn:zid,k,i:MAP.furn.length})})}
/* nenhum item solto no chão (nem dentro das construções, nem na rua): todo o loot está nos móveis. Zumbis ainda podem soltar itens ao morrer */
MAP.pick.length=0;

/* móvel mais próximo ainda não revirado (e ao alcance) */
function nearFurn(p){
  if(!S.fsr)return null;const zn=p.z||'c';if(zn=='c')return null;
  let best=null,bd=FURN_R;
  for(const f of MAP.furn){if(f.zn!=zn||S.fsr[f.i])continue;const d=Math.abs(p.x-f.x);if(d<bd){bd=d;best=f}}
  return best;
}
function startSearch(p,f){if(p.sr||(S.fpend&&S.fpend[f.i]>S.T))return;p.sr={f,t:0};p.mv=0}
function updSearch(p,dt){ /* chamado a cada quadro pelo jogador local */
  if(!p.sr)return;
  const f=p.sr.f;
  if(p.dead||(p.z||'c')!=f.zn||Math.abs(p.x-f.x)>FURN_R+30||S.fsr[f.i]){p.sr=null;return}
  p.sr.t+=dt;p.sr.sn=(p.sr.sn||0)-dt;if(p.sr.sn<=0){p.sr.sn=.16+Math.random()*.1;sfxRummage(f.k)} /* som de remexer */
  if(p.sr.t>=SEARCH_T){p.sr=null;S.fpend=S.fpend||{};S.fpend[f.i]=S.T+1.5;furnRequest(f.i)}
}
function furnRequest(i){if(isAuth())furnSearchHost(S.myId,i);else rawSend(NET.hostConn,{t:'fsr',i})}
function furnPick(w){let t=0;for(const k in w)t+=w[k];let r=Math.random()*t;for(const k in w){r-=w[k];if(r<=0)return k}return Object.keys(w)[0]}
function furnSearchHost(pid,i){ /* só o host sorteia: todos veem o mesmo resultado */
  const f=MAP.furn[i];if(!f||!S.fsr||S.fsr[i])return;
  const pl=S.players[pid];if(!pl||(pl.z||'c')!=f.zn)return;
  S.fsr[i]=1;const K=FK[f.k];let items=[],ammo=0;
  if(Math.random()>=K.e){
    const n=K.n[0]+Math.floor(Math.random()*(K.n[1]-K.n[0]+1));
    for(let j=0;j<n;j++){const it=furnPick(K.w);if(it=='ammo')ammo+=6+(Math.random()*9|0);else items.push(it)}
  }
  items.forEach((it,j)=>hostAddDrop(f.x+(j-(items.length-1)/2)*30,f.zn,it,1,-1)); /* by -1: qualquer um pode pegar na hora */
  const m={t:'fs',i,p:pid,a:ammo,e:(items.length||ammo)?0:1};
  bcast(m);furnApply(m);
}
function furnApply(m){ /* todos: marca como revirado · quem vasculhou recebe a munição e a mensagem */
  if(!S.fsr)return;S.fsr[m.i]=1;
  if(m.p!=S.myId)return;
  const f=MAP.furn[m.i],me=S.players[S.myId];if(!f||!me)return;
  if(m.e){toast(FK[f.k].nm+': vazio','#b9b9c9');sfxEmpty()}
  if(m.a>0){sfxAmmo();me.ammo=Math.min(WEAPONS.pistol.ammoMax,me.ammo+m.a);toast('+ '+m.a+' munição','#ffd34a');burst(f.x,GY-FK[f.k].ay*.6,'#ffd34a',8,f.zn)}
}

/* desenho: setinha pulando nos móveis ao alcance de vista + barra durante a busca */
function drawFurn(zn){
  const me=S.players[S.myId];if(!me||!S.fsr||me.dead)return;
  for(const f of MAP.furn){
    if(f.zn!=zn||S.fsr[f.i])continue;
    const x=f.x-cam;if(x<-30||x>VWW+30)continue;
    const d=Math.abs(me.x-f.x);if(d>FURN_SEE)continue;
    const near=me.nf===f,a=near?1:Math.max(.35,1-(d-FURN_R)/(FURN_SEE-FURN_R)*.65);
    const bob=Math.abs(Math.sin(S.T*5+f.i))*(near?9:6),sc=near?1.25:.95,ty=GY-FK[f.k].ay-6-bob;
    c.save();c.globalAlpha=a;c.translate(x,ty);c.scale(sc,sc);
    c.beginPath();c.moveTo(0,0);c.lineTo(-9,-13);c.lineTo(-3.5,-13);c.lineTo(-3.5,-24);c.lineTo(3.5,-24);c.lineTo(3.5,-13);c.lineTo(9,-13);c.closePath();
    c.lineWidth=2.5;c.strokeStyle='rgba(20,10,0,.9)';c.stroke();c.fillStyle=near?'#ffd34a':'#fff2a8';c.fill();c.restore();
    if(near&&!me.sr){c.save();c.font='bold 11px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='rgba(0,0,0,.85)';c.strokeText(FK[f.k].nm,x,ty-36);c.fillStyle='#fff';c.fillText(FK[f.k].nm,x,ty-36);c.restore()}
  }
  if(me.sr&&me.sr.f.zn==zn){ /* progresso da busca */
    const f=me.sr.f,x=f.x-cam,y=GY-FK[f.k].ay-30,w=46,v=Math.min(1,me.sr.t/SEARCH_T);
    c.fillStyle='rgba(0,0,0,.7)';c.fillRect(x-w/2-2,y-2,w+4,9);c.fillStyle='#ffd34a';c.fillRect(x-w/2,y,w*v,5);
    c.font='bold 11px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='rgba(0,0,0,.85)';c.strokeText('Vasculhando…',x,y-5);c.fillStyle='#fff';c.fillText('Vasculhando…',x,y-5);
  }
}
