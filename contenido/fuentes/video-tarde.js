// Video animado de la tarde (15 a 20 s, 1080x1920, 30 fps): texto que aparece palabra por palabra sobre las fotos y clips del dueño,
// con efectos de sonido sencillos generados aquí (sin derechos de autor). Lo agrega a contenido/contenido.json.
// Uso:  node contenido/fuentes/video-tarde.js especificacion.json
// especificacion.json: {
//   "fecha":"2026-10-28","id":"2026-10-28-video-tarde","titulo":"...","tipo":"Humor|Producto|Proceso|Fandom","caption":"...",
//   "escenas":[ {"texto":"CLIENTE: ¿HACES *FRANELAS*?","foto":"contenido/material/foto-1.jpg","dur":4} , ... ],   // máximo 6 palabras por escena; *palabra* sale en rojo
//   "precio":"10"   (opcional: solo en videos de producto; agrega la franja final "DESDE $10 · PÍDELA POR DM"),
//   "cierre":"TEXTO FINAL"   (opcional: línea final sin precio) }
// Zonas seguras de Instagram: texto entre 15% y 75% del alto, sin nada en el 20% inferior ni en el borde derecho.
const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
const dir=path.join(__dirname,'..');
const FPS=30, W=1080, H=1920, SR=44100;

