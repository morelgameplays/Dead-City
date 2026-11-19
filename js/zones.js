/* DEAD CITY — zonas. A partida é uma só, mas cada jogador está numa zona: a rua ('c') ou os andares da casa (h1 térreo, h2 andar de cima, h0 porão).
   Zumbis, loot e tiros pertencem a uma zona; portas e escadas levam de uma zona a outra sem sair da partida. */
const SR=1.4,FLR=178;
   /* escala dos cômodos e altura (px do sprite) em que os pés pisam no chão */
const RS={csuper:{w:930,h:190},hrecep:{w:402,h:190},hhall:{w:305,h:190},hsurg:{w:342,h:190},hward:{w:308,h:190},hroom:{w:308,h:190},hlab:{w:409,h:190},hxray:{w:414,h:190},hstore:{w:354,h:190},hmorgue:{w:352,h:190},hsecur:{w:351,h:190},hoffice:{w:433,h:190},hcell:{w:386,h:190},hstairs:{w:341,h:190},hroof:{w:452,h:190},hexit:{w:377,h:190},living:{w:303,h:190},kitchen:{w:304,h:190},bath:{w:246,h:190},bed:{w:321,h:190},office:{w:311,h:191},dining:{w:284,h:191},stairs:{w:248,h:192},storage:{w:254,h:192},base:{w:311,h:192}};
for(const k in RS)SPR_META['ri_'+k]={src:'assets/i/'+k+'.png',w:RS[k].w,h:RS[k].h};
SPR_META.zhouse1={src:'assets/z/zhouse1.png',w:277,h:267};
SPR_META.zhosp={src:'assets/z/zhosp.png',w:672,h:254};SPR_META.zhsign1={src:'assets/z/zhsign1.png',w:58,h:200};SPR_META.zhsign2={src:'assets/z/zhsign2.png',w:116,h:64};
SPR_META.zbld2={src:'assets/z/zbld2.png',w:180,h:261};

const CEIL=GY-FLR*SR+132,CEILB=GY-FLR*SR+8; /* teto dos cômodos: limite da cabeça do herói e dos tiros */
const ZN={};
function mkZone(id,name,short,rooms){
  let x=0;const L=rooms.map(r=>{const o={k:r[0],flip:!!r[1],x,w:RS[r[0]].w*SR,h:RS[r[0]].h*SR};x+=o.w;return o});
  return {id,name,short,rooms:L,W:x,plats:[],doors:[],
    at(i,l){const r=this.rooms[i];return r.x+(r.flip?RS[r.k].w-l:l)*SR}}; /* x do mundo a partir de um ponto (px do sprite) do cômodo i */
}
ZN.c={id:'c',name:'RUA',short:'rua',W:MAP.W,plats:MAP.plats,doors:[],start:MAP.start};
ZN.h1=mkZone('h1','CASA · TÉRREO','térreo',[['stairs'],['living'],['dining'],['kitchen'],['storage']]);
ZN.h2=mkZone('h2','CASA · ANDAR DE CIMA','andar de cima',[['stairs'],['bed'],['bath'],['office']]);
ZN.h0=mkZone('h0','CASA · PORÃO','porão',[['base',1],['storage',1],['base']]);
ZN.p1=mkZone('p1','PRÉDIO · TÉRREO','térreo do prédio',[['stairs'],['office'],['dining'],['bath']]);
ZN.p2=mkZone('p2','PRÉDIO · ANDAR DE CIMA','andar de cima do prédio',[['stairs'],['living'],['kitchen'],['bed']]);

