/* DEAD CITY — efeitos sonoros. Tudo sintetizado na hora com Web Audio (nenhum arquivo de áudio novo).
   • Gemidos dos zumbis (uns fazem "ããã", outros "uuuu", estilo RE2): ficam mais ALTOS, mais NÍTIDOS e menos "ecoados" quanto mais perto, e vêm do lado certo (estéreo).
   • Tiros (seus e dos outros jogadores), impacto no zumbi, ataque, grunhido de dor, morte, dano no jogador.
   Funciona igual no host, no solo e nos clientes (cada um escuta o que vê na própria tela). */
const SFX={ctx:null,out:null,rev:null,nb:null,voices:0};
const SFX_ZOMBIES=false; /* true = zumbis fazem som · false = zumbis totalmente sem som */
const SFX_RANGE=1100; /* até onde (px) um zumbi ainda é ouvido — maior que a tela, para dar para ouvir antes de ver */

function sfxInit(){
  if(SFX.ctx){if(SFX.ctx.state=='suspended')SFX.ctx.resume().catch(()=>{});return SFX.ctx}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  const x=new AC();SFX.ctx=x;
  const comp=x.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=18;comp.ratio.value=5;comp.attack.value=.004;comp.release.value=.2;
  const m=x.createGain();m.gain.value=.9;m.connect(comp);comp.connect(x.destination);SFX.out=m;
  const nb=x.createBuffer(1,x.sampleRate*2,x.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;SFX.nb=nb;
  /* reverberação curta (ruído com decaimento): sons distantes mandam mais sinal para cá = parecem longe */
  const len=x.sampleRate*1.6|0,ir=x.createBuffer(2,len,x.sampleRate);
  for(let ch=0;ch<2;ch++){const dd=ir.getChannelData(ch);for(let i=0;i<len;i++)dd[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)}
  const cv=x.createConvolver();cv.buffer=ir;const rg=x.createGain();rg.gain.value=.5;cv.connect(rg);rg.connect(m);SFX.rev=cv;
  return x;
}
/* navegadores só liberam áudio depois de um toque/tecla (o "TOQUE PARA JOGAR" já cobre isso) */
['pointerdown','touchstart','touchend','keydown','click'].forEach(ev=>addEventListener(ev,sfxInit,{passive:true}));

/* ---------- peças básicas ---------- */
function sfxNoise(t0,dur){const s=SFX.ctx.createBufferSource();s.buffer=SFX.nb;s.loop=true;s.start(t0,Math.random()*1.5);s.stop(t0+dur);return s}
function sfxBus(vol,pan,cut,wet){ /* entrada → volume → filtro (longe = abafado) → estéreo → saída (+ envio para o eco) */
  const x=SFX.ctx,g=x.createGain();g.gain.value=vol;
  const lp=x.createBiquadFilter();lp.type='lowpass';lp.frequency.value=Math.max(300,Math.min(20000,cut));lp.Q.value=.4;g.connect(lp);
  let tail=lp;
  if(x.createStereoPanner){const p=x.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));lp.connect(p);tail=p}
  tail.connect(SFX.out);
  if(wet>.01){const w=x.createGain();w.gain.value=wet;tail.connect(w);w.connect(SFX.rev)}
  return g;
}
function sfxRel(px,zn,py,range){ /* posição do som em relação a quem está ouvindo (só na mesma zona/cômodo) */
  const me=S.players[S.myId];if(!me||(me.z||'c')!=zn)return null;
  const dx=px-me.x,dy=(py==null?0:py-me.y)*.6,d=Math.hypot(dx,dy);if(d>=range)return null;
  return{d,c:1-d/range,pan:Math.max(-1,Math.min(1,dx/450))*.85};
}
function sfxReady(){const x=SFX.ctx;if(!x)return false;if(x.state=='suspended')x.resume().catch(()=>{});return x.state=='running'}

