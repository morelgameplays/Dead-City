/* Multiplayer online (PeerJS / WebRTC, mesma tecnologia do Super Irmãos), agora com até 4 jogadores.
   Host = autoridade (zumbis, tiros, dano). Clientes mandam seu estado; o host devolve o "mundo" a ~15 Hz. */
const NET={peer:null,hostConn:null,conns:[],code:'',sendT:0};
const PFX='deadcity-zk-';
const isAuth=()=>!NET.hostConn;
const J=o=>JSON.stringify(o);
function rawSend(conn,o){try{if(conn&&conn.open)conn.send(J(o))}catch(_){}}
function bcast(o,except){for(const h of NET.conns)if(h.ready&&h.conn!==except)rawSend(h.conn,o)}
function netSendTo(pid,o){const h=NET.conns.find(h=>h.id==pid);if(h)rawSend(h.conn,o)}
function netFire(b){const o={t:'f',o:b.o,x:b.x,y:b.y,vx:b.vx,vy:b.vy,l:b.l,zn:b.zn||'c',m:b.m||0,d:b.dmg};if(NET.hostConn)rawSend(NET.hostConn,o);else bcast(o)}
function netPickup(i){if(NET.hostConn)rawSend(NET.hostConn,{t:'pk',i});else bcast({t:'pk',i})}
function damagePlayer(pid,d,fx){if(pid==S.myId)hurtMe(d,fx);else netSendTo(pid,{t:'dmg',d,x:fx})}
function newCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ';let s='';for(let i=0;i<4;i++)s+=a[Math.random()*a.length|0];return s}
function freeId(){for(let i=1;i<4;i++)if(!NET.conns.some(h=>h.id==i))return i;return 0}
function sendRoster(){bcast({t:'roster',l:Object.values(S.players).map(p=>[p.id,p.name,p.ch])})}

function resetNet(){
  try{NET.hostConn&&NET.hostConn.close()}catch(_){}
  for(const h of NET.conns)try{h.conn.close()}catch(_){}
  try{NET.peer&&NET.peer.destroy()}catch(_){}
  NET.peer=NET.hostConn=null;NET.conns=[];NET.code='';S.room='';
}

/* ---- HOST ---- */
function hostRoom(){
  if(!window.Peer){msg('Sem internet: o servidor de salas não carregou.',1);return}
  resetNet();msg('Criando a sala…');
  const code=newCode(),p=new Peer(PFX+code);NET.peer=p;
  p.on('open',()=>{NET.code=S.room=code;beginSession();});
  p.on('error',e=>{if(e.type=='unavailable-id'){hostRoom();return}msg('Erro de rede: '+e.type,1)});
  p.on('connection',conn=>{
    if(NET.conns.length>=3||!freeId()){conn.on('open',()=>{rawSend(conn,{t:'full'});setTimeout(()=>conn.close(),300)});return}
    const h={conn,id:freeId(),ready:0};NET.conns.push(h);
    conn.on('data',d=>onHostData(h,d));
    conn.on('close',()=>dropConn(h));conn.on('error',()=>dropConn(h));
  });
}
function dropConn(h){
  const i=NET.conns.indexOf(h);if(i<0)return;NET.conns.splice(i,1);
  delete S.players[h.id];sendRoster();
}
function onHostData(h,raw){
  let m;try{m=JSON.parse(raw)}catch(_){return}
  if(m.t=='hello'){
    S.players[h.id]=newPlayer(h.id,String(m.n||'Jogador').slice(0,12),m.c=='y'?'y':'k');h.ready=1;
    rawSend(h.conn,{t:'welcome',id:h.id,room:NET.code});rawSend(h.conn,{t:'tk',l:S.taken});rawSend(h.conn,{t:'fl',l:S.fsr});rawSend(h.conn,{t:'drs',l:S.drops});sendRoster();
  }else if(m.t=='s'){
    const p=S.players[h.id];if(p){const z2=m.z||'c';if(p.z!==z2){p.z=z2;p.x=m.x;p.y=m.y} /* trocou de zona: sem deslizar pelo mapa */
      p.tx=m.x;p.ty=m.y;p.face=m.f;p.fk=m.k;p.hp=m.h;p.dead=m.d}
  }else if(m.t=='f'){
    S.B.push({x:m.x,y:m.y,vx:m.vx,vy:m.vy,l:m.l,o:h.id,dmg:m.m?Math.min(3,Math.max(1,m.d|0)):WEAPONS.pistol.dmg,cos:false,zn:m.zn||'c',m:m.m?1:0});if(!m.m)sfxShot(m.x,m.zn||'c',m.y,0);
    bcast({t:'f',o:h.id,x:m.x,y:m.y,vx:m.vx,vy:m.vy,l:m.l,zn:m.zn||'c',m:m.m?1:0},h.conn);
  }else if(m.t=='pk'){S.taken[m.i]=1;bcast({t:'pk',i:m.i},h.conn)}
  else if(m.t=='take')hostTake(h.id,m.k,m.i);
  else if(m.t=='fsr')furnSearchHost(h.id,m.i|0);
  else if(m.t=='drop'){if(ITEMS[m.it])hostAddDrop(m.x,m.zn||'c',m.it,Math.max(1,m.n|0),h.id)}
  else if(m.t=='give'){if(m.to==S.myId)recvGive(m.from,m.it,m.n,m.bk);else netSendTo(m.to,{t:'give',from:m.from,it:m.it,n:m.n,bk:m.bk})}
}

