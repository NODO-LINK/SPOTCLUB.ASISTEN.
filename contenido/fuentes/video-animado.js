// Video de ANIMACIÓN dibujada (sin fotos): 15 s, 1080x1920, 30 fps, con efectos de sonido sencillos generados aquí. Lo agrega a contenido/contenido.json.
// Uso:  node contenido/fuentes/video-animado.js especificacion.json
// especificacion.json: { "fecha":"2026-10-28","id":"2026-10-28-video-animado","titulo":"...","caption":"...",
//   "tipo":"proceso" | "carta",                 // proceso: de diseño a franela con prensa DTF; carta: una carta que gira y se revela
//   "fandoms":["ANIME","ROCK","URBANO","GAMES"], // solo para "carta": 4 palabras que salen en el cierre
//   "precio":"10" }                              // opcional: franja final "DESDE $10 · PÍDELA POR DM"
// Todo es dibujo propio con la marca (negro, blanco y rojo): no lleva personajes ni logos con derechos de autor.
const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
const dir=path.join(__dirname,'..');
const FPS=30, DUR=15, W=1080, H=1920, SR=44100;

const pagina=`<canvas id="c" width="${W}" height="${H}"></canvas><script>
const W=${W}, H=${H};
const c=document.getElementById('c'), x=c.getContext('2d'), K='#060608', Wh='#F5F5F5', R='#E5212E';
const F='Inter,Arial,sans-serif', M=90, MAXW=900;
let S={}, LOGO=null;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const ease=t=>{ t=clamp(t); return 1-Math.pow(1-t,3); };
const back=t=>{ t=clamp(t); const s=1.70158; return 1+(s+1)*Math.pow(t-1,3)+s*Math.pow(t-1,2); };
const sc=document.createElement('canvas'); sc.width=W; sc.height=H; const sx=sc.getContext('2d'); sx.fillStyle='rgba(255,255,255,.035)'; for(let y=0;y<H;y+=6) sx.fillRect(0,y,W,2);
function fondo(t){
  x.fillStyle=K; x.fillRect(0,0,W,H); const g=.8+.2*Math.sin(t*2.2);
  let r=x.createRadialGradient(W*.85,H*.12,0,W*.85,H*.12,W*.9); r.addColorStop(0,'rgba(229,33,46,'+(.30*g)+')'); r.addColorStop(1,'rgba(229,33,46,0)'); x.fillStyle=r; x.fillRect(0,0,W,H);
  r=x.createRadialGradient(0,H,0,0,H,W*.9); r.addColorStop(0,'rgba(229,33,46,'+(.22*g)+')'); r.addColorStop(1,'rgba(229,33,46,0)'); x.fillStyle=r; x.fillRect(0,0,W,H);
  x.drawImage(sc,0,0);
  if(LOGO){ x.save(); x.globalAlpha=.06; const lw=W, lh=lw*LOGO.naturalHeight/LOGO.naturalWidth; x.drawImage(LOGO,W*.30,H-lh*.78,lw,lh); x.restore(); }
  x.textBaseline='top'; let tx=M+36;
  if(LOGO){ const lh=56, lw=lh*LOGO.naturalWidth/LOGO.naturalHeight; x.drawImage(LOGO,M,206,lw,lh); tx=M+lw+18; } else { x.fillStyle=R; x.fillRect(M,222,22,22); }
  x.fillStyle=Wh; x.font='900 40px '+F; x.letterSpacing='-.8px'; x.fillText('SPOT CLUB',tx,214);
  x.font='800 30px '+F; x.letterSpacing='1px'; x.globalAlpha=.85; x.textAlign='right'; x.fillText('@SPOT__CLUB',W-150,218); x.textAlign='left'; x.globalAlpha=1;
}
// texto que golpea en t0 (escala, vibración y desfase rojo)
function golpe(t,t0,txt,y,size,color,cx){
  const dt=t-t0; if(dt<0) return; txt=String(txt).toUpperCase();
  let s=size; do{ x.font='900 '+s+'px '+F; x.letterSpacing=(-.045*s)+'px'; if(x.measureText(txt).width<=MAXW||s<=40) break; s-=4; }while(true);
  const k=clamp(1-dt/.22), esc=1+.3*k*k, sh=dt<.16?Math.sin(dt*180)*(1-dt/.16)*7:0, w=x.measureText(txt).width, px=cx==null?(W-w)/2-60:cx;
  x.save(); x.globalAlpha=clamp(dt/.05); x.textBaseline='top'; x.translate(px+w/2+sh,y+s/2); x.scale(esc,esc); x.translate(-w/2,-s/2);
  if(dt<.2){ x.fillStyle=R; x.fillText(txt,-8,0); x.fillStyle='rgba(245,245,245,.35)'; x.fillText(txt,8,0); }
  x.fillStyle=color; x.fillText(txt,0,0); x.restore(); x.letterSpacing='0px';
}
function camiseta(cx,cy,esc,rel,borde){ // silueta de franela, 400x400 centrada
  x.save(); x.translate(cx,cy); x.scale(esc,esc); x.translate(-200,-200); x.beginPath();
  x.moveTo(120,20); x.quadraticCurveTo(200,80,280,20); x.lineTo(380,70); x.lineTo(340,150); x.lineTo(290,125); x.lineTo(290,380); x.lineTo(110,380); x.lineTo(110,125); x.lineTo(60,150); x.lineTo(20,70); x.closePath();
  x.fillStyle=rel; x.fill(); x.lineWidth=5; x.strokeStyle=borde; x.stroke(); x.restore();
}
function logo(cx,cy,w,a){ if(!LOGO) return; const h=w*LOGO.naturalHeight/LOGO.naturalWidth; x.save(); x.globalAlpha=a; x.drawImage(LOGO,cx-w/2,cy-h/2,w,h); x.restore(); }
function vapor(t,cx,cy,t0){ for(let i=0;i<14;i++){ const d=t-t0-i*.035; if(d<0||d>1.1) continue; const a=.35*(1-d/1.1), px=cx+(i-7)*34+Math.sin(i*3+t*4)*10, py=cy-d*220; x.fillStyle='rgba(245,245,245,'+a+')'; x.beginPath(); x.arc(px,py,16+d*40,0,7); x.fill(); } }

function proceso(t){
  const CX=(W-120)/2, CY=1010;
  if(t<3){ golpe(t,.1,'ASÍ SE HACE',420,150,Wh); golpe(t,.6,'TU FRANELA',590,150,R);
    camiseta(CX,1180,2.0,'#111114','#f5f5f5'); x.save(); x.globalAlpha=ease((t-1)/1)*.9; logo(CX,1090,260,1); x.restore(); return; }
  if(t<6){ golpe(t,3,'1 · DISEÑO',380,130,R);
    x.fillStyle='rgba(245,245,245,.06)'; x.fillRect(180,620,600,700); x.lineWidth=4; x.strokeStyle=Wh; x.strokeRect(180,620,600,700);
    const a=ease((t-3.5)/1.2), e=.7+.3*back((t-3.5)/1.2); x.save(); x.translate(480,970); x.scale(e,e); logo(0,0,460,a); x.restore();
    golpe(t,4.8,'TÚ LO ELIGES',1400,86,Wh); return; }
  if(t<9){ golpe(t,6,'2 · IMPRESIÓN DTF',380,112,R);
    const p=clamp((t-6.4)/2.2); x.fillStyle='rgba(120,200,255,.10)'; x.fillRect(180,620,600,700); x.lineWidth=4; x.strokeStyle='rgba(245,245,245,.7)'; x.strokeRect(180,620,600,700);
    x.save(); x.beginPath(); x.rect(180,620,600,700*p); x.clip(); logo(480,970,460,1); x.restore();
    const ly=620+700*p; x.fillStyle=R; x.fillRect(150,ly-4,660,8); x.fillStyle='rgba(229,33,46,.25)'; x.fillRect(150,ly-30,660,26);
    golpe(t,7.2,'PASO A PASO',1400,86,Wh); return; }
  if(t<12){ golpe(t,9,'3 · PRENSA',380,130,R);
    const dx=ease((t-9.1)/.7); camiseta(CX,1090,2.2,'#111114','#f5f5f5');
    const bajar=ease((t-10.1)/.5), sub=ease((t-11.2)/.4), py=620+bajar*(1-sub)*520;
    const sh=(t>10.6&&t<11.3)?Math.sin(t*90)*4:0;
    logo(CX,1030,260*(1.0), (t<10.6)?dx:1);
    x.fillStyle='#d9d9de'; x.fillRect(190+sh,py-220,620,200); x.fillStyle=R; x.fillRect(190+sh,py-30,620,10);
    if(t>10.6) vapor(t,CX,1000,10.6); return; }
  // 4 · lista
  golpe(t,12,'LISTA',380,170,R); const e=.85+.15*back((t-12)/.8); camiseta(CX,1090,2.2*e,'#111114','#f5f5f5'); logo(CX,1030,260*e,1);
  golpe(t,12.6,'TU DISEÑO.',1500,86,Wh); golpe(t,13.1,'TU FRANELA.',1600,86,R);
}
function cartaDibujo(cx,cy,w,h,lado,t){
  x.save(); x.translate(cx,cy); const r=24;
  x.beginPath(); x.roundRect(-w/2,-h/2,w,h,r); x.fillStyle=lado==='dorso'?'#101014':'#17171c'; x.fill(); x.lineWidth=6; x.strokeStyle=Wh; x.stroke();
  x.beginPath(); x.roundRect(-w/2+22,-h/2+22,w-44,h-44,14); x.lineWidth=3; x.strokeStyle='rgba(245,245,245,.5)'; x.stroke();
  if(lado==='dorso'){ x.beginPath(); x.moveTo(0,-h*.28); x.lineTo(w*.30,0); x.lineTo(0,h*.28); x.lineTo(-w*.30,0); x.closePath(); x.lineWidth=5; x.strokeStyle=Wh; x.stroke(); logo(0,0,w*.36,1); }
  else { x.fillStyle='rgba(245,245,245,.08)'; x.fillRect(-w/2+44,-h/2+110,w-88,h*.50); x.fillStyle=Wh; x.beginPath(); x.arc(0,-h*.12,70,0,7); x.fill(); x.beginPath(); x.ellipse(0,h*.14,130,100,0,Math.PI,0); x.fill();
    x.fillStyle=Wh; x.font='900 '+Math.round(44*w/560)+'px '+F; x.letterSpacing='-1px'; x.textAlign='center'; x.fillText('TU PERSONAJE',0,-h/2+Math.round(46*w/560)); x.fillStyle='rgba(245,245,245,.5)'; x.fillRect(-w/2+44,h*.28,w-88,10); x.fillRect(-w/2+44,h*.28+30,(w-88)*.7,10); x.fillStyle=R; x.fillRect(-w/2+44,h*.28+70,(w-88)*.4,10); x.textAlign='left'; x.letterSpacing='0px'; }
  x.restore();
}
function carta(t){
  const CX=(W-120)/2, CY=1010, w=560, h=780;
  if(t<2.4){ golpe(t,.1,'TU CARTA',420,160,Wh); golpe(t,.6,'TU PERSONAJE',600,120,R); return; }
  if(t>=2.4&&t<4.8){ const e=ease((t-2.4)/.8); cartaDibujo(CX,CY+(1-e)*500,w,h,'dorso',t); x.globalAlpha=1; return; }
  if(t>=4.8&&t<6.2){ const k=(t-4.8)/1.4, s=Math.cos(k*Math.PI); x.save(); x.translate(CX,CY); x.scale(Math.abs(s),1+.05*Math.sin(k*Math.PI)); x.translate(-CX,-CY); cartaDibujo(CX,CY,w,h,s>0?'dorso':'frente',t); x.restore(); return; }
  if(t>=6.2&&t<10){ golpe(t,6.3,'CON TU DISEÑO',390,112,R); cartaDibujo(CX,CY,w,h,'frente',t);
    const b=clamp((t-7)/1.2); x.save(); x.beginPath(); x.roundRect(CX-w/2,CY-h/2,w,h,24); x.clip(); x.fillStyle='rgba(255,255,255,.22)'; x.translate(CX-w/2-200+b*(w+400),0); x.rotate(.35); x.fillRect(-30,CY-h,60,h*2); x.restore();
    golpe(t,8.2,'CUALQUIER PERSONAJE',1500,74,Wh); return; }
  if(t>=10&&t<13.2){ cartaDibujo(CX,1330,w*.68,h*.68,'frente',t); const f=S.fandoms||['ANIME','ROCK','URBANO','GAMES']; f.forEach((n,i)=>golpe(t,10+i*.6,n,330+i*150,118,i%2?R:Wh)); return; }
  golpe(t,13.2,'PÍDELA',430,170,Wh); golpe(t,13.6,'POR DM',620,170,R); cartaDibujo(CX,1250,w*.6,h*.6,'frente',t);
}
function dibujar(t){
  fondo(t); (S.tipo==='carta'?carta:proceso)(t);
  if(S.precio&&t>=DURf-3){ const a=clamp((t-(DURf-3))/.3), top=1130+(1-a)*60; x.save(); x.globalAlpha=a; x.fillStyle='rgba(6,6,8,.92)'; x.fillRect(0,top,W,360); x.fillStyle=R; x.fillRect(0,top,W,4); x.textBaseline='top'; x.textAlign='center';
    x.fillStyle=Wh; x.font='800 54px '+F; x.letterSpacing='1px'; x.fillText('HAZ LA TUYA',W/2-60,top+36); x.fillStyle=R; x.font='900 150px '+F; x.letterSpacing='-5px'; x.fillText('DESDE $'+S.precio,W/2-60,top+100); x.fillStyle=Wh; x.font='800 54px '+F; x.letterSpacing='1px'; x.fillText('PÍDELA POR DM',W/2-60,top+272); x.restore(); }
  x.letterSpacing='0px';
}
const DURf=${DUR};
window.preparar=async s=>{ S=s; LOGO=null; if(s.logoData){ LOGO=new Image(); LOGO.src=s.logoData; await LOGO.decode(); } };
window.cuadro=(t,fmt)=>{ dibujar(t); return c.toDataURL(fmt==='png'?'image/png':'image/jpeg',.93); };
</script>`;