ZN.hp1=mkZone('hp1','HOSPITAL · TÉRREO','térreo do hospital',[['hrecep'],['hhall'],['hsurg'],['hward'],['hroom'],['hstairs']]);
ZN.hp2=mkZone('hp2','HOSPITAL · 2º ANDAR','2º andar do hospital',[['hstairs'],['hlab'],['hxray'],['hstore'],['hsecur']]);
ZN.hp3=mkZone('hp3','HOSPITAL · HELIPORTO','heliporto',[['hroof']]);
ZN.hp0=mkZone('hp0','HOSPITAL · SUBSOLO','subsolo do hospital',[['hexit'],['hmorgue'],['hcell'],['hoffice']]);
/* x do mundo a uma fração (0–1) da largura do cômodo i da zona */
const zx=(zn,i,f)=>ZN[zn].rooms[i].x+ZN[zn].rooms[i].w*f;

/* fachada da casa na rua */
const HS=1.6,HX=960,HDX=HX+(172-277/2)*HS;
MAP.bld=[{n:'zhouse1',x:HX,y:GY+22,s:HS}];
/* prédio novo (fachada da imagem de sprites): a porta fica no centro da fachada */
const BS=1.55,BX=3440;
MAP.bld.push({n:'zbld2',x:BX,y:GY+14,s:BS});

/* portas e escadas: x = onde se aperta o botão · to/tx = zona e posição de destino */
const ladder=ZN.h1.at(4,146),dn=ZN.h0.at(2,228);
ZN.c.doors.push({x:HDX,to:'h1',tx:ZN.h1.at(0,40),label:'ENTRAR'});
ZN.h1.doors.push({x:ZN.h1.at(0,40),to:'c',tx:HDX,label:'SAIR'},
                 {x:ZN.h1.at(0,105),to:'h2',tx:ZN.h2.at(0,105),label:'SUBIR ▲'},
                 {x:ladder,to:'h0',tx:dn-30,label:'PORÃO ▼'});
ZN.h2.doors.push({x:ZN.h2.at(0,105),to:'h1',tx:ZN.h1.at(0,105),label:'DESCER ▼'});
ZN.h0.doors.push({x:dn,to:'h1',tx:ladder,label:'SUBIR ▲'},{x:ZN.h0.at(0,228),to:'h1',tx:ladder,label:'SUBIR ▲'});

/* portas do prédio */
ZN.c.doors.push({x:BX,to:'p1',tx:ZN.p1.at(0,40),label:'ENTRAR'});
ZN.p1.doors.push({x:ZN.p1.at(0,40),to:'c',tx:BX,label:'SAIR'},{x:ZN.p1.at(0,105),to:'p2',tx:ZN.p2.at(0,105),label:'SUBIR ▲'});
ZN.p2.doors.push({x:ZN.p2.at(0,105),to:'p1',tx:ZN.p1.at(0,105),label:'DESCER ▼'});

/* zumbis das zonas internas: [tipo, x mín, x máx, zona] */
MAP.zs.push(
  ['z1',420,700,'h1'],['z3',850,1100,'h1'],['z2',1250,1520,'h1'],['z4',1650,1900,'h1'],
  ['z2',420,740,'h2'],['z1',830,1100,'h2'],['zfat',1230,1520,'h2'],
  ['z4',100,380,'h0'],['z3',480,740,'h0'],['zdog',860,1180,'h0'],
  /* corredores furiosos da casa */
  ['zrun',1000,1250,'h1'],['zrun',900,1200,'h2'],['zrun',500,900,'h0']);
MAP.zs.push(
  ['z3',450,720,'p1'],['z4',800,1050,'p1'],['z1',1150,1400,'p1'],
  ['z2',450,700,'p2'],['z1',800,1000,'p2'],['zfat',1150,1400,'p2'],['z4',1450,1600,'p2']);
/* zumbis escaladores: andam no teto, sobem as paredes e pulam nos jogadores (casa e prédio) */
MAP.zs.push(['zclimb',800,1200,'h1'],['zclimb',500,900,'h2'],['zclimb',350,800,'h0'],['zclimb',650,1100,'p1'],['zclimb',900,1300,'p2']);
MAP.pick.push(
  {x:560,y:GY,t:'ammo',zn:'p1'},{x:950,y:GY,t:'bandage',zn:'p1'},{x:1300,y:GY,t:'med',zn:'p1'},
  {x:600,y:GY,t:'ammo',zn:'p2'},{x:980,y:GY,t:'food',zn:'p2'},{x:1300,y:GY,t:'ammo',zn:'p2'},{x:1560,y:GY,t:'med',zn:'p2'});