/* ---- CLIENTE ---- */
function joinRoom(code){
  if(!window.Peer){msg('Sem internet: o servidor de salas não carregou.',1);return}
  resetNet();msg('Procurando a sala '+code+'…');
  const p=new Peer();NET.peer=p;
  p.on('error',e=>msg(e.type=='peer-unavailable'?'Não achei essa sala. Confira o código.':'Erro de rede: '+e.type,1));
  p.on('open',()=>{
    const conn=p.connect(PFX+code,{reliable:true});NET.hostConn=conn;
    const to=setTimeout(()=>{if(!conn.open){msg('Não consegui conectar na sala.',1);resetNet()}},10000);
    conn.on('open',()=>{clearTimeout(to);rawSend(conn,{t:'hello',n:MYNAME,c:MYCH})});
    conn.on('data',onClientData);
    conn.on('close',()=>{if(S.mode=='play')toMenu('Conexão com a sala perdida.')});
    conn.on('error',()=>{if(S.mode=='play')toMenu('Conexão com a sala perdida.')});
  });
}
function onClientData(raw){
  let m;try{m=JSON.parse(raw)}catch(_){return}
  switch(m.t){
    case 'full':msg('Sala cheia (máx. 4 jogadores).',1);resetNet();break;
    case 'welcome':S.myId=m.id;S.room=m.room;S.players={};S.players[m.id]=newPlayer(m.id,MYNAME,MYCH);beginSession(true);break;
    case 'roster':{
      const ids=new Set(m.l.map(r=>r[0]));
      for(const [id,n,ch] of m.l)if(id!=S.myId&&!S.players[id])S.players[id]=newPlayer(id,n,ch);
      for(const id in S.players)if(!ids.has(+id))delete S.players[id];break}
    case 'w':applyWorld(m);break;
    case 'f':if(m.o!=S.myId){S.B.push({x:m.x,y:m.y,vx:m.vx,vy:m.vy,l:m.l,o:m.o,dmg:1,cos:true,zn:m.zn||'c',m:m.m?1:0});if(!m.m)sfxShot(m.x,m.zn||'c',m.y,0)}break;
    case 'dmg':hurtMe(m.d,m.x);break;
    case 'pk':S.taken[m.i]=1;break;
    case 'tk':S.taken=m.l;break;
    case 'fl':S.fsr=m.l||MAP.furn.map(()=>0);break;
    case 'fs':furnApply(m);break;
    case 'drs':S.drops=m.l||[];S.drops.forEach(markDrop);break;
    case 'dr':{const d={id:m.id,x:m.x,zn:m.zn,it:m.it,n:m.n,by:m.by};if(!S.drops.some(q=>q.id==d.id)){S.drops.push(d);markDrop(d);sfxDrop(d.x,d.zn,null,d.by==S.myId)}break}
    case 'dx':S.drops=S.drops.filter(d=>d.id!=m.id);break;
    case 'got':recvLoot(m.it,m.n);break;
    case 'give':recvGive(m.from,m.it,m.n,m.bk);break;
    case 'win':S.win=1;break;
    case 'reset':resetLevel();break;
  }
}
function applyWorld(m){
  for(const [id,x,y,f,k,h,d,kl,zn] of m.p){
    if(id==S.myId){const me=S.players[id];if(me)me.kl=kl;continue}
    const p=S.players[id];if(!p)continue;
    const z2=zn||'c';if(p.z!==z2){p.z=z2;p.x=x;p.y=y}
    p.tx=x;p.ty=y;p.face=f;p.fk=k;p.hp=h;p.dead=d;p.kl=kl;
  }
  const quiet=!S._ws;S._ws=1; /* 1º pacote ao entrar na sala: só sincroniza, sem tocar o som de zumbis que já estavam mortos */
  m.z.forEach(([x,d,st,hp,bm,y,cm,wd],i)=>{
    const z=S.Z[i];if(!z)return;z.sx=x;z.d=d;z.hp=hp;
    if(ZT[z.k].climb)climberNet(z,y,cm,wd);
    if((bm||0)!=(z.bm||0)){z.bm=bm||0;z.bt=0;if(z.bm==1&&!quiet)sfxZState(z,1)} /* bebê: engatinha / levanta / corre */
    if(st!=z.st){z.st=st;z.stT=0;if(st==3)z.dead=0;if(!quiet)sfxZState(z,st)}
  });
  S.win=m.w;if(m.ck!=null)S.clk=m.ck;
}

/* ---- envio periódico (~15 Hz) ---- */
function netTick(dt){
  NET.sendT+=dt;if(NET.sendT<.05)return;NET.sendT=0;
  const me=S.players[S.myId];if(!me)return;
  if(NET.hostConn){
    rawSend(NET.hostConn,{t:'s',x:Math.round(me.x),y:Math.round(me.y),f:me.face,k:me.fk,h:me.hp,d:me.dead?1:0,z:me.z||'c'});
  }else if(NET.conns.length){
    const r=Math.round;
    bcast({t:'w',w:S.win,ck:Math.round(S.clk||0),
      p:Object.values(S.players).map(p=>[p.id,r(p.x),r(p.y),p.face,p.fk,p.hp,p.dead?1:0,p.kl,p.z||'c']),
      z:S.Z.map(z=>[r(z.x),z.d,z.st,z.hp,z.bm||0,r(z.y),z.cm||0,z.wd||0])});
  }
}
