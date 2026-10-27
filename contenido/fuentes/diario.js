// Crea las piezas del día y las agrega a contenido/contenido.json.
// Uso:  node contenido/fuentes/diario.js especificacion.json
// Con "foto": "contenido/material/archivo.jpg" (y opcional focoX/focoY de 0 a 1) la pieza usa esa foto de fondo.
// especificacion.json: { "fecha": "2026-10-27", "piezas": [ { id, titulo, tipo, formato: "post|story|cuadrado",
//   plantilla: "oferta|frase|numero|pasos|pregunta", l1, l2, sub, num, precio, p: ["","",""], cta, glitch, caption } ] }
const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');
const dir=path.join(__dirname,'..');
const FORMATO={post:'Post 4:5',cuadrado:'Post 1:1',story:'Story 9:16'};
(async()=>{
  const spec=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const manifPath=path.join(dir,'contenido.json');
  const manif=JSON.parse(fs.readFileSync(manifPath,'utf8'));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
  await p.setContent('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap" rel="stylesheet"><canvas id="c"></canvas>');
  await p.addScriptTag({path:path.join(dir,'generador.js')});
  await p.evaluate(async()=>{await document.fonts.load('800 40px Inter');await document.fonts.load('900 100px Inter');await document.fonts.ready;});
  const logoPath=path.join(dir,'logo-spotclub.png');
  const logoData=fs.existsSync(logoPath)?'data:image/png;base64,'+fs.readFileSync(logoPath).toString('base64'):null;
  for(const it of spec.piezas){
    if(!/^[a-z0-9-]+$/.test(it.id)) throw new Error('id inválido: '+it.id);
    const g={plantilla:it.plantilla,formato:it.formato||'post',l1:it.l1||'',l2:it.l2||'',sub:it.sub||'',num:it.num||'',precio:it.precio||'10',p:it.p||['','',''],cta:!!it.cta,sinPrecio:!!it.sinPrecio,glitch:!!it.glitch};
    g.logoData=logoData;
    if(it.foto){
      const ruta=path.resolve(dir,'..',it.foto); if(!ruta.startsWith(path.join(dir,'material'))) throw new Error('La foto debe estar en contenido/material/');
      const ext=path.extname(ruta).slice(1).toLowerCase().replace('jpg','jpeg');
      g.fotoData='data:image/'+ext+';base64,'+fs.readFileSync(ruta).toString('base64'); g.focoX=it.focoX; g.focoY=it.focoY;
    }
    const data=await p.evaluate(async g=>{
      if(g.logoData){ const lg=new Image(); lg.src=g.logoData; await lg.decode(); g.logo=lg; delete g.logoData; }
      if(g.fotoData){ const im=new Image(); im.src=g.fotoData; await im.decode(); g.img=im; delete g.fotoData; }
      const c=document.getElementById('c');(g.plantilla==='meme'?dibujarMeme:dibujarPieza)(c,g);return c.toDataURL('image/png');},g);
    const file='spot-'+it.id+'.png';
    fs.writeFileSync(path.join(dir,file),Buffer.from(data.split(',')[1],'base64'));
    const entry={id:it.id,titulo:it.titulo,tipo:it.tipo,formato:FORMATO[g.formato],archivos:[file],caption:it.caption,fecha:spec.fecha};
    const i=manif.piezas.findIndex(x=>x.id===it.id);
    if(i>=0) manif.piezas[i]=entry; else manif.piezas.unshift(entry);
    console.log('ok',file);
  }
  fs.writeFileSync(manifPath,JSON.stringify(manif,null,2)+'\n');
  await b.close();
})();
