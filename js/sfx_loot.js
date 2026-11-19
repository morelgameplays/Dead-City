/* DEAD CITY — sons do loot. Tudo sintetizado com Web Audio (usa as peças de sfx.js).
   • sfxRummage(k): remexendo o móvel (farfalhar + pancadinha/tilintar conforme o material: metal, madeira ou pano)
   • sfxEmpty():    móvel VAZIO — duas notas ocas descendo + sopro e eco
   • sfxPickup(it): item entrando na mochila (lata, água, atadura/kit) + "plim" de recompensa
   • sfxAmmo():     munição achada (estalos de metal)
   • sfxDrop(...):  item caindo no chão (baque + quicadas); de longe fica mais baixo e abafado */
const PICK_VOL=.28; /* volume do som de coleta de item (0–1) — suba/desça aqui */
const LOOT_MAT=k=>/geladeira|fogao|armario|gaveta|estante_med|carrinho|bancada|freezer|rack|barril|maquina|container|entulho|prateleira|lixo/.test(k)?'metal':/sofa|cama|arara|manequim/.test(k)?'cloth':'wood';

function sfxTink(bus,t,f,v,d){ /* tilintar metálico curto (parciais inarmônicas) */
  const x=SFX.ctx;
  [1,2.76,5.4].forEach((r,i)=>{const o=x.createOscillator(),g=x.createGain();o.type='sine';o.frequency.value=f*r;
    sfxEnv(g,t,.001,v/(1+i*1.5),d/(1+i*.6));o.connect(g);g.connect(bus);o.start(t);o.stop(t+d+.05)});
}
function sfxPing(bus,t,f,v,d){ /* "plim" suave */
  const x=SFX.ctx,o=x.createOscillator(),g=x.createGain();o.type='triangle';o.frequency.value=f;
  sfxEnv(g,t,.004,v,d);o.connect(g);g.connect(bus);o.start(t);o.stop(t+d+.05);
}

function sfxRummage(k){
  if(!sfxReady())return;const x=SFX.ctx,m=LOOT_MAT(k),t0=x.currentTime+.005,bus=sfxBus(.6,(Math.random()-.5)*.3,9000,.1);
  const n=sfxNoise(t0,.3),bp=x.createBiquadFilter(),g=x.createGain();bp.type='bandpass';bp.Q.value=m=='cloth'?.5:1.1;
  const f=(m=='cloth'?900:m=='wood'?1400:2200)*(.8+Math.random()*.5);
  bp.frequency.setValueAtTime(f,t0);bp.frequency.exponentialRampToValueAtTime(f*(Math.random()<.5?.6:1.5),t0+.2);
  sfxEnv(g,t0,.03,.8,.16);n.connect(bp);bp.connect(g);g.connect(bus);
  if(m=='metal')sfxTink(bus,t0+.04+Math.random()*.08,1800+Math.random()*1400,.16,.1);
  else if(m=='wood')sfxThud(.22,0,3000,.1,.04);
}

function sfxEmpty(){
  if(!sfxReady())return;const x=SFX.ctx,t0=x.currentTime+.01,bus=sfxBus(.75,0,5000,.3);
  [[230,0],[170,.22]].forEach(([f,dl])=>{
    const o=x.createOscillator(),g=x.createGain(),lp=x.createBiquadFilter();o.type='triangle';
    o.frequency.setValueAtTime(f,t0+dl);o.frequency.exponentialRampToValueAtTime(f*.78,t0+dl+.3);
    lp.type='lowpass';lp.frequency.value=900;sfxEnv(g,t0+dl,.01,.5,.3);o.connect(lp);lp.connect(g);g.connect(bus);o.start(t0+dl);o.stop(t0+dl+.4)});
  const n=sfxNoise(t0,.6),lp2=x.createBiquadFilter(),ng=x.createGain();lp2.type='lowpass';
  lp2.frequency.setValueAtTime(900,t0);lp2.frequency.exponentialRampToValueAtTime(200,t0+.5);
  sfxEnv(ng,t0,.05,.25,.45);n.connect(lp2);lp2.connect(ng);ng.connect(bus);
  sfxThud(.3,0,1200,.4,0); /* tampa oca */
}

function sfxPickup(it){
  if(!sfxReady())return;const x=SFX.ctx,t0=x.currentTime+.005,bus=sfxBus(PICK_VOL,0,9000,.06);
  if(it=='food')sfxTink(bus,t0,2300,.2,.14); /* lata */
  else if(it=='water'){ /* bolhas de água */
    [0,.09].forEach((dl,i)=>{const o=x.createOscillator(),g=x.createGain();o.type='sine';
      o.frequency.setValueAtTime(320+i*120,t0+dl);o.frequency.exponentialRampToValueAtTime(760+i*200,t0+dl+.09);sfxEnv(g,t0+dl,.005,.25,.1);
      o.connect(g);g.connect(bus);o.start(t0+dl);o.stop(t0+dl+.2)});
  }else{ /* atadura / kit médico: farfalhar de pano e plástico */
    const n=sfxNoise(t0,.25),bp=x.createBiquadFilter(),g=x.createGain();bp.type='bandpass';bp.Q.value=.7;bp.frequency.value=2600;
    sfxEnv(g,t0,.02,.4,.14);n.connect(bp);bp.connect(g);g.connect(bus);
  }
  sfxPing(bus,t0+.08,880,.07,.16);sfxPing(bus,t0+.16,1320,.07,.22); /* plim de recompensa */
}

function sfxAmmo(){
  if(!sfxReady())return;const x=SFX.ctx,t0=x.currentTime+.005,bus=sfxBus(PICK_VOL*1.4,0,9000,.05);
  [0,.07,.15].forEach((dl,i)=>{
    const n=sfxNoise(t0+dl,.05),hp=x.createBiquadFilter(),g=x.createGain();hp.type='highpass';hp.frequency.value=2500;
    sfxEnv(g,t0+dl,.001,.5,.03);n.connect(hp);hp.connect(g);g.connect(bus);
    sfxTink(bus,t0+dl,2800+i*500,.12,.08)});
  sfxThud(.25,0,3000,.05,.2); /* ferrolho fechando */
}

function sfxDrop(px,zn,py,own){
  if(!sfxReady())return;const x=SFX.ctx;
  let vol=.8,pan=0,cut=9000,wet=.12,dly=0;
  if(!own){const r=sfxRel(px,zn,py,900);if(!r)return;vol=Math.pow(r.c,1.1)*.8;if(vol<.03)return;
    pan=r.pan;cut=800+7000*r.c*r.c;wet=.12+.4*(1-r.c);dly=Math.min(.2,r.d/4000)}
  const t0=x.currentTime+dly+Math.random()*.06+.01,bus=sfxBus(vol,pan,cut,wet);
  const o=x.createOscillator(),g=x.createGain();o.type='sine';
  o.frequency.setValueAtTime(150,t0);o.frequency.exponentialRampToValueAtTime(60,t0+.12);sfxEnv(g,t0,.002,.7,.14);o.connect(g);g.connect(bus);o.start(t0);o.stop(t0+.25);
  const n=sfxNoise(t0,.1),lp=x.createBiquadFilter(),ng=x.createGain();lp.type='lowpass';lp.frequency.value=700;sfxEnv(ng,t0,.002,.4,.07);n.connect(lp);lp.connect(ng);ng.connect(bus);
  let t=t0+.09,gap=.09;for(let i=0;i<3;i++){sfxTink(bus,t,1800+Math.random()*1600,.1/(1+i*.6),.07);t+=gap;gap*=.7} /* quicadas */
}
