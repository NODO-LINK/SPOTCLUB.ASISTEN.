// Flyers "premium": escena temática de fondo + producto con luz y sombra + títulos grandes + paneles de datos.
// Uso:  node contenido/fuentes/premium.js especificacion.json
// especificacion.json: { "salida":"muestra-halloween", "tema":"halloween|navidad|... (ver ESCENAS)", "formato":"post|story",
//   "marca":"SPOT CLUB", "pretitulo":"FRANELAS PERSONALIZADAS", "l1":"TU ESTILO", "l2":"DA MIEDO",
//   "datos":["DESDE 1 PIEZA","IMPRESIÓN DTF","ENVÍOS A TODO EL PAÍS"], "insignia":"PÍDELA POR DM", "sello":["3 A 5 DÍAS","HÁBILES"],
//   "pie":"Maracaibo · @spot__club", "diseno":"contenido/disenos/x.png" (PNG transparente; si falta, logo-spotclub.png),
//   "fondo":"contenido/material/foto-x.jpg" (opcional: foto propia o imagen generada fuera en lugar de la escena dibujada),
//   "id","titulo","tipo","caption","fecha" (opcionales: si hay id, la pieza se agrega al panel)
//   "modo":"mockup" (opcional: la prenda sola en estudio, 1080x1080, con "nombre" arriba) }
// La prenda es SIEMPRE la foto real contenido/mockups/base-franela-negra-frente.jpg (ver mockup_franela.py).
// El diseño se estampa sobre la prenda. Sin precio en los flyers (criterio del dueño).
const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');
const dir=path.join(__dirname,'..');