// efectos: golpes graves en los momentos clave y un whoosh al cambiar de paso
const MARCAS={ proceso:[[.1,'g'],[.6,'g'],[3,'w'],[6,'w'],[9,'w'],[10.1,'w'],[10.6,'g'],[12,'g'],[12.6,'g'],[13.1,'g']],
               carta:[[.1,'g'],[.6,'g'],[2.4,'w'],[4.8,'w'],[6.2,'g'],[7,'w'],[10,'g'],[10.6,'g'],[11.2,'g'],[11.8,'g'],[13.2,'g'],[13.6,'g']] };
function sonido(tipo){
  const n=Math.round(DUR*SR), a=new Float32Array(n);
  const suma=(t0,dur,f)=>{ const i0=Math.round(t0*SR), l=Math.round(dur*SR); for(let i=0;i<l&&i0+i<n;i++) a[i0+i]+=f(i/SR,i/l); };
  for(const [t0,k] of MARCAS[tipo]){
    if(k==='w') suma(t0-.1,.4,(t,q)=>(Math.random()*2-1)*.18*Math.sin(Math.PI*q));
    else suma(t0,.35,(t,q)=>Math.sin(2*Math.PI*(110-40*q)*t)*.5*(1-q)+Math.sin(2*Math.PI*900*t)*.15*(1-q)*(1-q));
  }
  const pcm=Buffer.alloc(44+n*2); pcm.write('RIFF',0); pcm.writeUInt32LE(36+n*2,4); pcm.write('WAVEfmt ',8); pcm.writeUInt32LE(16,16); pcm.writeUInt16LE(1,20); pcm.writeUInt16LE(1,22);
  pcm.writeUInt32LE(SR,24); pcm.writeUInt32LE(SR*2,28); pcm.writeUInt16LE(2,32); pcm.writeUInt16LE(16,34); pcm.write('data',36); pcm.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++) pcm.writeInt16LE(Math.max(-1,Math.min(1,a[i]))*32000|0,44+i*2);
  return pcm;
}

