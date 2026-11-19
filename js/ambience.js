/* DEAD CITY — trilha de terror por ambiente. Tudo sintetizado na hora com Web Audio (nenhum arquivo de áudio novo).
   • RUA ('c', heliporto): vento, assobio fantasma, drone grave com trítono, metal distante batendo, sino distante.
   • CASA / PRÉDIO (h1, h2, p1, p2): silêncio de cômodo, caixinha de música desafinando, rangidos, passos/pancadas no andar de cima, sussurros.
   • PORÃO (h0): rumor profundo, goteiras com eco, rangidos graves, pancadas surdas.
   • HOSPITAL (hp1, hp2): luz fluorescente zumbindo, respirador, monitor cardíaco (bipe que acelera e vira linha reta), cluster de cordas, rodinha de maca.
   • SUBSOLO / NECROTÉRIO (hp0): câmara fria, goteiras, metal batendo, cluster grave.
   A TENSÃO sobe devagar enquanto você fica no ambiente (cerca de 2 min e meia): começa só com clima, depois entram os
   batimentos, as notas desafinadas, os sussurros e os gritos agudos. Zumbi por perto também sobe a tensão. Mudou de ambiente = recomeça calmo. */
const AMB_ON=true;     /* false = sem trilha */
const AMB_VOL=.6;      /* volume geral da trilha (0–1); os efeitos (tiro etc.) continuam por cima */
const AMB_RISE=150;    /* segundos para a tensão chegar perto do máximo */
const AMB={cur:null,name:null,t:0,ten:.1,mas:null,rev:null};

function ambName(z){z=z||'c';if(z=='c'||z=='hp3')return'city';if(z=='h0')return'cellar';if(z=='hp0')return'morgue';if(z[0]=='h'&&z[1]=='p')return'hosp';return'house'}

function ambInit(){
  if(AMB.mas)return true;
  const x=SFX.ctx;if(!x||!SFX.out)return false;
  const m=x.createGain();m.gain.value=0;m.connect(SFX.out);AMB.mas=m;
  /* eco longo (3 s): cômodos e ruas vazias */
  const len=x.sampleRate*3.2|0,ir=x.createBuffer(2,len,x.sampleRate);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.2)}
  const cv=x.createConvolver();cv.buffer=ir;const rg=x.createGain();rg.gain.value=.9;cv.connect(rg);rg.connect(m);AMB.rev=cv;
  return true;
}