/* loot das zonas internas */
MAP.pick.push(
  {x:560,y:GY,t:'ammo',zn:'h1'},{x:1400,y:GY,t:'med',zn:'h1'},{x:1780,y:GY,t:'ammo',zn:'h1'},
  {x:560,y:GY,t:'ammo',zn:'h2'},{x:980,y:GY,t:'med',zn:'h2'},{x:1400,y:GY,t:'ammo',zn:'h2'},
  {x:300,y:GY,t:'ammo',zn:'h0'},{x:640,y:GY,t:'ammo',zn:'h0'},{x:1000,y:GY,t:'med',zn:'h0'});

MAP.pick.push(
  {x:1260,y:GY,t:'food',zn:'h1'},{x:1340,y:GY,t:'water',zn:'h1'},{x:700,y:GY,t:'bandage',zn:'h1'},
  {x:900,y:GY,t:'bandage',zn:'h2'},{x:1000,y:GY,t:'med',zn:'h2'},{x:1450,y:GY,t:'food',zn:'h2'},
  {x:520,y:GY,t:'food',zn:'h0'},{x:800,y:GY,t:'water',zn:'h0'});

/* porta mais próxima (para o botão de porta) */
function nearDoor(p){for(const d of ZN[p.z||'c'].doors)if(Math.abs(p.x-d.x)<55)return d;return null}
function useDoor(p,d){p.z=d.to;p.x=d.tx;p.y=GY;p.vy=0;p.vx=0;p.mv=0;p.on=1;p.kb=0;p.nd=null;S.fade=.45;S.snap=1}
const curZone=()=>{const me=S.players[S.myId];return me?me.z||'c':'c'};

/* desenho do interior: fundo escuro + cômodos lado a lado (pés no chão GY) */
function drawInterior(zn){
  const Z=ZN[zn],y=GY-FLR*SR;
  c.fillStyle='#07050b';c.fillRect(0,0,VWW,VH);
  for(const r of Z.rooms){
    if(r.x+r.w-cam<0||r.x-cam>VWW)continue;const im=IMG['ri_'+r.k];if(!im)continue;
    if(r.flip){c.save();c.translate(r.x+r.w-cam,y);c.scale(-SR,SR);c.drawImage(im,0,0,RS[r.k].w,RS[r.k].h);c.restore()}
    else c.drawImage(im,r.x-cam,y,r.w,r.h);
  }
  drawPickups();drawFurn(zn);
}
/* indicação flutuante das portas/escadas da zona atual */
function drawDoorMarks(zn){
  const me=S.players[S.myId];
  for(const d of ZN[zn].doors){
    const x=d.x-cam;if(x<-80||x>VWW+80)continue;
    const near=me&&me.nd===d,y=GY-190+Math.sin(S.T*4+d.x)*3;
    c.save();c.globalAlpha=near?1:.6;c.font='bold 13px system-ui';c.textAlign='center';
    const w=c.measureText(d.label).width+(near?44:18);
    c.fillStyle=near?'rgba(255,200,60,.92)':'rgba(0,0,0,.55)';c.beginPath();c.roundRect?c.roundRect(x-w/2,y-16,w,22,8):c.rect(x-w/2,y-16,w,22);c.fill();
    c.fillStyle=near?'#2a1500':'#cfe9ff';c.fillText((near?'[E] ':'')+d.label,x,y);
    c.restore();
  }
}