const pagina=`<canvas id="c" width="${W}" height="${H}"></canvas><script>
const W=${W}, H=${H};
const c=document.getElementById('c'), x=c.getContext('2d'), K='#060608', Wh='#F5F5F5', R='#E5212E';
const F='Inter,Arial,sans-serif', MAXW=840, M=90;
let S={}, IMG=[], LOGO=null, ESC=[];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const sc=document.createElement('canvas'); sc.width=W; sc.height=H; const sx=sc.getContext('2d'); sx.fillStyle='rgba(255,255,255,.035)'; for(let y=0;y<H;y+=6) sx.fillRect(0,y,W,2);
function palabras(txt){ return String(txt).toUpperCase().split(/\\s+/).filter(Boolean).map(w=>{ const r=/^\\*.*\\*[.,!?¿¡:]*$/.test(w); return {t:w.replace(/\\*/g,''),r}; }); }
// reparte las palabras en líneas que caben en el ancho
function lineas(ws,size){ x.font='900 '+size+'px '+F; x.letterSpacing=(-.04*size)+'px'; const out=[]; let cur=[],cw=0;
  ws.forEach(w=>{ const ww=x.measureText(w.t+' ').width; if(cw+ww>MAXW&&cur.length){ out.push(cur); cur=[]; cw=0; } cur.push(w); cw+=ww; }); if(cur.length) out.push(cur); return out; }
function fotoFondo(im,t,dur){
  const z=1+.08*clamp(t/dur), iw=im.naturalWidth, ih=im.naturalHeight, k=Math.max(W/iw,H/ih)*z, dw=iw*k, dh=ih*k;
  x.drawImage(im,(W-dw)/2,(H-dh)/2,dw,dh);
  const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,'rgba(6,6,8,.74)'); g.addColorStop(.5,'rgba(6,6,8,.58)'); g.addColorStop(1,'rgba(6,6,8,.84)'); x.fillStyle=g; x.fillRect(0,0,W,H);
}
function marca(){
  if(LOGO){ x.save(); x.globalAlpha=.07; const lw=W, lh=lw*LOGO.naturalHeight/LOGO.naturalWidth; x.drawImage(LOGO,W*.30,H-lh*.78,lw,lh); x.restore(); }
  x.textBaseline='top'; let tx=M+36;
  if(LOGO){ const lh=56, lw=lh*LOGO.naturalWidth/LOGO.naturalHeight; x.drawImage(LOGO,M,206,lw,lh); tx=M+lw+18; } else { x.fillStyle=R; x.fillRect(M,222,22,22); }
  x.fillStyle=Wh; x.font='900 40px '+F; x.letterSpacing='-.8px'; x.fillText('SPOT CLUB',tx,214);
  x.font='800 30px '+F; x.letterSpacing='1px'; x.globalAlpha=.85; x.textAlign='right'; x.fillText('@SPOT__CLUB',W-150,218); x.textAlign='left'; x.globalAlpha=1;
}
function dibujar(t){
  x.fillStyle=K; x.fillRect(0,0,W,H);
  const e=ESC.find(s=>t>=s.t0&&t<s.t0+s.dur)||ESC[ESC.length-1], dt=t-e.t0;
  if(e.im) fotoFondo(e.im,dt,e.dur);
  const glow=.8+.2*Math.sin(t*2.2);
  let g=x.createRadialGradient(W*.85,H*.12,0,W*.85,H*.12,W*.9); g.addColorStop(0,'rgba(229,33,46,'+(.28*glow)+')'); g.addColorStop(1,'rgba(229,33,46,0)'); x.fillStyle=g; x.fillRect(0,0,W,H);
  g=x.createRadialGradient(0,H,0,0,H,W*.9); g.addColorStop(0,'rgba(229,33,46,'+(.2*glow)+')'); g.addColorStop(1,'rgba(229,33,46,0)'); x.fillStyle=g; x.fillRect(0,0,W,H);
  x.drawImage(sc,0,0); marca();
  // texto palabra por palabra
  const ws=e.ws, size=ws.length>4?124:ws.length>2?146:168, ls=lineas(ws,size), lh=size*.98, alto=ls.length*lh, y0=Math.max(360,(H-alto)/2-60);
  let n=0;
  ls.forEach((ln,li)=>{ x.font='900 '+size+'px '+F; x.letterSpacing=(-.04*size)+'px';
    const ancho=ln.reduce((a,w)=>a+x.measureText(w.t+' ').width,0)-x.measureText(' ').width; let px=M+(MAXW-ancho)/2;
    ln.forEach(w=>{ const wt=.25+n*.30, d=dt-wt; n++;
      const wd=x.measureText(w.t).width;
      if(d>=0){ const k=clamp(1-d/.2), esc=1+.28*k*k, sh=d<.14?Math.sin(d*190)*(1-d/.14)*7:0;
        x.save(); x.globalAlpha=clamp(d/.05); x.textBaseline='top'; x.translate(px+wd/2+sh,y0+li*lh+size/2); x.scale(esc,esc); x.translate(-wd/2,-size/2);
        if(d<.18){ x.fillStyle=R; x.fillText(w.t,-8,0); x.fillStyle='rgba(245,245,245,.35)'; x.fillText(w.t,8,0); }
        x.fillStyle=w.r?R:Wh; x.fillText(w.t,0,0); x.restore(); }
      px+=x.measureText(w.t+' ').width; }); });
  // salida suave y destello al cambiar de escena
  const sal=clamp((e.dur-dt)/.25); if(sal<1){ x.fillStyle='rgba(6,6,8,'+(1-sal)*.8+')'; x.fillRect(0,0,W,H); }
  if(dt<.1&&e.i>0){ x.fillStyle='rgba(245,245,245,'+(.5*(1-dt/.1))+')'; x.fillRect(0,0,W,H); }
  // franja final de precio o cierre
  if(S.final&&t>=S.final.t0){ const a=clamp((t-S.final.t0)/.3), top=1130+(1-a)*60;
    x.save(); x.globalAlpha=a; x.fillStyle='rgba(6,6,8,.9)'; x.fillRect(0,top,W,360); x.fillStyle=R; x.fillRect(0,top,W,4);
    x.textBaseline='top'; x.textAlign='center';
    if(S.final.precio){ x.fillStyle=Wh; x.font='800 54px '+F; x.letterSpacing='1px'; x.fillText('HAZ LA TUYA',W/2-60,top+36);
      x.fillStyle=R; x.font='900 150px '+F; x.letterSpacing='-5px'; x.fillText('DESDE $'+S.final.precio,W/2-60,top+100);
      x.fillStyle=Wh; x.font='800 54px '+F; x.letterSpacing='1px'; x.fillText('PÍDELA POR DM',W/2-60,top+272);
    }else{ x.fillStyle=R; x.font='900 110px '+F; x.letterSpacing='-3px'; x.fillText(S.final.texto,W/2-60,top+120); }
    x.restore(); }
  x.letterSpacing='0px';
}
window.preparar=async s=>{ S=s; LOGO=null; ESC=[]; if(s.logoData){ LOGO=new Image(); LOGO.src=s.logoData; await LOGO.decode(); }
  let t0=0; for(let i=0;i<s.escenas.length;i++){ const e=s.escenas[i], o={i,t0,dur:e.dur,ws:palabras(e.texto)}; if(e.fotoData){ o.im=new Image(); o.im.src=e.fotoData; await o.im.decode(); } ESC.push(o); t0+=e.dur; } };
window.cuadro=(t,fmt)=>{ dibujar(t); return c.toDataURL(fmt==='png'?'image/png':'image/jpeg',.93); };
</script>`;

