/* DEAD CITY — trilha da abertura: "intro" (cutscene, 17 s + cauda) → "cover" (tema da capa, em loop) → some ao tocar em JOGAR.
   Navegadores só liberam áudio depois de um toque/tecla: se a abertura começar muda, a música entra no primeiro toque, já sincronizada com a cutscene. */
const MUS={a:{intro:new Audio('assets/music/intro.mp3'),cover:new Audio('assets/music/cover.mp3')},want:null,vol:{intro:.8,cover:.75},fd:{}};
MUS.a.cover.loop=true;for(const k in MUS.a){MUS.a[k].preload='auto';MUS.a[k].volume=0}
function musFade(n,to,s,stop){ /* fade linear do volume de n até to em s segundos */
  const a=MUS.a[n];clearInterval(MUS.fd[n]);const from=a.volume,t0=performance.now();
  MUS.fd[n]=setInterval(()=>{const u=Math.min(1,(performance.now()-t0)/(s*1000));a.volume=Math.max(0,Math.min(1,from+(to-from)*u));
    if(u>=1){clearInterval(MUS.fd[n]);if(stop){a.pause()}}},40)}
function musPlay(n,off,fadeIn){
  const a=MUS.a[n];a.volume=0;
  try{a.currentTime=off||0}catch(e){}
  const p=a.play();if(p&&p.catch)p.catch(()=>{});musFade(n,MUS.vol[n],fadeIn||.3)}
function musIntro(){MUS.want='intro';musPlay('intro',0,.4)}
function musCover(natural){ /* a abertura acabou: a capa assume (se foi pulada, corta a intro rápido) */
  MUS.want='cover';musFade('intro',0,natural?2.6:.35,true);musPlay('cover',0,natural?2.4:.9)}
function musStop(){MUS.want=null;for(const k in MUS.a)if(!MUS.a[k].paused)musFade(k,0,.7,true)}
/* desbloqueio no primeiro toque: entra na música que deveria estar tocando agora */
function musUnlock(){
  if(!MUS.want)return;const a=MUS.a[MUS.want];
  if(!a.paused)return;
  if(MUS.want=='intro')musPlay('intro',Math.min(IN.t||0,19),.4);else musPlay('cover',0,.8)}
['pointerdown','touchstart','keydown','click'].forEach(ev=>addEventListener(ev,musUnlock,{passive:true}));
