// Genera los saludos del día: 2 flyers de "Buenos días" y 1 de "Buenas noches", y los agrega a contenido/contenido.json.
// Uso:  node contenido/fuentes/saludos.js [AAAA-MM-DD]      (sin fecha, usa hoy en America/Caracas)
// Rota frases, captions y fotos según el día. Usa solo fotos de contenido/material/ que empiezan con "foto-" (seleccionadas sin caras),
// salvo las de VIZZION. No reemplaza piezas que ya existan con el mismo id.
const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
const dir=path.join(__dirname,'..'), raiz=path.join(dir,'..');
const hoy=process.argv[2]||new Date(Date.now()-4*3600000).toISOString().slice(0,10);
const n=Math.floor((Date.parse(hoy+'T00:00:00Z')-Date.parse('2026-10-27T00:00:00Z'))/86400000);
const pick=(a,k)=>a[((n+k)%a.length+a.length)%a.length];
const DIAS=[
 ['BUENOS','DÍAS','Hoy toca crear algo grande'],['ARRANCA','CON ESTILO','Buenos días, Spot Club'],['NUEVO DÍA','NUEVO ESTILO','Buenos días, familia'],
 ['BUEN DÍA','PARA TODOS','Que hoy te salga todo con estilo'],['A DARLE','CON TODO','Buenos días, Spot Club'],['HOY SE','CREA','Buenos días, y a diseñar'],
 ['BUENOS DÍAS','FAMILIA','Que sea un día con estilo']];
const CAP_DIAS=[
 'Buenos días, familia 🖤 Que hoy te salga todo con estilo.\nCuéntanos en los comentarios qué vas a estrenar hoy 👇',
 'Arrancamos el día con todo 🖤 ¿Cuál es tu plan de hoy?\nCuéntanos aquí abajo 👇',
 'Nuevo día, nuevas ideas 🖤 Buenos días, Spot Club.\nDinos qué diseño te gustaría ver hoy 👇',
 'Buenos días 🖤 Que sea un día bueno para ti y los tuyos.\n¿Qué estás escuchando para empezar? 👇'];
const NOCHES=[
 ['BUENAS','NOCHES','Descansa, que mañana seguimos creando'],['A DESCANSAR','MAÑANA MÁS','Gracias por estar, familia'],['CIERRA EL DÍA','CON ESTILO','Buenas noches, Spot Club'],
 ['DUERME BIEN','SUEÑA GRANDE','Mañana arrancamos de nuevo'],['BUENAS','NOCHES','Gracias por otro día, familia'],['CIERRE DE','DÍA','Que descanses, Spot Club']];
const CAP_NOCHES=[
 'Buenas noches, familia 🖤 Gracias por otro día.\nQue descanses y mañana seguimos 🌙',
 'Cerramos el día 🖤 Descansa que mañana hay más.\nCuéntanos cómo te fue hoy 👇',
 'Buenas noches 🌙 Gracias por estar siempre.\nNos vemos mañana con más diseños 🖤'];
const HASH_D='#buenosdias #spotclub #venezuela #parati #streetwear', HASH_N='#buenasnoches #spotclub #venezuela #parati #streetwear';
const EXCLUIR=['foto-17894533992599449.jpg'];   // VIZZION: drop privado
const fotos=fs.readdirSync(path.join(dir,'material')).filter(f=>/^foto-.*\.(jpe?g|png|webp)$/i.test(f)&&!EXCLUIR.includes(f)).sort();
const ft=k=>fotos.length?'contenido/material/'+pick(fotos,k):undefined;
const manif=JSON.parse(fs.readFileSync(path.join(dir,'contenido.json'),'utf8'));
const ya=id=>manif.piezas.some(p=>p.id===id);
const d1=pick(DIAS,0), d2=pick(DIAS,3), nn=pick(NOCHES,0);
const piezas=[
 {id:hoy+'-buenos-dias-1',titulo:'Buenos días · Post',tipo:'Comunidad',formato:'post',plantilla:'frase',l1:d1[0],l2:d1[1],sub:d1[2],cta:false,foto:ft(0),caption:pick(CAP_DIAS,0)+'\n'+HASH_D},
 {id:hoy+'-buenos-dias-2',titulo:'Buenos días · Story',tipo:'Comunidad',formato:'story',plantilla:'frase',l1:d2[0],l2:d2[1],sub:d2[2],glitch:true,cta:false,caption:'Story: agrega un sticker de pregunta o de encuesta para que la gente conteste.'},
 {id:hoy+'-buenas-noches',titulo:'Buenas noches · Story',tipo:'Comunidad',formato:'story',plantilla:'frase',l1:nn[0],l2:nn[1],sub:nn[2],cta:false,foto:ft(5),caption:'Story: agrega el sticker de música o una cuenta regresiva para mañana.\n'+pick(CAP_NOCHES,0)+'\n'+HASH_N}
].filter(p=>!ya(p.id));
if(!piezas.length){ console.log('los saludos de',hoy,'ya existen'); process.exit(0); }
const spec=path.join(require('os').tmpdir(),'saludos-'+hoy+'.json');
fs.writeFileSync(spec,JSON.stringify({fecha:hoy,piezas}));
execFileSync('node',[path.join(__dirname,'diario.js'),spec],{stdio:'inherit',cwd:raiz});
