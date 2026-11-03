// Video "colección" de 12 s (1080x1920, 30 fps, sin audio): muro de cartas en movimiento, cartas que entran con golpe y la franela real con el diseño.
// Usa solo material del dueño (contenido/biblioteca, contenido/disenos). Lo agrega a contenido/contenido.json.
// Uso:  node contenido/fuentes/video-coleccion.js especificacion.json
// especificacion.json: {"fecha","id","titulo","tipo":"Video","caption",
//   "gancho":["¿CUÁL","ES LA TUYA?"], "cartas":[3 rutas contenido/biblioteca/cartas/x.jpg], "etiquetas":["TU ARTISTA","TU ESTILO","TU CARTA"],
//   "muro":[8+ rutas de cartas/promos], "diseno":"contenido/disenos/x.png", "cierre":["TU DISEÑO.","TU FRANELA."], "precio":"10" (opcional) }
const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
const dir=path.join(__dirname,'..');
const FPS=30, DUR=12, W=1080, H=1920;

const pagina=`<canvas id="c" width="${W}" height="${H}"></canvas><script>
const W=${W}, H=${H};
const c=document.getElementById('c'), x=c.getContext('2d'), K='#060608', Wh='#F5F5F5', R='#E5212E';
const F='Inter,Arial,sans-serif', MAXW=840, M=90;
let S={}, WALL=[], CARDS=[], SHIRT=null, LOGO=null;
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

const ease=u=>1-Math.pow(1-clamp(u),3);
function carta(im,cx,cy,w,rot,sombra){ const h=w*im.naturalHeight/im.naturalWidth; x.save(); x.translate(cx,cy); x.rotate(rot);
  x.shadowColor='rgba(0,0,0,.65)'; x.shadowBlur=sombra; x.shadowOffsetY=sombra*.4;
  const r=w*.05; x.beginPath(); x.roundRect(-w/2,-h/2,w,h,r); x.save(); x.clip(); x.drawImage(im,-w/2,-h/2,w,h); x.restore();
  x.shadowColor='transparent'; x.lineWidth=3; x.strokeStyle='rgba(255,255,255,.35)'; x.stroke(); x.restore(); }
// muro: 4 columnas inclinadas que se desplazan en sentidos opuestos
function muro(t){ x.save(); x.translate(W/2,H/2); x.rotate(-.2); const cw=330, ch=cw*1.45, gap=26;
  for(let c=-3;c<=3;c++){ const dir=c%2?1:-1, off=(t*60*dir)%((ch+gap)*WALL.length);
    for(let r=-6;r<=WALL.length+6;r++){ const im=WALL[((r%WALL.length)+WALL.length+c*2)%WALL.length]; const y=r*(ch+gap)+off-H*1.1; if(y<-H*1.6||y>H*1.6) continue;
      x.drawImage(im,c*(cw+gap)-cw/2,y,cw,ch); } }
  x.restore(); const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,'rgba(6,6,8,.82)'); g.addColorStop(.5,'rgba(6,6,8,.62)'); g.addColorStop(1,'rgba(6,6,8,.9)'); x.fillStyle=g; x.fillRect(0,0,W,H); }
function fondo(t,glow){
  x.fillStyle=K; x.fillRect(0,0,W,H); muro(t);
  let g=x.createRadialGradient(W*.85,H*.12,0,W*.85,H*.12,W*.9); g.addColorStop(0,'rgba(229,33,46,'+(.30*glow)+')'); g.addColorStop(1,'rgba(229,33,46,0)'); x.fillStyle=g; x.fillRect(0,0,W,H);
  x.drawImage(sc,0,0);
  x.textBaseline='top'; let tx=M+36;
  if(LOGO){ const lh=56, lw=lh*LOGO.naturalWidth/LOGO.naturalHeight; x.drawImage(LOGO,M,206,lw,lh); tx=M+lw+18; }
  x.fillStyle=Wh; x.font='900 40px '+F; x.letterSpacing='-.8px'; x.fillText('SPOT CLUB',tx,214);
  x.font='800 30px '+F; x.letterSpacing='1px'; x.globalAlpha=.85; x.textAlign='right'; x.fillText('@SPOT__CLUB',W-150,218); x.textAlign='left'; x.globalAlpha=1;
}
function dibujar(t){
  const p=S; fondo(t,.8+.2*Math.sin(t*2.2));
  if(t<3.0){ golpe(t,0.1,p.gancho[0],380,170,Wh); golpe(t,0.6,p.gancho[1],560,170,R); contorno(t,1.0,'?',860,820,.5); }
  else if(t<7.0){ // tres cartas entran con golpe, una por una
    const pos=[[190,850,-.07],[540,930,.0],[890,850,.07]];
    p.etiquetas && golpe(t,3.0,'ELIGE LA TUYA',330,96,Wh);
    CARDS.forEach((im,i)=>{ const t0=3.3+i*1.1, d=t-t0; if(d<0) return; const k=ease(d/.35), [px,py,rt]=pos[i];
      const dx=(i===0?-1:i===2?1:0)*(1-k)*900, dy=(i===1?1:0)*(1-k)*900;
      const cw=i===1?340:310; carta(im,px+dx,py+dy,cw,rt+(1-k)*(i-1)*.6,40);
      if(d<.12){ x.fillStyle='rgba(245,245,245,'+.5*(1-d/.12)+')'; x.fillRect(0,0,W,H); }
      if(d>.3 && p.etiquetas){ x.save(); x.globalAlpha=clamp((d-.3)/.2); x.textBaseline='top'; x.font='900 44px '+F; x.letterSpacing='-1px'; x.fillStyle=i===1?R:Wh; x.textAlign='center'; x.fillText(p.etiquetas[i],px,py+cw*.725+50); x.restore(); }
    }); }
  else if(t<9.5){ // la franela sube con el diseño
    golpe(t,7.0,'Y TU DISEÑO',330,120,Wh); golpe(t,7.4,'EN FRANELA',480,120,R);
    const d=t-7.2, k=ease(d/.5); if(d>0&&SHIRT){ const w=860, h=w*SHIRT.naturalHeight/SHIRT.naturalWidth; x.save(); x.shadowColor='rgba(229,33,46,.5)'; x.shadowBlur=70; x.drawImage(SHIRT,(W-w)/2,720+(1-k)*700-(Math.sin(t*2)*8),w,h); x.restore(); }
    const f=clamp(1-(t-7.0)/0.12); if(f>0){ x.fillStyle='rgba(245,245,245,'+(.7*f)+')'; x.fillRect(0,0,W,H); } }
  else { golpe(t,9.5,p.cierre[0],380,150,Wh); golpe(t,9.9,p.cierre[1],550,150,R);
    if(SHIRT){ const w=520, h=w*SHIRT.naturalHeight/SHIRT.naturalWidth; x.globalAlpha=.9; x.drawImage(SHIRT,(W-w)/2,800,w,h); x.globalAlpha=1; }
    const a=clamp((t-10.3)/0.3), top=1330+(1-a)*60; x.save(); x.globalAlpha=a; x.fillStyle='rgba(6,6,8,.9)'; x.fillRect(0,top,W,200); x.fillStyle=R; x.fillRect(0,top,W,4);
    x.textBaseline='top'; x.textAlign='center'; x.fillStyle=Wh; x.font='900 64px '+F; x.letterSpacing='-1px'; x.fillText(p.precio?'DESDE $'+p.precio+' · PÍDELA POR DM':'PÍDELA POR DM',W/2-60,top+60); x.restore(); }
  x.letterSpacing='0px';
}
const carga=async d=>{ const im=new Image(); im.src=d; await im.decode(); return im; };
window.preparar=async s=>{S=s; if(s.logoData) LOGO=await carga(s.logoData); WALL=[]; for(const d of s.muroData) WALL.push(await carga(d)); CARDS=[]; for(const d of s.cartasData) CARDS.push(await carga(d)); if(s.shirtData) SHIRT=await carga(s.shirtData); };
window.cuadro=(t,fmt)=>{ dibujar(t); return c.toDataURL(fmt==='png'?'image/png':'image/jpeg',.93); };
</script>`;