/* ---------- caixa de ferramentas de uma cena ---------- */
function ambHelper(){
  const x=SFX.ctx,out=x.createGain();out.gain.value=0;
  const send=x.createGain();send.gain.value=.4;out.connect(AMB.mas);out.connect(send);send.connect(AMB.rev);
  const srcs=[],tm={};
  const rnd=(a,b)=>a+Math.random()*(b-a),pan=()=>rnd(-.8,.8);
  const h={x,out,srcs,rnd,pan,
    gain(v,dest){const g=x.createGain();g.gain.value=v;if(dest)g.connect(dest);return g},
    filt(type,f,q,dest){const b=x.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q==null?.7:q;if(dest)b.connect(dest);return b},
    osc(type,f,dest){const o=x.createOscillator();o.type=type;o.frequency.value=f;o.connect(dest);o.start();srcs.push(o);return o},
    nz(dest){const s=x.createBufferSource();s.buffer=SFX.nb;s.loop=true;s.start(0,Math.random()*1.5);s.connect(dest);srcs.push(s);return s},
    lfo(param,rate,depth){const o=x.createOscillator(),g=x.createGain();o.frequency.value=rate;g.gain.value=depth;o.connect(g);g.connect(param);o.start();srcs.push(o)},
    /* temporizador: chama fn a cada a–b segundos */
    when(id,dt,a,b,fn){if(tm[id]==null)tm[id]=rnd(a,b);tm[id]-=dt;if(tm[id]<=0){tm[id]=rnd(a,b);fn()}},
    wait(id,s){tm[id]=s},
    panner(dest,p){if(!x.createStereoPanner)return dest;const n=x.createStereoPanner();n.pan.value=p||0;n.connect(dest);return n},
    /* nota curta com decaimento (sino, caixinha, pancada, gota) */
    pluck(f,d,v,type,p,f2){
      const t=x.currentTime+.02,o=x.createOscillator(),g=x.createGain();o.type=type||'sine';
      o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0005,t+d);
      o.connect(g);g.connect(h.panner(out,p));o.start(t);o.stop(t+d+.05)},
    /* rajada de ruído filtrado (sussurro, vento que sobe, estalo); am = tremido em Hz */
    burst(d,type,f1,f2,q,v,p,att,am){
      const t=x.currentTime+.02,s=x.createBufferSource();s.buffer=SFX.nb;s.start(t,Math.random()*1.5);s.stop(t+d+.1);
      const b=h.filt(type,f1,q);b.frequency.setValueAtTime(f1,t);if(f2)b.frequency.exponentialRampToValueAtTime(f2,t+d);
      const e=x.createGain();e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(v,t+(att||d*.4));e.gain.linearRampToValueAtTime(0,t+d);
      s.connect(b);let tail=b;
      if(am){const a=x.createGain();a.gain.value=.5;const o=x.createOscillator(),og=x.createGain();o.frequency.value=am;og.gain.value=.5;o.connect(og);og.connect(a.gain);o.start(t);o.stop(t+d+.1);b.connect(a);tail=a}
      tail.connect(e);e.connect(h.panner(out,p))},
    /* nota sustentada que cresce e some (grito agudo de cordas, linha reta do monitor) */
    swell(o){
      const t=x.currentTime+.02,d=o.d,os=x.createOscillator(),g=x.createGain(),lp=h.filt('lowpass',o.cut||3000,.5);
      os.type=o.type||'sawtooth';os.frequency.setValueAtTime(o.f1,t);os.frequency.linearRampToValueAtTime(o.f2||o.f1,t+d);
      if(o.vib){const l=x.createOscillator(),lg=x.createGain();l.frequency.value=5.5;lg.gain.value=o.f1*o.vib;l.connect(lg);lg.connect(os.frequency);l.start(t);l.stop(t+d+.2)}
      const att=o.att==null?d*.5:o.att,rel=o.rel==null?d*.4:o.rel;
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(o.v,t+att);g.gain.setValueAtTime(o.v,t+d-rel);g.gain.linearRampToValueAtTime(0,t+d);
      os.connect(lp);lp.connect(g);g.connect(h.panner(out,o.p||0));os.start(t);os.stop(t+d+.2)},
    /* batimento (duas pancadas surdas) */
    beat(v){h.pluck(62,.3,v,'sine',0,34);setTimeout(()=>{if(SFX.ctx)h.pluck(54,.3,v*.75,'sine',0,30)},190)},
    heart(dt,ten,from){ /* só aparece quando a tensão passa de 'from'; acelera com ela */
      const per=1.15-.5*ten;h.when('hb',dt,per,per,()=>{if(ten>from)h.beat((ten-from)*.95)})},
    stop(){for(const s of srcs){try{s.stop()}catch(_){}}try{out.disconnect();send.disconnect()}catch(_){}}
  };
  return h;
}

/* ---------- RUA ---------- */
function ambCity(h){
  const x=h.x;
  const w=h.gain(.22,h.out);const wb=h.filt('bandpass',420,.6,w);h.nz(wb);h.lfo(wb.frequency,.06,220);h.lfo(w.gain,.09,.12);          /* vento largo */
  const ws=h.gain(.6,h.out);const wf=h.filt('bandpass',1250,14,ws);h.nz(wf);h.lfo(wf.frequency,.11,300);h.lfo(ws.gain,.07,.4);            /* assobio fantasma */
  const dl=h.filt('lowpass',300,.8,h.out);h.lfo(dl.frequency,.05,110);
  const dg=h.gain(.32,dl);h.osc('sawtooth',55,dg);h.osc('sawtooth',55.35,dg);h.osc('sawtooth',110.4,h.gain(.12,dl));                     /* drone */
  const tg=h.gain(0,dl);h.osc('sawtooth',77.9,tg);                                                                                       /* trítono: entra com a tensão */
  return(dt,ten)=>{
    tg.gain.setTargetAtTime(ten*.3,x.currentTime,2);
    h.when('clang',dt,13-7*ten,26-12*ten,()=>{const f=[210,311,467][Math.random()*3|0],p=h.pan();   /* metal distante, inarmônico */
      h.pluck(f,4,.12,'sine',p);h.pluck(f*2.76,3,.06,'sine',p);h.pluck(f*5.4,1.6,.03,'sine',p)});
    if(ten>.35)h.when('bell',dt,26,48,()=>{const p=h.pan();h.pluck(139,7,.1,'sine',p);h.pluck(139*2.4,5,.05,'sine',p);h.pluck(139*3.7,3,.03,'sine',p)}); /* sino distante */
    if(ten>.7)h.when('rise',dt,28,48,()=>h.burst(6,'bandpass',300,3000,2,.16,0,3.2));                                                       /* subida de ruído */
    h.heart(dt,ten,.5);
  };
}