// sonido sencillo: un "tick" por palabra, un "whoosh" al cambiar de escena y un golpe grave al final
function sonido(spec,total){
  const n=Math.round(total*SR), a=new Float32Array(n);
  const suma=(t0,dur,f)=>{ const i0=Math.round(t0*SR), l=Math.round(dur*SR); for(let i=0;i<l&&i0+i<n;i++) a[i0+i]+=f(i/SR,i/l); };
  let t0=0;
  spec.escenas.forEach((e,si)=>{
    if(si>0) suma(t0-.05,.35,(t,k)=>(Math.random()*2-1)*.18*Math.sin(Math.PI*k)*(1-k*.4));
    const nw=String(e.texto).split(/\s+/).filter(Boolean).length;
    for(let w=0;w<nw;w++) suma(t0+.25+w*.30,.07,(t,k)=>Math.sin(2*Math.PI*(900+w*70)*t)*.28*(1-k)*(1-k));
    t0+=e.dur;
  });
  if(spec._final) suma(spec._final,.5,(t,k)=>Math.sin(2*Math.PI*(95-30*k)*t)*.55*(1-k));
  const pcm=Buffer.alloc(44+n*2); pcm.write('RIFF',0); pcm.writeUInt32LE(36+n*2,4); pcm.write('WAVEfmt ',8); pcm.writeUInt32LE(16,16); pcm.writeUInt16LE(1,20); pcm.writeUInt16LE(1,22);
  pcm.writeUInt32LE(SR,24); pcm.writeUInt32LE(SR*2,28); pcm.writeUInt16LE(2,32); pcm.writeUInt16LE(16,34); pcm.write('data',36); pcm.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++) pcm.writeInt16LE(Math.max(-1,Math.min(1,a[i]))*32000|0,44+i*2);
  return pcm;
}

(async()=>{
  const spec=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  if(!/^[a-z0-9-]+$/.test(spec.id)) throw new Error('id inválido');
  const total=spec.escenas.reduce((a,e)=>a+e.dur,0);
  if(total<15||total>20) throw new Error('El video debe durar de 15 a 20 s; suma '+total);
  spec.escenas.forEach(e=>{ if(String(e.texto).split(/\s+/).filter(Boolean).length>6) throw new Error('Máximo 6 palabras por escena: '+e.texto); });
  if(spec.precio||spec.cierre){ spec.final={t0:total-3,precio:spec.precio?String(spec.precio).replace(',','.'):null,texto:String(spec.cierre||'').toUpperCase()}; spec._final=total-3; }
  const tmp=fs.mkdtempSync('/tmp/spotvideo-');
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:W,height:H}});p.on('pageerror',e=>console.error('página:',e.message));
  await p.setContent('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap" rel="stylesheet">'+pagina);
  await p.evaluate(async()=>{await document.fonts.load('800 40px Inter');await document.fonts.load('900 100px Inter');await document.fonts.ready;});
  for(const [i,e] of spec.escenas.entries()){
    if(!e.foto) continue;
    let ruta=path.resolve(dir,'..',e.foto); if(!ruta.startsWith(path.join(dir,'material'))) throw new Error('El material debe estar en contenido/material/');
    if(/\.(mp4|mov|m4v|webm)$/i.test(ruta)){ const out=path.join(tmp,'clip-'+i+'.jpg'); execFileSync('ffmpeg',['-y','-loglevel','error','-ss','1','-i',ruta,'-frames:v','1','-q:v','2',out]); ruta=out; }
    const ext=path.extname(ruta).slice(1).toLowerCase().replace('jpg','jpeg');
    e.fotoData='data:image/'+ext+';base64,'+fs.readFileSync(ruta).toString('base64');
  }
  const lp=path.join(dir,'logo-spotclub.png'); if(fs.existsSync(lp)) spec.logoData='data:image/png;base64,'+fs.readFileSync(lp).toString('base64');
  await p.evaluate(s=>preparar(s),spec);
  const N=Math.round(FPS*total);
  for(let i=0;i<N;i++){
    const d=await p.evaluate(t=>cuadro(t,'jpg'),i/FPS);
    fs.writeFileSync(path.join(tmp,String(i).padStart(4,'0')+'.jpg'),Buffer.from(d.split(',')[1],'base64'));
  }
  const poster=await p.evaluate(t=>cuadro(t,'png'),Math.min(total-.5,spec.escenas[0].dur+1.2));
  const posterFile='spot-'+spec.id+'-poster.png', videoFile='spot-'+spec.id+'.mp4';
  fs.writeFileSync(path.join(dir,posterFile),Buffer.from(poster.split(',')[1],'base64'));
  await b.close();
  fs.writeFileSync(path.join(tmp,'sonido.wav'),sonido(spec,total));
  execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',String(FPS),'-i',path.join(tmp,'%04d.jpg'),'-i',path.join(tmp,'sonido.wav'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',path.join(dir,videoFile)]);
  fs.rmSync(tmp,{recursive:true,force:true});
  const mp=path.join(dir,'contenido.json'), m=JSON.parse(fs.readFileSync(mp,'utf8'));
  const e={id:spec.id,titulo:spec.titulo,tipo:spec.tipo||'Video',formato:'Video 9:16 · '+total+' s',archivos:[videoFile],poster:posterFile,caption:spec.caption,fecha:spec.fecha,turno:'tarde'};
  const i=m.piezas.findIndex(q=>q.id===spec.id); if(i>=0) m.piezas[i]=e; else m.piezas.unshift(e);
  fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n');
  console.log('ok',videoFile,fs.statSync(path.join(dir,videoFile)).size+' bytes');
})();