/* ---------- HOSPITAL (fachada e cômodos da imagem de sprites) ---------- */
const HPS=1.5,HPX=5440; /* HPX = centro da fachada (672 px de largura nativa) */
const HPD=HPX+(237-336)*HPS; /* porta de entrada, no centro-esquerda da fachada */
MAP.bld.push({n:'zhosp',x:HPX,y:GY+8,s:HPS});
MAP.decor.push({n:'zhsign2',x:4930,y:GY+6,s:1.3},{n:'zhsign1',x:6030,y:GY+6,s:1.45});
MAP.zs.push(['hcomum',5000,5200,'c'],['hfem',5550,5750,'c'],['henf',5800,5950,'c']);
MAP.pick.push({x:4980,y:GY,t:'ammo'},{x:5620,y:GY,t:'med'});

/* portas e escadas do hospital */
const hLad=ZN.hp2.at(3,275),hUp=ZN.hp3.at(0,55),hDn=ZN.hp0.at(0,202),hHall=ZN.hp1.at(1,132);
ZN.c.doors.push({x:HPD,to:'hp1',tx:ZN.hp1.at(0,72),label:'ENTRAR'});
ZN.hp1.doors.push({x:ZN.hp1.at(0,72),to:'c',tx:HPD,label:'SAIR'},
  {x:hHall,to:'hp0',tx:hDn-30,label:'SUBSOLO ▼'},
  {x:ZN.hp1.at(5,118),to:'hp2',tx:ZN.hp2.at(0,118),label:'SUBIR ▲'});
ZN.hp2.doors.push({x:ZN.hp2.at(0,118),to:'hp1',tx:ZN.hp1.at(5,118),label:'DESCER ▼'},
  {x:hLad,to:'hp3',tx:hUp+30,label:'HELIPORTO ▲'});
ZN.hp3.doors.push({x:hUp,to:'hp2',tx:hLad,label:'DESCER ▼'});
ZN.hp0.doors.push({x:hDn,to:'hp1',tx:hHall,label:'SUBIR ▲'});

/* zumbis e loot do hospital: [tipo, x mín, x máx, zona] */
MAP.zs.push(
  /* térreo: recepção, corredor, cirurgia, enfermaria, quarto, escada */
  ['hfem',zx('hp1',0,.45),zx('hp1',0,.95),'hp1'],['henf',zx('hp1',1,.15),zx('hp1',1,.9),'hp1'],['hmed',zx('hp1',2,.1),zx('hp1',2,.9),'hp1'],
  ['hcomum',zx('hp1',3,.15),zx('hp1',3,.9),'hp1'],['hbaby',zx('hp1',3,.55),zx('hp1',3,.95),'hp1'],['henf',zx('hp1',3,.5),zx('hp1',3,.95),'hp1'],['hmed',zx('hp1',4,.1),zx('hp1',4,.9),'hp1'],['hbaby',zx('hp1',4,.15),zx('hp1',4,.6),'hp1'],['hrun',zx('hp1',5,.3),zx('hp1',5,.95),'hp1'],
  /* 2º andar: laboratório, raio-x, estoque, segurança */
  ['hhaz',zx('hp2',1,.1),zx('hp2',1,.9),'hp2'],['hmed',zx('hp2',2,.1),zx('hp2',2,.9),'hp2'],['hcomum',zx('hp2',3,.1),zx('hp2',3,.8),'hp2'],['hbaby',zx('hp2',2,.2),zx('hp2',2,.8),'hp2'],
  ['hmil',zx('hp2',4,.1),zx('hp2',4,.5),'hp2'],['hgordo',zx('hp2',4,.5),zx('hp2',4,.95),'hp2'],
  /* heliporto */
  ['hmil',zx('hp3',0,.3),zx('hp3',0,.6),'hp3'],['hrun',zx('hp3',0,.5),zx('hp3',0,.95),'hp3'],['hmut',zx('hp3',0,.65),zx('hp3',0,.95),'hp3'],
  /* subsolo: necrotério, celas, escritório */
  ['hcomum',zx('hp0',1,.1),zx('hp0',1,.9),'hp0'],['hhaz',zx('hp0',1,.3),zx('hp0',1,.9),'hp0'],['hrun',zx('hp0',2,.1),zx('hp0',2,.9),'hp0'],['hmut',zx('hp0',3,.2),zx('hp0',3,.9),'hp0']);