/* ---------- CASA / PRÉDIO e PORÃO ---------- */
const AMB_BOX=[659.3,698.5,784,880,493.9,523.3,587.3]; /* E frígio: a caixinha de música */
function ambHouse(h,cellar){
  const x=h.x,b=cellar?.5:1;
  const rt=h.gain(cellar?.16:.1,h.out);h.nz(h.filt('lowpass',cellar?110:180,.5,rt));                                /* tom de ambiente */
  h.osc('sine',50,h.gain(.06,h.out));
  const pg=h.gain(.05,h.filt('lowpass',420,.6,h.out));                                                             /* segunda menor batendo (≈6 Hz) */
  h.osc('sine',110*b,pg);h.osc('sine',116.5*b,pg);h.osc('triangle',220*b,h.gain(.3,pg));
  let ix=3;
  return(dt,ten)=>{
    pg.gain.setTargetAtTime(.05+ten*.14,x.currentTime,2);
    if(!cellar){ /* caixinha de música: no começo bonitinha, depois cada vez mais lenta e desafinada */
      h.when('box',dt,1.2+ten*1.2,2.6+ten*2.2,()=>{
        if(ten>.45&&Math.random()<.22){h.wait('box',5+Math.random()*5);return} /* a caixinha para no meio */
        ix=Math.max(0,Math.min(AMB_BOX.length-1,ix+(Math.random()<.5?-1:1)*(1+(Math.random()<.3?1:0))));
        const f=AMB_BOX[ix]*Math.pow(2,ten*70*(Math.random()-.3)/1200),p=-.4+Math.random()*.2;
        h.pluck(f,2.6,.07,'sine',p);h.pluck(f*2.76,1.4,.02,'sine',p)});
    }else h.when('drip',dt,3,8,()=>{const p=h.pan();h.pluck(1700+Math.random()*600,.2,.07,'sine',p,900);setTimeout(()=>{if(SFX.ctx)h.pluck(1400,.15,.03,'sine',p,800)},260)});
    h.when('creak',dt,9-4*ten,19-8*ten,()=>{ /* madeira rangendo */
      const t=x.currentTime+.02,d=.7+Math.random()*.9,o=x.createOscillator(),g=x.createGain(),bp=h.filt('bandpass',(cellar?420:700)+Math.random()*500,7);
      const f=(cellar?60:90)+Math.random()*60;o.type='sawtooth';o.frequency.setValueAtTime(f,t);
      for(let i=1;i<=6;i++)o.frequency.linearRampToValueAtTime(f*(.8+Math.random()*.6),t+d*i/6);
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.05+ten*.05,t+d*.3);g.gain.linearRampToValueAtTime(0,t+d);
      o.connect(bp);bp.connect(g);g.connect(h.panner(h.out,h.pan()));o.start(t);o.stop(t+d+.1)});
    h.when('thump',dt,15-8*ten,30-14*ten,()=>{const p=h.pan();h.pluck(80,.5,.3,'sine',p,38);h.burst(.25,'lowpass',320,140,.5,.12,p,.01)}); /* algo se mexendo */
    if(ten>.3)h.when('whisp',dt,17-8*ten,34-12*ten,()=>h.burst(1.8,'bandpass',2200,2600,5,.05+ten*.04,h.pan(),.6,5+Math.random()*6)); /* sussurros */
    if(ten>.7)h.when('screech',dt,22,40,()=>h.swell({type:'sawtooth',f1:1480,f2:1560,d:3.2,v:.03,p:h.pan(),cut:3200,vib:.006}));        /* cordas agudas */
    h.heart(dt,ten,.45);
  };
}

