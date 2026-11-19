/* Mapa da fase de teste: "Rua Abandonada" (cenário da Fase 6 do Super Irmãos). */
const GY=410, H1=GY-130, H2=GY-250;
const MAP={
  W:3800,
  start:[110,150,190,230],
  plats:[{x:520,y:H1,w:150},{x:1180,y:H1,w:130},{x:1380,y:H2,w:130},{x:2050,y:H1,w:160},{x:2300,y:H1,w:140},
         {x:3000,y:H1,w:150},{x:3250,y:H2,w:130}],
  /* [tipo, x mínimo, x máximo] — patrulha de cada zumbi */
  zs:[['z1',650,850],['z2',950,1150],['z3',1250,1450],['zdog',1550,1800],['z1',1900,2100],['z4',2000,2250],
      ['zfat',2400,2650],['z2',2700,2900],['z3',2950,3100],['zdog',3100,3300],['z4',3350,3500],['zfat',3500,3700],['z1',3250,3400]],
  pick:[{x:595,y:H1,t:'ammo'},{x:1000,y:GY,t:'med'},{x:1445,y:H2,t:'ammo'},{x:1850,y:GY,t:'ammo'},{x:2130,y:H1,t:'med'},
        {x:2800,y:GY,t:'ammo'},{x:3075,y:H1,t:'ammo'},{x:3315,y:H2,t:'med'},{x:3650,y:GY,t:'ammo'}],
  decor:[]
};
/* itens de teste logo depois do ponto de início */
MAP.pick.push({x:330,y:GY,t:'med'},{x:380,y:GY,t:'food'},{x:430,y:GY,t:'bandage'},{x:480,y:GY,t:'water'});
(function(){ /* abre um vão na rua (x 700–1220) para a casa de teste */
  const AT=700,SH=520;
  MAP.plats.forEach(q=>{if(q.x>=AT)q.x+=SH});
  MAP.zs.forEach(z=>{if(z[1]>=AT){z[1]+=SH;z[2]+=SH}});
  MAP.pick.forEach(k=>{if(k.x>=AT)k.x+=SH});
  MAP.W+=SH;
})();
(function(){ /* segundo vão na rua (x 3180–3700) para o prédio novo */
  const AT=3180,SH=520;
  MAP.plats.forEach(q=>{if(q.x>=AT)q.x+=SH});
  MAP.zs.forEach(z=>{if(z[1]>=AT){z[1]+=SH;z[2]+=SH}});
  MAP.pick.forEach(k=>{if(k.x>=AT)k.x+=SH});
  MAP.W+=SH;
})();
MAP.W+=1250; /* trecho final da rua (x 4840–6090): hospital */
MAP.W+=1400; /* trecho dos comércios (x 6090–7490): supermercado… */
(function(){ /* decoração com semente fixa: igual para todos os jogadores */
  let s=7;const rnd=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const BIG=['zbld','zbrick','zbill','zlamp','zlight','zdead','zbld','zbrick'];
  const SM=['zfenc1','zbarr','zhaz','ztire','zbrl','zcrate','zdump','zhyd','zsign','zwood','zcone','zstop','zwarn','ztrash','zjerry','zrock','zcar','zpol','zfence'];
  const pick=a=>a[rnd()*a.length|0];
  for(let x=130;x<MAP.W-200;x+=110+rnd()*170){
    if(x>640&&x<1280)continue; /* vão da casa */
    if(x>3120&&x<3760)continue; /* vão do prédio */
    if(x>4780)continue; /* área do hospital */
    if(rnd()<.45)MAP.decor.push({n:pick(BIG),x,y:GY+6,s:.75+rnd()*.25});
    else{const n=pick(SM);MAP.decor.push({n,x,y:GY+6,s:(n=='zcar'||n=='zpol'?.72:.8)+rnd()*.2})}
  }
  MAP.decor=MAP.decor.filter(d=>SPR_META[d.n]);
})();