MAP.pick.push(
  {x:zx('hp1',0,.7),y:GY,t:'water',zn:'hp1'},{x:zx('hp1',2,.5),y:GY,t:'bandage',zn:'hp1'},{x:zx('hp1',3,.6),y:GY,t:'med',zn:'hp1'},{x:zx('hp1',4,.5),y:GY,t:'ammo',zn:'hp1'},
  {x:zx('hp2',1,.5),y:GY,t:'med',zn:'hp2'},{x:zx('hp2',2,.5),y:GY,t:'bandage',zn:'hp2'},{x:zx('hp2',3,.4),y:GY,t:'ammo',zn:'hp2'},{x:zx('hp2',3,.8),y:GY,t:'food',zn:'hp2'},{x:zx('hp2',4,.5),y:GY,t:'ammo',zn:'hp2'},
  {x:zx('hp3',0,.45),y:GY,t:'ammo',zn:'hp3'},{x:zx('hp3',0,.8),y:GY,t:'med',zn:'hp3'},
  {x:zx('hp0',1,.5),y:GY,t:'ammo',zn:'hp0'},{x:zx('hp0',2,.6),y:GY,t:'med',zn:'hp0'},{x:zx('hp0',3,.5),y:GY,t:'water',zn:'hp0'},{x:zx('hp0',3,.85),y:GY,t:'ammo',zn:'hp0'});


/* ================= COMÉRCIOS (2ª folha de sprites) — um de cada vez ================= */
/* objetos de rua recortados da folha: nome → [largura, altura] */
const CST={tree1:[99,124],deadtree:[82,122],smalltree:[56,80],bush:[44,42],fenceblue:[60,67],woodfence:[59,66],gate:[132,114],barrier:[63,57],stop:[46,125],cone:[40,50],
  barrelred:[35,52],extg:[25,48],barrelteal:[29,46],lamp:[38,133],dumpg:[68,50],bluebin:[38,45],trash1:[31,49],crate1:[50,53],crate2:[52,41],barrierb:[71,38],
  redcar:[136,61],taxi:[143,69],dump2:[84,64],dump3:[66,52]};
for(const k in CST)SPR_META['c_'+k]={src:'assets/z/c_'+k+'.png',w:CST[k][0],h:CST[k][1]};
const cdec=(n,x,s)=>MAP.decor.push({n:'c_'+n,x,y:GY+6,s});

/* ---------- 1) SUPERMERCADO ---------- */
SPR_META.zsuper={src:'assets/z/zsuper.png',w:331,h:211};
const SMS=2.0,SMX=6760,SMD=SMX+(188-331/2)*SMS; /* centro da fachada e x da porta (a porta fica em 188 px do sprite) */
MAP.bld.push({n:'zsuper',x:SMX,y:GY+6,s:SMS});
ZN.s1=mkZone('s1','SUPERMERCADO','supermercado',[['csuper']]); /* interior: a imagem já tem 2 "alas" espelhadas */
const sx=ZN.s1.at(0,45),sW=ZN.s1.W;
ZN.c.doors.push({x:SMD,to:'s1',tx:sx,label:'ENTRAR'});
ZN.s1.doors.push({x:sx,to:'c',tx:SMD,label:'SAIR'});
/* zumbis e loot do interior (frações da largura) */
MAP.zs.push(['z1',300,560,'s1'],['z2',640,880,'s1'],['z3',720,960,'s1'],['zfat',960,1200,'s1'],['z4',1060,1260,'s1']);
for(const [t,f] of [['food',.12],['food',.27],['water',.2],['ammo',.36],['food',.5],['bandage',.6],['water',.68],['food',.78],['ammo',.88],['water',.93],['med',.97]])
  MAP.pick.push({x:Math.round(sW*f),y:GY,t,zn:'s1'});