/* ---------- voz dos zumbis ---------- */
/* f = tom base (Hz) · d = duração · rasp = aspereza · br = respiração/ruído · fs = tamanho da boca (zumbi grande = formantes mais graves) */
const SFXGP={
  norm:{f:128,d:[1.0,1.6],rasp:.28,br:1.0,fs:1},
  deep:{f:96, d:[1.2,1.9],rasp:.34,br:1.0,fs:.93},
  high:{f:200,d:[.9,1.4], rasp:.25,br:1.2,fs:1.08},
  fat: {f:80, d:[1.4,2.1],rasp:.38,br:1.0,fs:.90},
  mut: {f:64, d:[1.5,2.3],rasp:.50,br:1.3,fs:.86},
  run: {f:220,d:[.5,.9],  rasp:.55,br:1.5,fs:1.10},
  dog: {f:250,d:[.35,.7], rasp:.80,br:1.7,fs:1.15},
  haz: {f:115,d:[1.0,1.5],rasp:.32,br:1.0,fs:.95}
};
/* vogais (formantes F1,F2,F3 do começo → fim, ganho de cada um, nas = força do "nariz"):
   a = "ããã" nasal e aberta — FICA aberta o tempo todo (não fecha em "u")
   u = "uuuu" fechada, redonda */
const SFXV={
  a:{s:[760,1230,2550],e:[720,1160,2500],g:[1,.75,.30],nas:.8},
  u:{s:[380,820,2400], e:[320,740,2350], g:[1,.45,.10],nas:.15}
};
/* cada zumbi tem a SUA vogal: uns fazem "ããã", outros fazem "uuuu" (como os zumbis do RE2) */
const sfxVowel=z=>(((z&&z.id||0)*.7548776)%1)<.55?'a':'u';
const sfxPitch=z=>(.88+((z.id*.6180339)%1)*.28)*(z.k=='hbaby'?1.45:1); /* cada zumbi tem o seu próprio tom */
const SFXZV={z1:'norm',z2:'norm',z3:'deep',z4:'high',zdog:'dog',zfat:'fat',
  hcomum:'norm',hfem:'high',hmed:'deep',henf:'high',hgordo:'fat',hmut:'mut',hrun:'run',hhaz:'haz',hmil:'deep',hbaby:'high',zrun:'run',zclimb:'run'};