const pagina=`<canvas id="c"></canvas><script>
const spec_modo=s=>s.modo==='mockup'?window.mockup(s):window.hacer(s);

const FONT="Inter,Arial,sans-serif";
let seed=1; const R=()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; }; const rr=(a,b)=>a+(b-a)*R();
const lerp=(a,b,t)=>a+(b-a)*t;
function glow(x,cx,cy,r,col,al){ const g=x.createRadialGradient(cx,cy,0,cx,cy,r); g.addColorStop(0,col.replace('A',al)); g.addColorStop(1,col.replace('A',0)); x.fillStyle=g; x.fillRect(cx-r,cy-r,r*2,r*2); }
function blur(x,px,fn){ x.save(); x.filter='blur('+(px*(window.SS||1))+'px)'; fn(); x.restore(); }

// ───────── escenas ─────────
const ESCENAS={
 halloween:{
  cielo:['#12062a','#34135f','#5a1f86','#0a0412'], luna:{x:.50,y:.56,r:250,col:'#f1e3ff',halo:'rgba(190,120,255,A)'}, acento:'#ff8a1f', texto2:'#ff8a1f',
  dibujar(x,W,H){ casas(x,W,H,'#0c0518','#2b1550'); arboles(x,W,H,'#0a0414'); verja(x,W,H,'#0a0414'); murcielagos(x,W,H,'#08030f'); niebla(x,W,H,'rgba(150,90,230,A)'); brasas(x,W,H,'#ff9a2a'); }
 },
 neon:{
  cielo:['#05050c','#10102a','#240a2e','#05050c'], luna:null, acento:'#e5212e', texto2:'#e5212e',
  dibujar(x,W,H){ ciudad(x,W,H); niebla(x,W,H,'rgba(229,33,46,A)'); brasas(x,W,H,'#ff4a55'); }
 }
};
function casas(x,W,H,col,borde){
  const base=H*.66;
  const casa=(cx,ancho,alto,lado)=>{
    x.save(); x.translate(cx,base); x.fillStyle=col; x.strokeStyle=borde; x.lineWidth=3;
    const w=ancho,h=alto;
    x.beginPath(); x.moveTo(-w/2,0); x.lineTo(-w/2,-h*.55); x.lineTo(0,-h); x.lineTo(w/2,-h*.55); x.lineTo(w/2,0); x.closePath(); x.fill(); x.stroke();
    // torre
    const tx=lado*w*.28, tw=w*.22; x.beginPath(); x.moveTo(tx-tw/2,-h*.6); x.lineTo(tx-tw/2,-h*1.25); x.lineTo(tx,-h*1.55); x.lineTo(tx+tw/2,-h*1.25); x.lineTo(tx+tw/2,-h*.6); x.closePath(); x.fill(); x.stroke();
    // ventanas con luz
    for(const [vx,vy] of [[-w*.22,-h*.3],[w*.18,-h*.3],[tx,-h*1.05],[tx,-h*.8]]){ x.fillStyle='#ffb347'; x.shadowColor='#ff8a1f'; x.shadowBlur=28; x.fillRect(vx-9,vy-16,18,30); x.shadowBlur=0; }
    x.restore();
  };
  casa(W*.12,330,330,1); casa(W*.88,340,360,-1); casa(W*.02,220,250,1);
}
function arboles(x,W,H,col){
  const rama=(px,py,ang,len,gro,prof)=>{ if(prof<=0||len<8) return; const nx=px+Math.cos(ang)*len, ny=py+Math.sin(ang)*len;
    x.strokeStyle=col; x.lineWidth=gro; x.lineCap='round'; x.beginPath(); x.moveTo(px,py); x.lineTo(nx,ny); x.stroke();
    rama(nx,ny,ang-rr(.25,.6),len*rr(.68,.8),gro*.7,prof-1); rama(nx,ny,ang+rr(.25,.6),len*rr(.68,.8),gro*.7,prof-1); if(R()<.35) rama(nx,ny,ang+rr(-.15,.15),len*.6,gro*.6,prof-2); };
  seed=77; rama(W*.36,H*.7,-Math.PI/2-.15,120,16,8); rama(W*.97,H*.72,-Math.PI/2+.25,130,18,8);
}
function verja(x,W,H,col){
  const y=H*.68; x.fillStyle=col; x.fillRect(0,y,W,8); x.fillRect(0,y+60,W,6);
  for(let i=0;i<W;i+=34){ x.beginPath(); x.moveTo(i,y+110); x.lineTo(i,y-30); x.lineTo(i+8,y-48); x.lineTo(i+16,y-30); x.lineTo(i+16,y+110); x.closePath(); x.fill(); }
}
function murcielagos(x,W,H,col){
  const bat=(cx,cy,s,rot)=>{ x.save(); x.translate(cx,cy); x.rotate(rot); x.scale(s,s); x.fillStyle=col; x.beginPath();
    x.moveTo(0,0); x.quadraticCurveTo(-18,-22,-50,-8); x.quadraticCurveTo(-38,-2,-34,12); x.quadraticCurveTo(-24,2,-14,10); x.quadraticCurveTo(-8,2,0,16);
    x.quadraticCurveTo(8,2,14,10); x.quadraticCurveTo(24,2,34,12); x.quadraticCurveTo(38,-2,50,-8); x.quadraticCurveTo(18,-22,0,0); x.fill(); x.restore(); };
  bat(W*.80,H*.43,1.3,-.1); bat(W*.20,H*.40,1,.15); bat(W*.66,H*.36,.8,-.2); bat(W*.88,H*.50,.7,.1);
}
function calabaza(x,cx,cy,r,rot){
  x.save(); x.translate(cx,cy); x.rotate(rot||0);
  glow(x,0,0,r*2.2,'rgba(255,140,30,A)',.45);
  const g=x.createRadialGradient(-r*.25,-r*.3,r*.1,0,0,r*1.15); g.addColorStop(0,'#ffb347'); g.addColorStop(.55,'#f26a0f'); g.addColorStop(1,'#8c2a00');
  x.fillStyle=g; for(const k of [-.55,.55,0]){ x.beginPath(); x.ellipse(r*k,0,r*(k?0.55:0.62),r*.92,0,0,7); x.fill(); }
  x.strokeStyle='rgba(90,25,0,.55)'; x.lineWidth=3; for(const k of [-.32,.32]){ x.beginPath(); x.ellipse(r*k,0,r*.3,r*.88,0,0,7); x.stroke(); }
  x.fillStyle='#4a2a08'; x.beginPath(); x.moveTo(-r*.08,-r*.9); x.lineTo(-r*.16,-r*1.25); x.lineTo(r*.14,-r*1.2); x.lineTo(r*.1,-r*.9); x.fill();
  x.fillStyle='#ffe27a'; x.shadowColor='#ffd24a'; x.shadowBlur=24;
  x.beginPath(); x.moveTo(-r*.45,-r*.2); x.lineTo(-r*.15,-r*.2); x.lineTo(-r*.3,-r*.5); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(r*.45,-r*.2); x.lineTo(r*.15,-r*.2); x.lineTo(r*.3,-r*.5); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(-r*.5,r*.18); x.lineTo(-r*.28,r*.42); x.lineTo(-r*.14,r*.24); x.lineTo(0,r*.46); x.lineTo(r*.14,r*.24); x.lineTo(r*.28,r*.42); x.lineTo(r*.5,r*.18); x.lineTo(r*.3,r*.1); x.lineTo(-r*.3,r*.1); x.closePath(); x.fill();
  x.shadowBlur=0; x.restore();
}
function calabazasFondo(x,W,H){ calabaza(x,W*.07,H*.80,46,-.15); calabaza(x,W*.20,H*.84,30,.1); calabaza(x,W*.93,H*.79,52,.12); }
function niebla(x,W,H,col){ blur(x,26,()=>{ seed=5; for(let i=0;i<9;i++){ const cx=rr(-100,W+100), cy=rr(H*.55,H*1.02), rx=rr(260,520), ry=rr(40,90); x.fillStyle=col.replace('A',rr(.10,.20)); x.beginPath(); x.ellipse(cx,cy,rx,ry,0,0,7); x.fill(); } }); }
function brasas(x,W,H,col){ seed=21; for(let i=0;i<46;i++){ const px=rr(0,W), py=rr(H*.25,H*.95), r=rr(1.2,3.6); x.save(); x.shadowColor=col; x.shadowBlur=14; x.fillStyle=col; x.globalAlpha=rr(.35,.95); x.beginPath(); x.arc(px,py,r,0,7); x.fill(); x.restore(); } }
function ciudad(x,W,H){
  const calle=H*.74; seed=9;
  for(let l=0;l<3;l++){ let px=-30; const col=['#13132c','#1a1a3c','#231f4a'][l], neon=['rgba(120,160,255,.55)','rgba(255,70,110,.6)','rgba(255,70,110,.8)'][l];
    while(px<W+30){ const w=rr(80,170)*(1+l*.1), h=H*rr(.20,.36)*(.8+l*.25), y=calle-h-l*28;
      x.fillStyle=col; x.fillRect(px,y,w,h+l*28+160); x.fillStyle=neon; x.fillRect(px,y,w,3);
      for(let r=0;r<Math.floor(h/34);r++) for(let k=0;k<Math.floor(w/26);k++){ if(R()<.38){ x.fillStyle=R()<.55?'rgba(255,200,120,.85)':R()<.5?'rgba(255,80,110,.85)':'rgba(120,170,255,.85)'; x.fillRect(px+8+k*26,y+14+r*34,12,16); } }
      if(R()<.4 && l>0){ x.save(); x.shadowColor='#ff2a4a'; x.shadowBlur=26; x.fillStyle='#ff2a4a'; x.fillRect(px+w*.2,y+h*.25,w*.1,h*.5); x.restore(); }
      px+=w+rr(4,18); } }
  // calle mojada con reflejos
  const g=x.createLinearGradient(0,calle,0,H); g.addColorStop(0,'#1a1030'); g.addColorStop(1,'#07050f'); x.fillStyle=g; x.fillRect(0,calle,W,H-calle);
  x.save(); x.globalAlpha=.25; blur(x,6,()=>{ for(let i=0;i<14;i++){ x.fillStyle=i%2?'#ff2a4a':'#6a8cff'; x.fillRect(rr(0,W),calle+8,rr(12,36),rr(60,160)); } }); x.restore();
}

// ───────── prenda y mockups ─────────
function trazoFranela(x,w,h){ // dibujada en una caja w×h
  const X=v=>v*w/1000, Y=v=>v*h/1000; x.beginPath();
  x.moveTo(X(380),Y(40)); x.quadraticCurveTo(X(500),Y(150),X(620),Y(40));
  x.lineTo(X(780),Y(95)); x.quadraticCurveTo(X(900),Y(150),X(985),Y(330)); x.lineTo(X(840),Y(420)); x.quadraticCurveTo(X(790),Y(350),X(760),Y(300));
  x.lineTo(X(770),Y(950)); x.quadraticCurveTo(X(500),Y(985),X(230),Y(950)); x.lineTo(X(240),Y(300));
  x.quadraticCurveTo(X(210),Y(350),X(160),Y(420)); x.lineTo(X(15),Y(330)); x.quadraticCurveTo(X(100),Y(150),X(220),Y(95)); x.closePath();
}
function franela(x,cx,cy,w,h,color,disenoImg,opts){
  opts=opts||{}; x.save(); x.translate(cx-w/2,cy-h/2);
  // sombra proyectada
  blur(x,28,()=>{ x.fillStyle='rgba(0,0,0,.55)'; x.beginPath(); x.ellipse(w/2,h*.99,w*.46,h*.05,0,0,7); x.fill(); });
  // cuerpo con degradado de tela
  trazoFranela(x,w,h); const base=x.createLinearGradient(0,0,w,h);
  base.addColorStop(0,lig(color,26)); base.addColorStop(.5,color); base.addColorStop(1,lig(color,-18)); x.fillStyle=base; x.fill();
  x.save(); trazoFranela(x,w,h); x.clip();
  // luz lateral y sombras de volumen
  const lado=x.createLinearGradient(0,0,w,0); lado.addColorStop(0,'rgba(0,0,0,.40)'); lado.addColorStop(.18,'rgba(0,0,0,0)'); lado.addColorStop(.62,'rgba(255,255,255,.07)'); lado.addColorStop(1,'rgba(0,0,0,.45)'); x.fillStyle=lado; x.fillRect(0,0,w,h);
  const arriba=x.createLinearGradient(0,0,0,h); arriba.addColorStop(0,'rgba(255,255,255,.10)'); arriba.addColorStop(.35,'rgba(255,255,255,0)'); arriba.addColorStop(1,'rgba(0,0,0,.32)'); x.fillStyle=arriba; x.fillRect(0,0,w,h);
  // pliegues
  blur(x,7,()=>{ seed=33; for(let i=0;i<9;i++){ const px=rr(w*.22,w*.78), py=rr(h*.28,h*.9), L=rr(h*.12,h*.3); x.strokeStyle=i%2?'rgba(0,0,0,.30)':'rgba(255,255,255,.12)'; x.lineWidth=rr(8,18); x.lineCap='round'; x.beginPath(); x.moveTo(px,py); x.quadraticCurveTo(px+rr(-30,30),py+L/2,px+rr(-24,24),py+L); x.stroke(); } });
  // manga: costura y sombra
  blur(x,5,()=>{ x.strokeStyle='rgba(0,0,0,.55)'; x.lineWidth=14; for(const [a,b,c,d] of [[w*.24,h*.30,w*.16,h*.42],[w*.76,h*.30,w*.84,h*.42]]){ x.beginPath(); x.moveTo(a,b); x.lineTo(c,d); x.stroke(); } });
  // diseño estampado
  if(disenoImg){ const dw=w*(opts.escalaDiseno||.40), dh=dw*disenoImg.naturalHeight/disenoImg.naturalWidth, dx=w/2-dw/2, dy=h*(opts.yDiseno||.33);
    x.save(); x.globalAlpha=.96; x.drawImage(disenoImg,dx,dy,dw,dh); x.restore();
    // la tinta toma la textura de la tela
    x.save(); x.globalCompositeOperation='multiply'; x.globalAlpha=.35; x.fillStyle=x.createLinearGradient(0,dy,0,dy+dh); x.fillStyle.addColorStop&&0; x.restore(); }
  // luz de contorno (la luna está detrás) y trama de la tela
  blur(x,3,()=>{ x.strokeStyle='rgba(210,170,255,.55)'; x.lineWidth=7; trazoFranela(x,w,h); x.stroke(); });
  x.globalAlpha=.07; x.fillStyle='#fff'; seed=51; for(let i=0;i<5200;i++){ x.fillRect(rr(0,w),rr(0,h),1.4,1.4); } x.globalAlpha=1;
  x.restore();
  // cuello (rib)
  x.save(); x.strokeStyle=lig(color,-30); x.lineWidth=h*.035; x.lineCap='round'; x.beginPath(); x.moveTo(w*.38,h*.045); x.quadraticCurveTo(w*.5,h*.155,w*.62,h*.045); x.stroke();
  x.strokeStyle='rgba(255,255,255,.10)'; x.lineWidth=2; x.beginPath(); x.moveTo(w*.39,h*.062); x.quadraticCurveTo(w*.5,h*.165,w*.61,h*.062); x.stroke();
  x.fillStyle='rgba(0,0,0,.65)'; x.beginPath(); x.moveTo(w*.40,h*.05); x.quadraticCurveTo(w*.5,h*.12,w*.60,h*.05); x.quadraticCurveTo(w*.5,h*.075,w*.40,h*.05); x.fill(); x.restore();
  // borde
  trazoFranela(x,w,h); x.strokeStyle='rgba(255,255,255,.10)'; x.lineWidth=2; x.stroke();
  x.restore();
}
function lig(hex,a){ const n=parseInt(hex.slice(1),16); let r=(n>>16)+a,g=((n>>8)&255)+a,b=(n&255)+a; r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b)); return 'rgb('+r+','+g+','+b+')'; }
function losa(x,W,H,yTop,col){ // base de piedra donde "descansa" el producto
  const y0=yTop, y1=yTop+58, y2=H*1.01, xi=W*.10, xd=W*.90, xi2=W*.03, xd2=W*.97;
  const cara=x.createLinearGradient(0,y0,0,y1); cara.addColorStop(0,'#3a2c55'); cara.addColorStop(1,'#241a3a');
  x.fillStyle=cara; x.beginPath(); x.moveTo(xi,y0); x.lineTo(xd,y0); x.lineTo(xd2,y1); x.lineTo(xi2,y1); x.closePath(); x.fill();
  const frente=x.createLinearGradient(0,y1,0,y2); frente.addColorStop(0,'#1c1430'); frente.addColorStop(1,'#07040d'); x.fillStyle=frente; x.fillRect(xi2,y1,xd2-xi2,y2-y1);
  x.strokeStyle='rgba(180,140,255,.28)'; x.lineWidth=3; x.beginPath(); x.moveTo(xi,y0); x.lineTo(xd,y0); x.stroke();
  seed=3; x.strokeStyle='rgba(0,0,0,.35)'; x.lineWidth=2; for(let i=0;i<26;i++){ const px=rr(xi2,xd2), py=rr(y0,y2); x.beginPath(); x.moveTo(px,py); x.lineTo(px+rr(-40,40),py+rr(-14,14)); x.stroke(); }
}

// ───────── composición ─────────
function texto(x,t,px,py,size,w,col,ls,al){ x.save(); x.font=w+' '+size+'px '+FONT; x.letterSpacing=(ls||0)+'px'; x.fillStyle=col; x.textAlign=al||'left'; x.textBaseline='alphabetic'; x.fillText(t,px,py); x.restore(); }
function ancho(x,t,size,w,ls){ x.save(); x.font=w+' '+size+'px '+FONT; x.letterSpacing=(ls||0)+'px'; const m=x.measureText(t).width; x.restore(); return m; }
function panel(x,px,py,w,h,r){ x.save(); x.fillStyle='rgba(255,255,255,.07)'; x.strokeStyle='rgba(255,255,255,.28)'; x.lineWidth=2; x.beginPath(); x.roundRect(px,py,w,h,r); x.fill(); x.stroke(); x.restore(); }

window.mockup=async s=>{
  const c=document.getElementById('c'), W=1080, H=1080; c.width=W; c.height=H; const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,'#17171f'); g.addColorStop(1,'#07070b'); x.fillStyle=g; x.fillRect(0,0,W,H);
  glow(x,W/2,H*.42,620,s.luz||'rgba(229,33,46,A)',.28); glow(x,W/2,H*.38,430,'rgba(255,255,255,A)',.10);
  const sue=x.createLinearGradient(0,H*.82,0,H); sue.addColorStop(0,'rgba(255,255,255,.07)'); sue.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=sue; x.fillRect(0,H*.82,W,H*.18);
  const fi=new Image(); fi.src=s.franelaData; await fi.decode(); const fw=760, fh=fw*fi.naturalHeight/fi.naturalWidth, fy=H*.47;
  blur(x,24,()=>{ x.fillStyle='rgba(0,0,0,.65)'; x.beginPath(); x.ellipse(W/2,fy+fh/2+6,fw*.40,22,0,0,7); x.fill(); });
  x.shadowColor='rgba(255,255,255,.10)'; x.shadowBlur=12; x.drawImage(fi,W/2-fw/2,fy-fh/2,fw,fh); x.shadowBlur=0;
  let logo=null; if(s.logoData){ logo=new Image(); logo.src=s.logoData; await logo.decode(); }
  { const nom=s.marca||'SPOT CLUB', tw=ancho(x,nom,34,900,-.5), lh=40, lw=logo?lh*logo.naturalWidth/logo.naturalHeight:0, tot=lw+(logo?12:0)+tw, x0=W/2-tot/2;
    if(logo) x.drawImage(logo,x0,H-86,lw,lh); texto(x,nom,x0+lw+(logo?12:0),H-54,34,900,'#fff',-.5,'left'); }
  if(s.nombre) texto(x,s.nombre,W/2,92,40,800,'rgba(255,255,255,.92)',6,'center');
  const vg=x.createRadialGradient(W/2,H*.5,H*.35,W/2,H*.5,H*.8); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.5)'); x.fillStyle=vg; x.fillRect(0,0,W,H);
  return c.toDataURL('image/png');
};
window.hacer=async s=>{
  // se dibuja al doble de resolución (supersampling) para que textos, bordes y sombras salgan nítidos; las coordenadas siguen siendo de 1080 px
  const SS=s.escala||2; window.SS=SS;
  const c=document.getElementById('c'), W=1080, H=s.formato==='story'?1920:1350; c.width=W*SS; c.height=H*SS; const x=c.getContext('2d'); x.scale(SS,SS);
  const E=ESCENAS[s.tema]||ESCENAS.neon;
  // cielo
  let fondoImg=null; if(s.fondoData){ fondoImg=new Image(); fondoImg.src=s.fondoData; await fondoImg.decode(); }
  const hayMontaje=!!(s.montajeData&&s.montajeData.length);
  const cielo=x.createLinearGradient(0,0,0,H); cielo.addColorStop(0,E.cielo[0]); cielo.addColorStop(.35,E.cielo[1]); cielo.addColorStop(.62,E.cielo[2]); cielo.addColorStop(1,E.cielo[3]); x.fillStyle=cielo; x.fillRect(0,0,W,H);
  if(s.montajeData&&s.montajeData.length){ // pared de cartas inclinada y oscurecida: fondo propio de la marca
    const ims=[]; for(const d of s.montajeData){ const im=new Image(); im.src=d; await im.decode(); ims.push(im); }
    x.fillStyle='#07070b'; x.fillRect(0,0,W,H); x.save(); x.translate(W/2,H/2); x.rotate(-.18);
    const cw=250, ch=cw*1.457, gap=22; let n=0; for(let r=-4;r<=4;r++){ for(let cI=-4;cI<=4;cI++){ const im=ims[(n++*7+r*3+cI*5+99)%ims.length]; x.drawImage(im,cI*(cw+gap)-cw/2+(r%2?cw/2:0),r*(ch+gap)-ch/2,cw,ch); } }
    x.restore();
    const ve=x.createLinearGradient(0,0,0,H); ve.addColorStop(0,'rgba(6,4,14,.82)'); ve.addColorStop(.5,'rgba(6,4,14,.62)'); ve.addColorStop(1,'rgba(6,4,14,.9)'); x.fillStyle=ve; x.fillRect(0,0,W,H); glow(x,W/2,H*.62,520,'rgba(229,33,46,A)',.30); }
  else if(fondoImg){ const k=Math.max(W/fondoImg.naturalWidth,H/fondoImg.naturalHeight), dw=fondoImg.naturalWidth*k, dh=fondoImg.naturalHeight*k; x.drawImage(fondoImg,(W-dw)*(s.focoX==null?.5:s.focoX),(H-dh)*(s.focoY==null?.5:s.focoY),dw,dh);
    // fondos claros (cielo, paredes blancas): el velo sube solo para que el título y el producto se lean
    let vv=(s.velo==null?.55:s.velo); { const t=document.createElement('canvas'); t.width=16; t.height=16; const tc=t.getContext('2d'); tc.drawImage(fondoImg,0,0,16,16); const dd=tc.getImageData(0,0,16,16).data; let L=0; for(let i=0;i<dd.length;i+=4) L+=(0.299*dd[i]+0.587*dd[i+1]+0.114*dd[i+2])/255; L/=256; if(L>.4) vv=Math.min(.85,Math.max(vv,.5+(L-.4)*1.1)); }
    const ve=x.createLinearGradient(0,0,0,H); ve.addColorStop(0,'rgba(6,4,14,'+vv+')'); ve.addColorStop(.55,'rgba(6,4,14,'+(vv*.7)+')'); ve.addColorStop(1,'rgba(6,4,14,.85)'); x.fillStyle=ve; x.fillRect(0,0,W,H); glow(x,W/2,H*.62,560,E.luna?E.luna.halo:'rgba(229,33,46,A)',.25); }
  if(!fondoImg&&!hayMontaje&&E.luna){ const L=E.luna, lx=W*L.x, ly=H*L.y*(s.formato==='story'?.8:1); glow(x,lx,ly,L.r*3.4,E.luna.halo,.55); const lg=x.createRadialGradient(lx-L.r*.25,ly-L.r*.25,L.r*.1,lx,ly,L.r); lg.addColorStop(0,'#ffffff'); lg.addColorStop(.7,L.col); lg.addColorStop(1,'#b79de0'); x.fillStyle=lg; x.beginPath(); x.arc(lx,ly,L.r,0,7); x.fill();
    x.fillStyle='rgba(120,90,170,.22)'; seed=14; for(let i=0;i<9;i++){ const a=rr(0,6.28), d=rr(0,L.r*.7); x.beginPath(); x.arc(lx+Math.cos(a)*d,ly+Math.sin(a)*d,rr(10,34),0,7); x.fill(); } }
  if(!fondoImg&&!hayMontaje){ seed=2; x.fillStyle='#fff'; for(let i=0;i<70;i++){ x.globalAlpha=rr(.15,.8); x.beginPath(); x.arc(rr(0,W),rr(0,H*.5),rr(.6,1.8),0,7); x.fill(); } x.globalAlpha=1;
  x.save(); if(s.formato==='story'){ x.translate(0,(H-1350)*.55); } E.dibujar(x,W,1350); x.restore(); }
  // degradado oscuro detrás del título para que siempre se lea
  const sc=x.createLinearGradient(0,0,0,H*.40); sc.addColorStop(0,'rgba(4,3,12,.62)'); sc.addColorStop(1,'rgba(4,3,12,0)'); x.fillStyle=sc; x.fillRect(0,0,W,H*.40);
  // producto
  const pw=520, ph=520, py=H-(s.formato==='story'?740:565), pxm=W/2;
  const yLosa=py+ph*.5-6; if(s.cartasData&&s.cartasData.length){} else if(!fondoImg&&!hayMontaje) losa(x,W,H,yLosa,'#2a1f44'); else { blur(x,18,()=>{ x.fillStyle='rgba(0,0,0,.6)'; x.beginPath(); x.ellipse(pxm,yLosa+6,330,30,0,0,7); x.fill(); }); }
  glow(x,pxm,py,520,'rgba(190,120,255,A)',.22);
  let img=null; if(s.disenoData){ img=new Image(); img.src=s.disenoData; await img.decode(); }
  if(s.postersData&&s.postersData.length){ // pósters con marco blanco colgados en la pared: centro grande y a los lados otros más chicos
    const ims=[]; for(const d of s.postersData){ const im=new Image(); im.src=d; await im.decode(); ims.push(im); }
    const k=s.formato==='story'?1.22:1.14, n=ims.length;
    // orden de dibujo: primero los de atrás (extremos), al final el central
    const slots=[[-440,0.58,-.13,0.9,-20],[440,0.58,.13,0.9,-20],[-300,0.78,-.07,1,10],[300,0.78,.07,1,10],[0,1,0,1,-25]];
    const pick=n>=5?slots:n===4?[slots[2],slots[3],[-120,1,-.02,1,-25],[150,0.9,.03,1,5]]:n===3?[slots[2],slots[3],slots[4]]:n===2?[[-190,.92,-.04,1,0],[190,.92,.04,1,0]]:[slots[4]];
    pick.forEach((sl,i)=>{ const im=ims[i%n], pw2=400*k*sl[1], ph2=pw2*1.414, cx=pxm+sl[0]*k, cy=py+(s.formato==='story'?-25:35)+sl[4]*k, br=14;
      x.save(); x.translate(cx,cy); x.rotate(sl[2]); x.globalAlpha=sl[3];
      blur(x,28,()=>{ x.fillStyle='rgba(0,0,0,.65)'; x.fillRect(-pw2/2+10,-ph2/2+22,pw2,ph2); });
      x.fillStyle='#f4f1ea'; x.fillRect(-pw2/2,-ph2/2,pw2,ph2);
      const iw2=pw2-br*2, ih2=ph2-br*2; x.save(); x.beginPath(); x.rect(-iw2/2,-ih2/2,iw2,ih2); x.clip();
      const t=document.createElement('canvas'); t.width=8; t.height=8; const tc=t.getContext('2d'); tc.drawImage(im,0,0,8,8); const transp=tc.getImageData(0,0,1,1).data[3]<250;
      if(transp){ x.fillStyle='#0a0a0e'; x.fillRect(-iw2/2,-ih2/2,iw2,ih2); const f=Math.min(iw2*.84/im.naturalWidth,ih2*.84/im.naturalHeight); x.drawImage(im,-im.naturalWidth*f/2,-im.naturalHeight*f/2,im.naturalWidth*f,im.naturalHeight*f); }
      else{ const f=Math.max(iw2/im.naturalWidth,ih2/im.naturalHeight); x.drawImage(im,-im.naturalWidth*f/2,-im.naturalHeight*f/2,im.naturalWidth*f,im.naturalHeight*f); }
      x.restore(); x.restore(); }); }
  else if(s.prendasData&&s.prendasData.length){ // grupo de prendas (1 a 3), opcionalmente con cartas detrás
    const pr=[]; for(const d of s.prendasData){ const im=new Image(); im.src=d; await im.decode(); pr.push(im); }
    if(s.cartasData&&s.cartasData.length){
      const cs=[]; for(const d of s.cartasData){ const im=new Image(); im.src=d; await im.decode(); cs.push(im); }
      const n=cs.length, cw=s.cartaAncho||320, ch=cw*1.457, cy0=py+140;
      cs.forEach((im,i)=>{ const t=n===1?0:(i/(n-1)-.5), ang=t*.55, dx=t*(cw*1.7); x.save(); x.translate(pxm+dx,cy0+Math.abs(t)*60); x.rotate(ang);
        blur(x,20,()=>{ x.fillStyle='rgba(0,0,0,.7)'; x.beginPath(); x.roundRect(-cw/2+12,-ch/2+20,cw,ch,14); x.fill(); });
        x.beginPath(); x.roundRect(-cw/2,-ch/2,cw,ch,12); x.save(); x.clip(); x.drawImage(im,-cw/2,-ch/2,cw,ch); x.restore();
        x.strokeStyle='rgba(255,255,255,.35)'; x.lineWidth=2; x.beginPath(); x.roundRect(-cw/2,-ch/2,cw,ch,12); x.stroke(); x.restore(); }); }
    const n=pr.length, conC=!!(s.cartasData&&s.cartasData.length), base=(n===1?(s.formato==='story'?820:750):n===2?650:465)*(conC?.78:1)*(s.formato==='story'?1.1:1), sep=n===1?0:n===2?290:262, orden=n===3?[0,2,1]:[...Array(n).keys()];
    orden.forEach(i=>{ const im=pr[i], t=n===1?0:(i-(n-1)/2), fw=base*(n===3&&i===1?1.12:1), fh=fw*im.naturalHeight/im.naturalWidth, cxp=pxm+t*sep, cyp=py-10+(n===3&&i!==1?24:0)-(conC?95:0);
      blur(x,26,()=>{ x.fillStyle='rgba(0,0,0,.6)'; x.beginPath(); x.ellipse(cxp,cyp+fh/2-6,fw*.40,24,0,0,7); x.fill(); });
      x.save(); x.translate(cxp,cyp); x.rotate(n===1?-.035:t*.06); x.shadowColor='rgba(200,150,255,.35)'; x.shadowBlur=16; x.drawImage(im,-fw/2,-fh/2,fw,fh); x.restore(); }); }
  else if(s.cartasData&&s.cartasData.length){ // abanico de cartas con sombra
    const cs=[]; for(const d of s.cartasData){ const im=new Image(); im.src=d; await im.decode(); cs.push(im); }
    const n=cs.length, cw=s.cartaAncho||(s.formato==='story'?400:345), ch=cw*1.457, cx0=pxm, cy0=py+20;
    cs.forEach((im,i)=>{ const t=n===1?0:(i/(n-1)-.5), ang=t*.62, dx=t*(cw*1.55); x.save(); x.translate(cx0+dx,cy0+Math.abs(t)*70); x.rotate(ang);
      blur(x,22,()=>{ x.fillStyle='rgba(0,0,0,.7)'; x.beginPath(); x.roundRect(-cw/2+14,-ch/2+22,cw,ch,16); x.fill(); });
      x.shadowColor='rgba(0,0,0,.6)'; x.shadowBlur=24; x.beginPath(); x.roundRect(-cw/2,-ch/2,cw,ch,14); x.save(); x.clip(); x.drawImage(im,-cw/2,-ch/2,cw,ch); x.restore(); x.shadowBlur=0;
      x.strokeStyle='rgba(255,255,255,.35)'; x.lineWidth=2; x.beginPath(); x.roundRect(-cw/2,-ch/2,cw,ch,14); x.stroke(); x.restore(); }); }
  else if(s.franelaData){ const fi=new Image(); fi.src=s.franelaData; await fi.decode(); const fw=(s.formato==='story'?940:790), fh=fw*fi.naturalHeight/fi.naturalWidth;
    blur(x,26,()=>{ x.fillStyle='rgba(0,0,0,.6)'; x.beginPath(); x.ellipse(pxm,py+fh/2-4,fw*.42,26,0,0,7); x.fill(); });
    x.save(); x.translate(pxm,py); x.rotate(-.035); x.translate(-pxm,-py);
    x.shadowColor='rgba(200,150,255,.35)'; x.shadowBlur=16; x.drawImage(fi,pxm-fw/2,py-fh/2,fw,fh); x.shadowBlur=0; x.restore(); }
  else { x.save(); x.translate(pxm,py); x.rotate(-.045); x.translate(-pxm,-py); franela(x,pxm,py,pw,ph,s.colorProducto||'#0e0e14',img,{escalaDiseno:s.escalaDiseno||.40,yDiseno:s.yDiseno||.31}); x.restore(); }
  if(!fondoImg&&E.dibujar===ESCENAS.halloween.dibujar){ calabaza(x,W*.16,yLosa+10,66,-.1); calabaza(x,W*.27,yLosa+34,38,.1); calabaza(x,W*.86,yLosa+6,76,.12); }
  // textos
  let logo=null; if(s.logoData){ logo=new Image(); logo.src=s.logoData; await logo.decode(); }
  const top=s.formato==='story'?250:64;
  if(logo){ const lh=54, lw=lh*logo.naturalWidth/logo.naturalHeight; x.drawImage(logo,W/2-lw/2-120,top-34,lw,lh); texto(x,s.marca||'SPOT CLUB',W/2-120+lw/2+14,top+8,44,900,'#fff',-1,'left'); }
  const tx=90, ty=top+(s.formato==='story'?190:150);
  texto(x,s.pretitulo||'',tx,ty,36,500,'rgba(255,255,255,.92)',5,'left');
  const tam=(()=>{ let t=126; while(t>70 && Math.max(ancho(x,s.l1||'',t,900,-4),ancho(x,s.l2||'',t,900,-4))>610) t-=4; return t; })();
  texto(x,s.l1||'',tx-4,ty+118+(126-tam)*.2,tam,900,'#ffffff',-4,'left');
  texto(x,s.l2||'',tx-4,ty+236-(126-tam)*.1,tam,900,E.texto2,-4,'left');
  // panel de datos
  const dx=736, dy=ty-62, dw=290, fila=56, dh=22+fila*(s.datos||[]).length;
  if((s.datos||[]).length){ panel(x,dx,dy,dw,dh,20); (s.datos||[]).forEach((d,i)=>{ const yy=dy+22+fila*i+30; x.save(); x.strokeStyle=E.acento; x.lineWidth=4; x.lineCap='round'; x.beginPath(); x.moveTo(dx+18,yy-9); x.lineTo(dx+25,yy-2); x.lineTo(dx+37,yy-18); x.stroke(); x.restore(); texto(x,d,dx+50,yy,19,800,'#fff',.3,'left'); }); }
  // insignia y sello
  const by=H-(s.formato==='story'?330:150);
  if(s.insignia){ const bw=ancho(x,s.insignia,38,900,1)+70; x.save(); x.fillStyle='#fff'; x.beginPath(); x.roundRect(70,by-52,bw,76,12); x.fill(); x.restore(); texto(x,s.insignia,70+35,by,38,900,'#0b0b0f',1,'left'); }
  if(s.sello&&s.sello.length>1){ texto(x,s.sello[0],W-90,by-24,44,900,'#fff',-1,'right'); texto(x,s.sello[1],W-90,by+14,26,700,E.acento,3,'right'); }
  if(s.pie) texto(x,s.pie,W/2,H-(s.formato==='story'?260:46),34,500,'rgba(255,255,255,.95)',.5,'center');
  // viñeta y grano
  const vg=x.createRadialGradient(W/2,H*.5,H*.35,W/2,H*.5,H*.85); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.55)'); x.fillStyle=vg; x.fillRect(0,0,W,H);
  const id=x.getImageData(0,0,W,H), d=id.data; seed=99; for(let i=0;i<d.length;i+=4){ const n=(R()-.5)*14; d[i]+=n; d[i+1]+=n; d[i+2]+=n; } x.putImageData(id,0,0);
  return c.toDataURL('image/png');
};
</script>`;