/* ---------- HOSPITAL e NECROTÉRIO ---------- */
function ambHosp(h,morgue){
  const x=h.x;
  if(!morgue){
    const fl=h.filt('lowpass',500,.6,h.out);h.osc('sawtooth',100,h.gain(.03,fl));h.osc('sine',120,h.gain(.02,h.out));h.osc('sine',7200,h.gain(.004,h.out)); /* luz fluorescente */
    const vg=h.gain(.05,h.out);h.nz(h.filt('lowpass',600,.5,vg));h.lfo(vg.gain,.22,.045);                                                          /* respirador */
  }else{
    h.osc('sawtooth',48,h.gain(.14,h.filt('lowpass',170,.7,h.out)));                                                                                  /* câmara fria */
    const vg=h.gain(.03,h.out);h.nz(h.filt('lowpass',300,.5,vg));h.lfo(vg.gain,.13,.025);
  }
  const k=morgue?.5:1,pd=h.filt('lowpass',900,.6,h.out),pg=h.gain(.02,pd);h.lfo(pg.gain,.07,.01);                                                    /* cluster de cordas */
  [220,233.1,246.9,311.1].forEach(f=>h.osc('triangle',f*k,pg));
  const tt=h.gain(0,h.filt('lowpass',700,.6,h.out));h.osc('sawtooth',155.6*k,tt);                                                                   /* trítono */
  return(dt,ten)=>{
    pg.gain.setTargetAtTime(.02+ten*.12,x.currentTime,2);tt.gain.setTargetAtTime(ten*.07,x.currentTime,2);
    if(!morgue){
      const per=1.3-.65*ten;h.when('bip',dt,per,per*1.1,()=>h.pluck(880,.14,.06+ten*.03,'sine',.15));                                                 /* monitor */
      if(ten>.6)h.when('flat',dt,40,70,()=>h.swell({type:'sine',f1:1000,d:4.2,v:.05,p:.15,att:.02,rel:.25}));                                         /* linha reta */
      h.when('buzz',dt,5,13,()=>h.burst(.35,'highpass',3000,3000,.5,.04,0,.02));                                                                       /* lâmpada falhando */
      h.when('wheel',dt,22-8*ten,42-14*ten,()=>h.swell({type:'sine',f1:2200,f2:2500,d:.8,v:.018,p:h.pan(),att:.2,rel:.3,vib:.01}));                    /* maca rangendo */
    }else{
      h.when('drip',dt,3,8,()=>{const p=h.pan();h.pluck(1500+Math.random()*500,.22,.07,'sine',p,800)});
      h.when('clank',dt,16-6*ten,32-12*ten,()=>{const f=[150,220,330][Math.random()*3|0],p=h.pan();h.pluck(f,3,.1,'sine',p);h.pluck(f*2.76,2,.05,'sine',p);h.pluck(f*5.4,1,.03,'sine',p)}); /* gaveta de metal */
    }
    h.when('door',dt,26-10*ten,50-16*ten,()=>{const p=h.pan();h.pluck(70,.5,.35,'sine',p,34);h.burst(.3,'lowpass',500,200,.5,.12,p,.01)});          /* porta batendo longe */
    if(ten>.3)h.when('whisp',dt,20-8*ten,38-12*ten,()=>h.burst(1.8,'bandpass',2000,2500,5,.05+ten*.04,h.pan(),.6,5+Math.random()*6));
    if(ten>.7)h.when('screech',dt,22,40,()=>h.swell({type:'sawtooth',f1:1320,f2:1400,d:3.2,v:.03,p:h.pan(),cut:3200,vib:.006}));
    h.heart(dt,ten,.5);
  };
}

const AMB_SC={city:h=>ambCity(h),house:h=>ambHouse(h,false),cellar:h=>ambHouse(h,true),hosp:h=>ambHosp(h,false),morgue:h=>ambHosp(h,true)};

/* ---------- troca de ambiente e laço (chamado todo quadro de update()) ---------- */
function ambEnter(nm){
  const x=SFX.ctx,old=AMB.cur;
  if(old){old.h.out.gain.cancelScheduledValues(x.currentTime);old.h.out.gain.setTargetAtTime(0,x.currentTime,1.1);setTimeout(()=>old.h.stop(),6000)}
  AMB.cur=null;AMB.name=nm;AMB.t=0;AMB.ten=.1;
  if(!nm)return;
  const h=ambHelper(),tick=AMB_SC[nm](h);
  h.out.gain.setTargetAtTime(1,x.currentTime+.3,1.8); /* entra devagar */
  AMB.cur={h,tick};
}
function ambUpdate(dt,me){
  if(!AMB_ON||!AMB.mas&&!ambInit()||!sfxReady())return;
  const x=SFX.ctx,play=S.mode=='play'&&me,zone=play?(me.z||'c'):null,nm=play?ambName(zone):null;
  AMB.mas.gain.setTargetAtTime(play?AMB_VOL:0,x.currentTime,.8);
  if(nm!==AMB.name)ambEnter(nm);
  if(!AMB.cur)return;
  AMB.t+=dt;
  let tz=0;for(const z of S.Z){if(z.st==3||z.zn!=zone)continue;const d=Math.abs(z.x-me.x);if(d<520)tz+=(1-d/520)*.12} /* zumbi perto = mais tensão */
  const base=.1+.75*Math.pow(Math.min(1,AMB.t/AMB_RISE),1.2),tg=Math.max(0,Math.min(1,base+.06*Math.sin(AMB.t/23)+Math.min(.25,tz)));
  AMB.ten+=(tg-AMB.ten)*Math.min(1,dt*.35);
  AMB.cur.tick(dt,AMB.ten);
}