function sfxGroan(prof,o){
  const x=SFX.ctx;if(!x||SFX.voices>=12)return;
  const P=SFXGP[prof]||SFXGP.norm,V=SFXV[o.vw]||SFXV.a;
  const dur=o.dur||(P.d[0]+Math.random()*(P.d[1]-P.d[0])),dly=o.dly||0,t0=x.currentTime+dly+.01,t1=t0+dur;
  const bus=sfxBus(o.vol,o.pan||0,o.cut||9000,o.wet==null?.15:o.wet);
  const f0=P.f*(o.pf||1),pc=o.p||[.97,1.07,.93]; /* curva de tom suave: quase reta, sem "despencar" para o grave */
  /* cordas vocais: serra com curva de tom + tremido */
  const osc=x.createOscillator();osc.type='sawtooth';
  osc.frequency.setValueAtTime(f0*pc[0],t0);osc.frequency.linearRampToValueAtTime(f0*pc[1],t0+dur*.3);osc.frequency.linearRampToValueAtTime(f0*pc[2],t1);
  const lfo=x.createOscillator(),lg=x.createGain();lfo.frequency.value=4.2+Math.random()*3;lg.gain.value=f0*.035;lfo.connect(lg);lg.connect(osc.frequency);
  /* rouquidão: o volume treme rápido */
  const am=x.createGain();am.gain.value=1-P.rasp*.45;
  const ao=x.createOscillator(),ag=x.createGain();ao.type='square';ao.frequency.value=20+Math.random()*20;ag.gain.value=P.rasp*.45;ao.connect(ag);ag.connect(am.gain);
  osc.connect(am);
  const src=x.createGain();am.connect(src);
  const nz=sfxNoise(t0,dur+.05),ng=x.createGain();ng.gain.value=P.br*.5;nz.connect(ng);ng.connect(src);
  /* boca: 3 formantes da vogal + um "nariz" (~270 Hz) que dá o som de ã. A vogal NÃO muda no meio do gemido */
  const sum=x.createGain();sum.gain.value=3;
  const hp=x.createBiquadFilter();hp.type='highpass';hp.frequency.value=105;hp.Q.value=.6; /* corta o ronco grave */
  const forms=V.s.map((a,i)=>[a*P.fs,V.e[i]*P.fs,V.g[i],[5,6,8][i]]);
  forms.push([270,270,V.nas*.55,5]);
  forms.forEach(([a,b,gn,q])=>{
    const bp=x.createBiquadFilter();bp.type='bandpass';bp.Q.value=q;
    bp.frequency.setValueAtTime(a,t0);bp.frequency.linearRampToValueAtTime(b,t1);
    const g=x.createGain();g.gain.value=gn;src.connect(bp);bp.connect(g);g.connect(sum)});
  const eg=x.createGain(),atk=o.atk||Math.min(.28,dur*.2),hold=Math.max(atk+.01,dur*.6);
  eg.gain.setValueAtTime(0,t0);eg.gain.linearRampToValueAtTime(1,t0+atk);eg.gain.linearRampToValueAtTime(.9,t0+hold);eg.gain.linearRampToValueAtTime(0,t1);
  sum.connect(hp);hp.connect(eg);eg.connect(bus);
  for(const s of[osc,lfo,ao]){s.start(t0);s.stop(t1+.05)}
  SFX.voices++;setTimeout(()=>{SFX.voices--},(dur+dly+.3)*1000);
}