/* objetos de rua ao redor, esquerda e direita da fachada */
cdec('lamp',6130,1.9);cdec('deadtree',6215,2.3);cdec('bush',6290,1.5);cdec('redcar',6360,2.0);cdec('trash1',6460,1.4);
cdec('smalltree',7120,2.2);cdec('dumpg',7170,2.0);cdec('crate1',7250,1.5);cdec('crate2',7295,1.5);cdec('barrierb',7340,1.3);cdec('cone',7385,.95);cdec('barrelred',7415,1.45);cdec('stop',7455,1.5);
MAP.zs.push(['z1',6180,6420],['z2',7120,7330],['zdog',6450,6700]);
MAP.pick.push({x:6240,y:GY,t:'ammo'},{x:7230,y:GY,t:'water'},{x:7360,y:GY,t:'food'});


/* ================= COMÉRCIOS 2–5: FARMÁCIA, LOJA, POSTO e TERMINAL (mesma folha de sprites) ================= */
/* objetos de rua novos recortados da folha: nome → [largura, altura] */
const CST2={policecar:[152,71],ambulance:[154,87],bus:[244,75],moto:[75,62],bike:[62,43],busstop:[40,123],billboard:[127,128],pole1:[57,124],pole2:[41,128],chain:[82,75]};
for(const k in CST2)SPR_META['c_'+k]={src:'assets/z/c_'+k+'.png',w:CST2[k][0],h:CST2[k][1]};
/* interiores (cada imagem = painel da folha + cópia espelhada, como o supermercado). w/h em px do sprite */
const RS2={cfarm:838,cloja:868,cposto:868,cterm:1082};
for(const k in RS2){RS[k]={w:RS2[k],h:190};SPR_META['ri_'+k]={src:'assets/i/'+k+'.png',w:RS2[k],h:190}}
/* fachadas: w/h = tamanho do PNG */
SPR_META.zfarm={src:'assets/z/zfarm.png',w:272,h:209};
SPR_META.zloja={src:'assets/z/zloja.png',w:216,h:184};
SPR_META.zposto={src:'assets/z/zposto.png',w:384,h:190};
SPR_META.zterm={src:'assets/z/zterm.png',w:334,h:214};

/* x do mundo e porta de cada fachada. Porta = posição (px do sprite) → deslocamento do centro × escala */
const BSC=2.0, FRX=7780, LJX=8420, PSX=9250, TMX=10100;
const FRD=FRX+(131-272/2)*BSC, LJD=LJX+(50-216/2)*BSC, PSD=PSX+(118-384/2)*BSC, TMD=TMX+(168-334/2)*BSC;
MAP.bld.push({n:'zfarm',x:FRX,y:GY+6,s:BSC},{n:'zloja',x:LJX,y:GY+6,s:BSC},{n:'zposto',x:PSX,y:GY+6,s:BSC},{n:'zterm',x:TMX,y:GY+6,s:BSC});
MAP.W=11000;ZN.c.W=MAP.W; /* a rua ganhou mais ~3500 px */

