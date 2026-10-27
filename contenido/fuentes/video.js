// Crea un video vertical de 12 s (1080x1920, 30 fps, sin audio) con animación de texto y lo agrega a contenido/contenido.json.
// Uso:  node contenido/fuentes/video.js especificacion.json
// especificacion.json: {
//   "fecha":"2026-10-27","id":"2026-10-27-video","titulo":"...","tipo":"Video","caption":"...",
//   "gancho":["¿QUÉ DISEÑO","TE PONDRÍAS?"], "gancho_sub":"ELIGE 1, 2 O 3",
//   "ranking_titulo":"ELIGE TU FANDOM", "ranking":["ANIME","BANDAS","ARTISTAS"],
//   "medio":["NOSOTROS LO","IMPRIMIMOS EN DTF"], "medio_sub":"DESDE 1 PIEZA",
//   "cierre":["TU DISEÑO.","TU FRANELA."], "precio":"10" }
// Zonas seguras de Instagram: gancho entre 10% y 35% de alto, sin texto en el 20% inferior ni en el borde derecho.
const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
const dir=path.join(__dirname,'..');
const FPS=30, DUR=12, W=1080, H=1920;

const pagina=`<canvas id="c" width="${W}" height="${H}"></canvas><script>
const W=${W}, H=${H};
const c=document.getElementById('c'), x=c.getContext('2d'), K='#060608', Wh='#F5F5F5', R='#E5212E';
const F='Inter,Arial,sans-serif', MAXW=840, M=90;
let S={};
const up=t=>String(t||'').toUpperCase();
// líneas de escaneo precalculadas
const sc=document.createElement('canvas'); sc.width=W; sc.height=H; const sx=sc.getContext('2d'); sx.fillStyle='rgba(255,255,255,.035)'; for(let y=0;y<H;y+=6) sx.fillRect(0,y,W,2);
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
function fit(t,size,w=900,k=-.045){ let s=size; do{ x.font=w+' '+s+'px '+F; x.letterSpacing=(k*s)+'px'; if(x.measureText(t).width<=MAXW||s<=40) break; s-=4; }while(true); return s; }
// texto que "golpea" en el instante t0: escala, vibración y desfase RGB
function golpe(t,t0,txt,y,size,color,opts={}){
  const dt=t-t0; if(dt<0) return; txt=up(txt); const s=fit(txt,size,900);
  const k=clamp(1-dt/0.22), esc=1+.32*k*k, sh=dt<0.16?Math.sin(dt*180)*(1-dt/0.16)*7:0;
  x.save(); x.globalAlpha=clamp(dt/0.05); x.textBaseline='top'; x.font='900 '+s+'px '+F; x.letterSpacing=(-.045*s)+'px';
  const w=x.measureText(txt).width, cx=(opts.cx!=null?opts.cx:M)+ (opts.centro?(MAXW-w)/2:0);
  x.translate(cx+w/2+sh, y+s/2); x.scale(esc,esc); x.translate(-w/2,-s/2);
  if(dt<0.2){ x.fillStyle=R; x.fillText(txt,-9,0); x.fillStyle='rgba(245,245,245,.35)'; x.fillText(txt,9,0); }
  x.fillStyle=color; x.fillText(txt,0,0); x.restore();
}
// letra o palabra gigante solo con contorno rojo, de adorno
function contorno(t,t0,txt,y,size,alpha){
  const dt=t-t0; if(dt<0) return; x.save(); x.globalAlpha=alpha*clamp(dt/0.25); x.textBaseline='top'; x.font='900 '+size+'px '+F; x.letterSpacing='-20px';
  const w=x.measureText(txt).width, sc=1+.08*clamp(1-dt/0.6); x.translate(M+(MAXW-w)/2+w/2,y+size/2); x.scale(sc,sc); x.translate(-w/2,-size/2);
  x.lineWidth=6; x.strokeStyle=R; x.strokeText(txt,0,0); x.restore();
}
function fondo(t,glow){
  x.fillStyle=K; x.fillRect(0,0,W,H);
  const g=x.createRadialGradient(W*.85,H*.12,0,W*.85,H*.12,W*.9); g.addColorStop(0,'rgba(229,33,46,'+(.30*glow)+')'); g.addColorStop(1,'rgba(229,33,46,0)'); x.fillStyle=g; x.fillRect(0,0,W,H);
  const g2=x.createRadialGradient(0,H,0,0,H,W*.9); g2.addColorStop(0,'rgba(229,33,46,'+(.22*glow)+')'); g2.addColorStop(1,'rgba(229,33,46,0)'); x.fillStyle=g2; x.fillRect(0,0,W,H);
  x.drawImage(sc,0,0);
  // marca arriba
  x.textBaseline='top'; x.fillStyle=R; x.fillRect(M,222,22,22); x.fillStyle=Wh; x.font='900 40px '+F; x.letterSpacing='-.8px'; x.fillText('SPOT CLUB',M+36,214);
  x.font='800 30px '+F; x.letterSpacing='1px'; x.globalAlpha=.85; x.textAlign='right'; x.fillText('@SPOT__CLUB',W-150,218); x.textAlign='left'; x.globalAlpha=1;
}
function dibujar(t){
  const p=S;
  fondo(t,.8+.2*Math.sin(t*2.2));
  if(t<3.0){ // 1 · gancho
    golpe(t,0.0,p.gancho[0],330,150,Wh); golpe(t,0.5,p.gancho[1],500,150,R);
    contorno(t,0.9,'?',760,900,.55);
    golpe(t,1.3,p.gancho_sub,720,56,Wh);
  }else if(t<7.0){ // 2 · ranking
    golpe(t,3.0,p.ranking_titulo,330,104,Wh);
    p.ranking.forEach((r,i)=>{ const t0=3.5+i*1.15, y=640+i*250;
      golpe(t,t0,String(i+1),y,230,R,{cx:M}); golpe(t,t0+0.12,r,y+30,150,Wh,{cx:M+190}); });
  }else if(t<9.5){ // 3 · qué hacemos
    golpe(t,7.0,p.medio[0],330,128,Wh); golpe(t,7.45,p.medio[1],490,128,R); contorno(t,7.6,'DTF',900,520,.5); golpe(t,8.2,p.medio_sub,700,56,Wh);
    const f=clamp(1-(t-7.0)/0.12); if(f>0){ x.fillStyle='rgba(245,245,245,'+(.7*f)+')'; x.fillRect(0,0,W,H); }
  }else{ // 4 · cierre
    golpe(t,9.5,p.cierre[0],330,150,Wh); golpe(t,9.9,p.cierre[1],500,150,R); contorno(t,9.5,'$'+p.precio,720,420,.45);
    const a=clamp((t-10.2)/0.3), top=1130+(1-a)*60;
    x.save(); x.globalAlpha=a; x.fillStyle='rgba(6,6,8,.88)'; x.fillRect(0,top,W,360); x.fillStyle=R; x.fillRect(0,top,W,4);
    x.textBaseline='top'; x.textAlign='center'; x.fillStyle=Wh; x.font='800 54px '+F; x.letterSpacing='1px'; x.fillText('HAZ LA TUYA',W/2-60,top+36);
    x.fillStyle=R; x.font='900 150px '+F; x.letterSpacing='-5px'; x.fillText('DESDE $'+p.precio,W/2-60,top+100);
    x.fillStyle=Wh; x.font='800 54px '+F; x.letterSpacing='1px'; x.fillText('PÍDELA POR DM',W/2-60,top+272); x.restore();
  }
  x.letterSpacing='0px';
}
window.preparar=s=>{S=s;}; window.cuadro=(t,fmt)=>{ dibujar(t); return c.toDataURL(fmt==='png'?'image/png':'image/jpeg',.93); };
</script>`;