(async()=>{
  const spec=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  if(!/^[a-z0-9-]+$/.test(spec.id)) throw new Error('id inválido');
  spec.precio=String(spec.precio||'10').replace(',','.');
  const tmp=fs.mkdtempSync('/tmp/spotvideo-');
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:W,height:H}});p.on('pageerror',e=>console.error('página:',e.message));
  await p.setContent('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap" rel="stylesheet">'+pagina);
  await p.evaluate(async()=>{await document.fonts.load('800 40px Inter');await document.fonts.load('900 100px Inter');await document.fonts.ready;});
  const leer=r=>{ const fp=path.resolve(dir,'..',r); if(!fp.startsWith(path.join(dir,'biblioteca'))&&!fp.startsWith(path.join(dir,'disenos'))&&!fp.startsWith(path.join(dir,'material'))) throw new Error('material fuera de la biblioteca: '+r); return 'data:image/'+path.extname(fp).slice(1).toLowerCase().replace('jpg','jpeg')+';base64,'+fs.readFileSync(fp).toString('base64'); };
  spec.muroData=spec.muro.map(leer); spec.cartasData=spec.cartas.slice(0,3).map(leer);
  if(spec.diseno){ const o=path.join(tmp,'franela.png'); execFileSync('python3',['-I',path.join(__dirname,'mockup_franela.py'),path.resolve(dir,'..',spec.diseno),o],{stdio:'pipe'}); spec.shirtData='data:image/png;base64,'+fs.readFileSync(o).toString('base64'); }
  for(const f of []){
    let ruta=path.resolve(dir,'..',f); if(!ruta.startsWith(path.join(dir,'material'))) throw new Error('El material debe estar en contenido/material/');
    if(/\.(mp4|mov|m4v|webm)$/i.test(ruta)){ const out=path.join(tmp,'clip-'+spec.fotosData.length+'.jpg'); execFileSync('ffmpeg',['-y','-loglevel','error','-ss','1','-i',ruta,'-frames:v','1','-q:v','2',out]); ruta=out; }
    const ext=path.extname(ruta).slice(1).toLowerCase().replace('jpg','jpeg');
    spec.fotosData.push('data:image/'+ext+';base64,'+fs.readFileSync(ruta).toString('base64'));
  }
  const lp=path.join(dir,'logo-spotclub.png'); if(fs.existsSync(lp)) spec.logoData='data:image/png;base64,'+fs.readFileSync(lp).toString('base64');
  await p.evaluate(s=>preparar(s),spec);
  const N=FPS*DUR;
  for(let i=0;i<N;i++){
    const d=await p.evaluate(t=>cuadro(t,'jpg'),i/FPS);
    fs.writeFileSync(path.join(tmp,String(i).padStart(4,'0')+'.jpg'),Buffer.from(d.split(',')[1],'base64'));
  }
  const poster=await p.evaluate(()=>cuadro(8.6,'png'));
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