/* helper: cria zona de 1 cômodo, porta de saída (esq.) + saída espelhada (dir.), zumbis e loot por fração da largura */
function mkShop(id,name,short,room,doorL,outX,mobs,loot){
  const Z=ZN[id]=mkZone(id,name,short,[[room]]),W=Z.W,sw=RS[room].w;
  const x1=Z.at(0,doorL),x2=Z.at(0,sw-doorL);
  ZN.c.doors.push({x:outX,to:id,tx:x1,label:'ENTRAR'});
  Z.doors.push({x:x1,to:'c',tx:outX,label:'SAIR'},{x:x2,to:'c',tx:outX,label:'SAIR'});
  for(const [t,a,b] of mobs)MAP.zs.push([t,Math.round(W*a),Math.round(W*b),id]);
  for(const [t,f] of loot)MAP.pick.push({x:Math.round(W*f),y:GY,t,zn:id});
}
/* 2) FARMÁCIA — remédios e curativos */
mkShop('f1','FARMÁCIA','farmácia','cfarm',32,FRD,
  [['z1',.28,.48],['z2',.5,.7],['z3',.62,.82],['z4',.78,.95]],
  [['med',.16],['bandage',.27],['med',.38],['bandage',.5],['water',.58],['med',.68],['bandage',.78],['ammo',.88],['med',.95]]);
/* 3) LOJA — roupas (pouca comida, munição escondida) */
mkShop('l1','LOJA','loja','cloja',30,LJD,
  [['z2',.28,.5],['z1',.45,.7],['z3',.62,.85],['zfat',.7,.95]],
  [['ammo',.15],['food',.3],['bandage',.42],['ammo',.55],['water',.65],['ammo',.78],['food',.88],['med',.95]]);
/* 4) POSTO — lanchonete: comida e bebida */
mkShop('g1','POSTO · LANCHONETE','lanchonete do posto','cposto',50,PSD,
  [['z3',.28,.5],['z4',.48,.72],['z1',.6,.85],['zdog',.7,.95]],
  [['food',.14],['water',.24],['food',.36],['water',.46],['ammo',.57],['food',.68],['water',.78],['ammo',.88],['med',.95]]);
/* 5) TERMINAL — sala de espera: munição e água */
mkShop('t1','TERMINAL · SALA DE ESPERA','sala de espera','cterm',55,TMD,
  [['z1',.22,.4],['z4',.38,.56],['z2',.55,.72],['z3',.7,.88],['zfat',.8,.96]],
  [['water',.12],['ammo',.22],['bandage',.33],['ammo',.45],['food',.55],['water',.64],['ammo',.75],['med',.85],['ammo',.95]]);

/* objetos de rua ao redor das fachadas novas (folha: viaturas, ônibus, placas, postes…) */
const cd2=(n,x,s)=>MAP.decor.push({n:'c_'+n,x,y:GY+6,s});
cd2('trash1',7500,1.4);cd2('bush',7640,1.5);cd2('bluebin',7915,1.5);cd2('ambulance',8130,1.75);
cd2('bike',8525,1.9);cd2('crate2',8570,1.5);cd2('woodfence',8620,1.6);
cd2('deadtree',8700,2.3);cd2('barrierb',8765,1.3);cd2('busstop',8810,1.7);cd2('cone',8850,.95);
cd2('barrelred',9430,1.45);cd2('barrelteal',9465,1.4);cd2('moto',9540,1.8);cd2('dumpg',9615,2.0);
cd2('pole2',9650,1.7);cd2('policecar',9715,1.7);cd2('smalltree',9790,2.0);
cd2('chain',10470,1.6);cd2('billboard',10540,1.5);cd2('pole1',10640,1.7);cd2('bus',10790,1.6);cd2('cone',10960,.95);
/* zumbis e itens soltos na rua */
MAP.zs.push(['z1',7520,7740],['z3',7960,8140],['z2',8560,8780],['zdog',8700,8860],['z3',8900,9020],['z4',9300,9560],
            ['zfat',9680,9880],['z2',10140,10360],['z1',10450,10650],['zdog',10620,10880]);
MAP.pick.push({x:7600,y:GY,t:'bandage'},{x:8180,y:GY,t:'med'},{x:8640,y:GY,t:'ammo'},{x:9040,y:GY,t:'food'},
              {x:9380,y:GY,t:'ammo'},{x:9760,y:GY,t:'water'},{x:10300,y:GY,t:'ammo'},{x:10560,y:GY,t:'med'},{x:10900,y:GY,t:'ammo'});