/* ---------- efeitos curtos ---------- */
function sfxEnv(g,t0,a,peak,d){g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(peak,t0+a);g.gain.exponentialRampToValueAtTime(.001,t0+a+d)}
function sfxThud(vol,pan,cut,wet,dly){ /* corpo caindo / pancada */
  const x=SFX.ctx,t0=x.currentTime+(dly||0)+.01,bus=sfxBus(vol,pan,cut,wet);
  const o=x.createOscillator(),g=x.createGain();o.type='sine';o.frequency.setValueAtTime(95,t0);o.frequency.exponentialRampToValueAtTime(38,t0+.22);
  sfxEnv(g,t0,.004,.9,.3);o.connect(g);g.connect(bus);o.start(t0);o.stop(t0+.4);
  const n=sfxNoise(t0,.2),lp=x.createBiquadFilter(),ng=x.createGain();lp.type='lowpass';lp.frequency.value=420;sfxEnv(ng,t0,.003,.5,.14);
  n.connect(lp);lp.connect(ng);ng.connect(bus);
}
function sfxWhoosh(vol,pan,cut,wet,dly){ /* braço cortando o ar */
  const x=SFX.ctx,t0=x.currentTime+(dly||0)+.01,bus=sfxBus(vol,pan,cut,wet);
  const n=sfxNoise(t0,.3),bp=x.createBiquadFilter(),g=x.createGain();bp.type='bandpass';bp.Q.value=1.2;
  bp.frequency.setValueAtTime(350,t0);bp.frequency.exponentialRampToValueAtTime(1700,t0+.22);
  g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(.55,t0+.1);g.gain.linearRampToValueAtTime(0,t0+.26);
  n.connect(bp);bp.connect(g);g.connect(bus);
}
/* tiro da pistola: estalo seco + corpo grave + eco da rua. own=1: tiro do próprio jogador (volume cheio, com cápsula caindo) */
function sfxShot(px,zn,py,own){
  if(!sfxReady())return;const x=SFX.ctx;
  let vol=1,pan=0,cut=14000,wet=.16,dly=0;
  if(!own){const r=sfxRel(px,zn,py,1700);if(!r)return;vol=Math.pow(r.c,1.2);if(vol<.02)return;pan=r.pan;cut=900+9000*r.c*r.c;wet=.2+.5*(1-r.c);dly=Math.min(.35,r.d/4000)} /* longe: mais baixo, abafado, com eco e chegando atrasado */
  const t0=x.currentTime+dly+.005,bus=sfxBus(vol*.9,pan,cut,wet),k=.9+Math.random()*.2;
  const n=sfxNoise(t0,.3),hp=x.createBiquadFilter(),ng=x.createGain();hp.type='highpass';hp.frequency.value=700*k;sfxEnv(ng,t0,.002,1,.11);n.connect(hp);hp.connect(ng);ng.connect(bus);
  const o=x.createOscillator(),og=x.createGain();o.type='sine';o.frequency.setValueAtTime(230*k,t0);o.frequency.exponentialRampToValueAtTime(48,t0+.13);sfxEnv(og,t0,.002,.9,.2);o.connect(og);og.connect(bus);o.start(t0);o.stop(t0+.3);
  const n2=sfxNoise(t0,.6),lp=x.createBiquadFilter(),tg=x.createGain();lp.type='lowpass';lp.frequency.setValueAtTime(2400,t0);lp.frequency.exponentialRampToValueAtTime(350,t0+.45);sfxEnv(tg,t0+.01,.01,.3,.45);n2.connect(lp);lp.connect(tg);tg.connect(bus);
  if(own)[4200+Math.random()*600,6300+Math.random()*800].forEach((f,i)=>{ /* cápsula quicando no chão */
    const t=t0+.28+i*.07,c=x.createOscillator(),cg=x.createGain();c.type='sine';c.frequency.value=f;sfxEnv(cg,t,.001,.1-i*.04,.06);c.connect(cg);cg.connect(bus);c.start(t);c.stop(t+.1)});
}
function sfxClick(){ /* gatilho sem munição */
  if(!sfxReady())return;const x=SFX.ctx,t0=x.currentTime+.005,bus=sfxBus(.5,0,12000,.05);
  const n=sfxNoise(t0,.05),hp=x.createBiquadFilter(),g=x.createGain();hp.type='highpass';hp.frequency.value=2200;sfxEnv(g,t0,.001,.6,.03);n.connect(hp);hp.connect(g);g.connect(bus);
  const o=x.createOscillator(),og=x.createGain();o.type='square';o.frequency.value=1500;sfxEnv(og,t0,.001,.12,.025);o.connect(og);og.connect(bus);o.start(t0);o.stop(t0+.05);
}
function sfxHit(px,zn,py){ /* bala acertando um zumbi */
  if(!sfxReady())return;const x=SFX.ctx,r=sfxRel(px,zn,py,1000);if(!r)return;
  const vol=Math.pow(r.c,1.1)*.75;if(vol<.02)return;
  const t0=x.currentTime+Math.min(.25,r.d/4000)+.005,bus=sfxBus(vol,r.pan,800+6000*r.c*r.c,.1+.4*(1-r.c));
  const n=sfxNoise(t0,.2),lp=x.createBiquadFilter(),g=x.createGain();lp.type='lowpass';lp.frequency.value=1100;sfxEnv(g,t0,.002,.9,.12);n.connect(lp);lp.connect(g);g.connect(bus);
  const n2=sfxNoise(t0,.12),bp=x.createBiquadFilter(),g2=x.createGain();bp.type='bandpass';bp.frequency.value=1800;bp.Q.value=3;sfxEnv(g2,t0,.002,.5,.07);n2.connect(bp);bp.connect(g2);g2.connect(bus); /* esguicho */
  const o=x.createOscillator(),og=x.createGain();o.type='sine';o.frequency.setValueAtTime(150,t0);o.frequency.exponentialRampToValueAtTime(60,t0+.1);sfxEnv(og,t0,.003,.8,.12);o.connect(og);og.connect(bus);o.start(t0);o.stop(t0+.2);
}
function sfxHurt(dead){ /* o jogador levou dano (ou caiu) */
  if(!sfxReady())return;
  /* sem grito do jogador (pedido): só o baque do impacto */
  sfxThud(.8,0,9000,.1,0);
}