(async()=>{
  const spec=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1350}}); p.on('pageerror',e=>console.error('página:',e.message)); p.on('console',m=>{ if(m.type()==='error') console.error('consola:',m.text()); });
  await p.setContent('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;500;700;800;900&display=swap" rel="stylesheet">'+pagina);
  await p.evaluate(async()=>{ for(const w of [300,500,700,800,900]) await document.fonts.load(w+' 40px Inter'); await document.fonts.ready; });
  const lp=path.join(dir,'logo-spotclub.png'); if(fs.existsSync(lp)) spec.logoData='data:image/png;base64,'+fs.readFileSync(lp).toString('base64');
  const leer=r=>{ const fp=path.resolve(dir,'..',r); return 'data:image/'+path.extname(fp).slice(1).toLowerCase().replace('jpg','jpeg')+';base64,'+fs.readFileSync(fp).toString('base64'); };
  if(spec.cartas) spec.cartasData=spec.cartas.map(leer);
  if(spec.posters) spec.postersData=spec.posters.map(leer);
  if(spec.montaje) spec.montajeData=spec.montaje.map(leer);
  if(spec.fondo){ const fp=path.resolve(dir,'..',spec.fondo); spec.fondoData='data:image/'+path.extname(fp).slice(1).toLowerCase().replace('jpg','jpeg')+';base64,'+fs.readFileSync(fp).toString('base64'); }
  if(spec.diseno){ const dp=path.resolve(dir,'..',spec.diseno); spec.disenoData='data:image/png;base64,'+fs.readFileSync(dp).toString('base64'); }
  if(spec.espalda&&!spec.prendas){ spec.prendas=[['negra','blanca'].includes(spec.prenda)?spec.prenda:'auto']; spec.lados=['espalda']; }   // un solo diseño grande en la ESPALDA de la prenda
  if(spec.prendas&&spec.prendas.length){   // ["negra","blanca"], ["negra","blanca","hoodie"]... cada una puede llevar su diseño en spec.disenos[i]
    spec.prendasData=spec.prendas.map((t,i)=>{
      const dis=path.resolve(dir,'..',(spec.disenos&&spec.disenos[i])||spec.diseno), tmp=path.join(require('os').tmpdir(),'prenda-'+spec.salida+'-'+i+'.png');
      require('child_process').execFileSync('python3',['-I',path.join(__dirname,'mockup_franela.py'),dis,tmp,...(t==='auto'?[]:['--'+(t==='blanca'?'blanca':t==='hoodie'?'hoodie':'negra')]),...((spec.lados&&spec.lados[i]==='espalda')?['--espalda']:[]),...((spec.escalas&&spec.escalas[i])?['--escala',String(spec.escalas[i])]:[]),...((spec.ys&&spec.ys[i])?['--y',String(spec.ys[i])]:[])],{stdio:'pipe'});
      return 'data:image/png;base64,'+fs.readFileSync(tmp).toString('base64'); });
    spec.disenoData=spec.disenoData||('data:image/png;base64,'+fs.readFileSync(path.resolve(dir,'..',spec.diseno)).toString('base64')); }
  if(spec.diseno&&!spec.franela&&!spec.prendas&&spec.prenda!=='dibujada'&&!spec.cartas){
    const tmp=path.join(require('os').tmpdir(),'franela-'+spec.salida+'.png');
    require('child_process').execFileSync('python3',['-I',path.join(__dirname,'mockup_franela.py'),path.resolve(dir,'..',spec.diseno),tmp,...(spec.escalaDiseno?['--escala',String(spec.escalaDiseno)]:[]),...(spec.yDiseno?['--y',String(spec.yDiseno)]:[]),...(spec.prenda==='blanca'?['--blanca']:spec.prenda==='negra'?['--negra']:[])],{stdio:'pipe'});
    spec.franelaData='data:image/png;base64,'+fs.readFileSync(tmp).toString('base64'); }
  const data=await p.evaluate(s=>spec_modo(s),spec);
  // los flyers se entregan en JPG de máxima calidad (calidad 96, sin submuestreo de color, 2160 px de ancho); los mockups sueltos siguen en PNG
  const EXT=spec.modo==='mockup'?'png':'jpg', out=path.join(dir,'spot-'+spec.salida+'.'+EXT);
  if(EXT==='png') fs.writeFileSync(out,Buffer.from(data.split(',')[1],'base64'));
  else{ const tmpPng=path.join(require('os').tmpdir(),'flyer-'+spec.salida+'.png'); fs.writeFileSync(tmpPng,Buffer.from(data.split(',')[1],'base64'));
    require('child_process').execFileSync('python3',['-I','-c',"import sys;from PIL import Image;im=Image.open(sys.argv[1]).convert('RGB');im.save(sys.argv[2],'JPEG',quality=96,subsampling=0,optimize=True)",tmpPng,out]); fs.unlinkSync(tmpPng); }
  await b.close(); console.log('ok',out);
  // si trae id, la pieza se agrega al panel (Contenido), igual que diario.js
  if(spec.id){ const mp=path.join(dir,'contenido.json'), m=JSON.parse(fs.readFileSync(mp,'utf8')), FORM={post:'Post 4:5',story:'Story 9:16',mockup:'Mockup 1:1'};
    const e={id:spec.id,titulo:spec.titulo,tipo:spec.tipo||'Producto',formato:FORM[spec.modo==='mockup'?'mockup':(spec.formato||'post')],archivos:['spot-'+spec.salida+'.'+EXT],caption:spec.caption||'',fecha:spec.fecha};
    const i=m.piezas.findIndex(q=>q.id===spec.id); if(i>=0) m.piezas[i]=e; else m.piezas.unshift(e); fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n'); console.log('en el panel:',spec.id); }
})();