(async()=>{
  const spec=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  if(!/^[a-z0-9-]+$/.test(spec.id)) throw new Error('id inválido');
  if(!['proceso','carta'].includes(spec.tipo)) throw new Error('tipo debe ser proceso o carta');
  if(spec.precio) spec.precio=String(spec.precio).replace(',','.');
  const tmp=fs.mkdtempSync('/tmp/spotvideo-');
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:W,height:H}});p.on('pageerror',e=>console.error('página:',e.message));
  await p.setContent('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap" rel="stylesheet">'+pagina);
  await p.evaluate(async()=>{await document.fonts.load('800 40px Inter');await document.fonts.load('900 100px Inter');await document.fonts.ready;});
  const lp=path.join(dir,'logo-spotclub.png'); if(fs.existsSync(lp)) spec.logoData='data:image/png;base64,'+fs.readFileSync(lp).toString('base64');
  await p.evaluate(s=>preparar(s),spec);
  for(let i=0;i<FPS*DUR;i++){
    const d=await p.evaluate(t=>cuadro(t,'jpg'),i/FPS);
    fs.writeFileSync(path.join(tmp,String(i).padStart(4,'0')+'.jpg'),Buffer.from(d.split(',')[1],'base64'));
  }
  const poster=await p.evaluate(t=>cuadro(t,'png'),spec.tipo==='carta'?8.4:13.4);
  const posterFile='spot-'+spec.id+'-poster.png', videoFile='spot-'+spec.id+'.mp4';
  fs.writeFileSync(path.join(dir,posterFile),Buffer.from(poster.split(',')[1],'base64'));
  await b.close();
  fs.writeFileSync(path.join(tmp,'sonido.wav'),sonido(spec.tipo));
  execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',String(FPS),'-i',path.join(tmp,'%04d.jpg'),'-i',path.join(tmp,'sonido.wav'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',path.join(dir,videoFile)]);
  fs.rmSync(tmp,{recursive:true,force:true});
  const mp=path.join(dir,'contenido.json'), m=JSON.parse(fs.readFileSync(mp,'utf8'));
  const e={id:spec.id,titulo:spec.titulo,tipo:'Animación',formato:'Video 9:16 · '+DUR+' s',archivos:[videoFile],poster:posterFile,caption:spec.caption,fecha:spec.fecha,turno:spec.turno||'tarde'};
  const i=m.piezas.findIndex(q=>q.id===spec.id); if(i>=0) m.piezas[i]=e; else m.piezas.unshift(e);
  fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n');
  console.log('ok',videoFile,fs.statSync(path.join(dir,videoFile)).size+' bytes');
})();