/* mudança de estado de um zumbi: 1 ataque · 2 levou tiro · 3 morreu (host chama em setZ, clientes em applyWorld) */
function sfxZState(z,st){
  if(!SFX_ZOMBIES||st==0||!sfxReady())return;const T=ZT[z.k];if(!T)return;
  const r=sfxRel(z.x,z.zn,z.y,SFX_RANGE);if(!r)return;
  const prof=SFXZV[z.k]||'norm',pf=sfxPitch(z),vw=sfxVowel(z),base=Math.pow(r.c,1.25),cut=(prof=='haz'?.55:1)*(700+5500*r.c*r.c),wet=.1+.5*(1-r.c);
  if(base<.02)return;
  if(st==1){ /* ataque: rosnado que sobe de tom + golpe no ar */
    sfxGroan(prof,{vw:'a',pf,dur:.38+Math.random()*.12,vol:base*1.1,pan:r.pan,cut,wet,atk:.04,p:[.95,1.35,1.05]});
    sfxWhoosh(base*.9,r.pan,cut,wet,.16);
  }else if(st==2){ /* grunhido curto de dor */
    sfxGroan(prof,{vw:'a',pf:pf*1.15,dur:.28,vol:base*.8,pan:r.pan,cut,wet,atk:.02,p:[1.25,1,.8]});
  }else if(st==3){ /* gemido longo e grave + corpo batendo no chão */
    sfxGroan(prof,{vw,pf,dur:1.1+Math.random()*.4,vol:base,pan:r.pan,cut,wet,atk:.05,p:[1.05,.97,.75]});
    sfxThud(base*.9,r.pan,cut,wet,.45);
  }
}

/* ---------- gemidos de ambiente: chamado todo quadro, só de quem está jogando ---------- */
function sfxZombies(dt,me){
  if(!SFX_ZOMBIES||!sfxReady())return;
  const zn=me.z||'c';
  for(const z of S.Z){
    if(z.st==3||z.zn!=zn)continue;
    const T=ZT[z.k];if(!T)continue;
    /* velocidade medida (igual no host e nos clientes): correr = perseguindo */
    const sp=z._px===undefined?0:Math.abs(z.x-z._px)/Math.max(dt,.001);z._px=z.x;z._v=(z._v||0)+(sp-(z._v||0))*Math.min(1,dt*8);
    const ch=!!z.ag||z._v>T.spd*1.1;
    if(z._gt===undefined)z._gt=Math.random()*4;
    if(ch&&!z._ch)z._gt=Math.min(z._gt,Math.random()*.4),z._aggro=1; /* acabou de avistar alguém: berra logo */
    z._ch=ch;z._gt-=dt;if(z._gt>0)continue;
    const r=sfxRel(z.x,z.zn,z.y,SFX_RANGE);
    if(!r){z._gt=2+Math.random()*2;continue}
    const c=r.c,prof=SFXZV[z.k]||'norm',aggro=z._aggro;z._aggro=0;
    z._gt=(ch?1.5+Math.random()*2.3:5+Math.random()*6)*(.6+.4*(1-c)); /* perto: geme com mais frequência */
    const vol=Math.pow(c,1.4)*(aggro?1.15:1)*(prof=='fat'||prof=='mut'?1.15:1);
    if(vol<.03)continue;
    const o={vw:sfxVowel(z),pf:sfxPitch(z),vol,pan:r.pan,cut:(prof=='haz'?.55:1)*(600+5600*c*c),wet:.1+.55*(1-c)};
    if(aggro){o.dur=.7+Math.random()*.5;o.atk=.08;o.p=[.95,1.25,.95]}
    sfxGroan(prof,o);
  }
}