(async()=>{
  const spec=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  if(!/^[a-z0-9-]+$/.test(spec.id)) throw new Error('id inválido');
  spec.precio=String(spec.precio||'10').replace(',','.');
  const tmp=fs.mkdtempSync('/tmp/spotvideo-');
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:W,height:H}});p.on('pageerror',e=>console.error('página:',e.message));
  await p.setContent('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap" rel="stylesheet">'+pagina);
  await p.evaluate(async()=>{await document.fonts.load('800 40px Inter');await document.fonts.load('900 100px Inter');await document.fonts.ready;});
  await p.evaluate(s=>preparar(s),spec);
  const N=FPS*DUR;
  for(let i=0;i<N;i++){
    const d=await p.evaluate(t=>cuadro(t,'jpg'),i/FPS);
    fs.writeFileSync(path.join(tmp,String(i).padStart(4,'0')+'.jpg'),Buffer.from(d.split(',')[1],'base64'));
  }
  const poster=await p.evaluate(()=>cuadro(6.6,'png'));
  const posterFile='spot-'+spec.id+'-poster.png', videoFile='spot-'+spec.id+'.mp4';
  fs.writeFileSync(path.join(dir,posterFile),Buffer.from(poster.split(',')[1],'base64'));
  await b.close();
  execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',String(FPS),'-i',path.join(tmp,'%04d.jpg'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-an',path.join(dir,videoFile)]);
  fs.rmSync(tmp,{recursive:true,force:true});
  const mp=path.join(dir,'contenido.json'), m=JSON.parse(fs.readFileSync(mp,'utf8'));
  const e={id:spec.id,titulo:spec.titulo,tipo:spec.tipo||'Video',formato:'Video 9:16 · '+DUR+' s',archivos:[videoFile],poster:posterFile,caption:spec.caption,fecha:spec.fecha};
  const i=m.piezas.findIndex(q=>q.id===spec.id); if(i>=0) m.piezas[i]=e; else m.piezas.unshift(e);
  fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n');
  console.log('ok',videoFile,fs.statSync(path.join(dir,videoFile)).size+' bytes');
})();
