// Genera los saludos del día y los agrega a contenido/contenido.json:
//   --dias   2 flyers de "Buenos días" (post y story)          --noches   1 flyer de "Buenas noches" (story)      (sin opción: los tres)
// Uso:  node contenido/fuentes/saludos.js [--dias|--noches] [AAAA-MM-DD]      (sin fecha, usa hoy en America/Caracas)
// Rota frases, captions, cartas y diseños según el día. Fondo SIEMPRE con la biblioteca del dueño (muro de cartas o de flyers de franelas, abanico de cartas o franela real con diseño):
// nunca fondos lisos ni dibujados. No reemplaza piezas que ya existan con el mismo id.
const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
const dir=path.join(__dirname,'..'), raiz=path.join(dir,'..');
const args=process.argv.slice(2), modo=args.includes('--dias')?'dias':args.includes('--noches')?'noches':'todo';
const hoy=args.find(a=>/^\d{4}-\d{2}-\d{2}$/.test(a))||new Date(Date.now()-4*3600000).toISOString().slice(0,10);
const n=Math.floor((Date.parse(hoy+'T00:00:00Z')-Date.parse('2026-10-27T00:00:00Z'))/86400000);
const pick=(a,k)=>a[((n+k)%a.length+a.length)%a.length];
const DIAS=[
 ['BUENOS','DÍAS','Hoy toca crear algo grande'],['ARRANCA','CON ESTILO','Buenos días, Spot Club'],['NUEVO DÍA','NUEVO ESTILO','Buenos días, familia'],
 ['BUEN DÍA','PARA TODOS','Que hoy te salga todo con estilo'],['A DARLE','CON TODO','Buenos días, Spot Club'],['HOY SE','CREA','Buenos días, y a diseñar'],
 ['BUENOS DÍAS','FAMILIA','Que sea un día con estilo'],
 ['ARRANCA EL DÍA','CON TODO','Spot Club te acompaña'],['HOY TOCA','BRILLAR','Buenos días, familia'],['UN DÍA MÁS','PARA CREAR','Vamos con todo, Spot Club'],
 ['ENERGÍA','POSITIVA','Buenos días, Spot Club'],['DESPIERTA','Y CREA','Hoy es un buen día'],['BUEN DÍA,','BUEN ESTILO','Que nada te frene hoy'],
 ['MODO','CREATIVO ON','Buenos días, familia'],['HOY LA','ROMPEMOS','Buenos días, y con estilo'],['A PONERSE','LAS PILAS','Buenos días, Spot Club'],
 ['HOY ES TU','TURNO','Buenos días, Spot Club'],['QUE EMPIECE','EL DÍA','Con estilo y con ganas'],['DÍA NUEVO,','IDEAS NUEVAS','Buenos días, familia'],
 ['VAMOS CON','TODO HOY','Buenos días, Spot Club']];
const CAP_DIAS=[
 'Buenos días, familia 🖤 Que hoy te salga todo con estilo.\nCuéntanos en los comentarios qué vas a estrenar hoy 👇',
 'Arrancamos el día con todo 🖤 ¿Cuál es tu plan de hoy?\nCuéntanos aquí abajo 👇',
 'Nuevo día, nuevas ideas 🖤 Buenos días, Spot Club.\nDinos qué diseño te gustaría ver hoy 👇',
 'Buenos días 🖤 Que sea un día bueno para ti y los tuyos.\n¿Qué estás escuchando para empezar? 👇'];
const NOCHES=[
 ['BUENAS','NOCHES','Descansa, que mañana seguimos creando'],['A DESCANSAR','MAÑANA MÁS','Gracias por estar, familia'],['CIERRA EL DÍA','CON ESTILO','Buenas noches, Spot Club'],
 ['DUERME BIEN','SUEÑA GRANDE','Mañana arrancamos de nuevo'],['BUENAS','NOCHES','Gracias por otro día, familia'],['CIERRE DE','DÍA','Que descanses, Spot Club'],
 ['HASTA','MAÑANA','Gracias por estar, familia'],['A SOÑAR','EN GRANDE','Mañana seguimos creando'],['DESCONECTA','Y DESCANSA','Buenas noches, Spot Club'],
 ['NOCHE DE','RECARGAR','Mañana más y mejor'],['QUE LA NOCHE','TE RECARGUE','Buenas noches, familia'],['SUEÑA CON','ESTILO','Hasta mañana, Spot Club'],
 ['BUENA NOCHE','PARA TODOS','Descansen, que mañana hay más'],['LUCES','APAGADAS','Mañana volvemos con todo'],['DULCES','SUEÑOS','Gracias por otro día, Spot Club']];
const CAP_NOCHES=[
 'Buenas noches, familia 🖤 Gracias por otro día.\nQue descanses y mañana seguimos 🌙',
 'Cerramos el día 🖤 Descansa que mañana hay más.\nCuéntanos cómo te fue hoy 👇',
 'Buenas noches 🌙 Gracias por estar siempre.\nNos vemos mañana con más diseños 🖤'];
const HASH_D='#buenosdias #spotclub #venezuela #parati #streetwear', HASH_N='#buenasnoches #spotclub #venezuela #parati #streetwear';
const manif=JSON.parse(fs.readFileSync(path.join(dir,'contenido.json'),'utf8'));
const ya=id=>manif.piezas.some(p=>p.id===id);
const B='contenido/biblioteca/', C=B+'cartas/', P=B+'promos/';
// cartas de artistas limpias (sin marcas ajenas ni personajes con copyright) y diseños propios aptos para saludar
const CARTAS=['karol-g','milo-j','doja-cat','omar-courtz','duki','young-miko-1','mora-1','lil-cry','kid-keo','royal-kid','wheez','zell-2','linkin','billie-eilish-1','alex-g','akrilla','akapellah-rojo','atorrante','juice-world','lobe','kanye','humbe','feirly','eladio-carrion','big-soto-morada','cancerbero','lil-supa','cosmic-kid'].filter(c=>fs.existsSync(path.join(raiz,C+c+'.jpg')));
const DISENOS=['greys-save-lives','greys-anatomy','outer-banks-pogue-life','retrato-collage','no-me-arrepiento-de-sentir-tanto','don-kbrn-lista-eladio'].filter(c=>fs.existsSync(path.join(raiz,'contenido/disenos/'+c+'.png')));
// diseños que el dueño sube en el apartado «Diseños» del panel (los baja sincronizar_disenos.py): rotan junto con los de la biblioteca fija
const GRANDES_FIJOS=['retrato-collage','outer-banks-pogue-life','greys-anatomy','greys-save-lives'];   // ilustraciones/collages grandes: van en la ESPALDA casi siempre
const PANEL=(()=>{ try{ return JSON.parse(fs.readFileSync(path.join(dir,'disenos/panel/indice.json'),'utf8')).disenos.filter(d=>d.usar!==false&&d.tipo!=='rectangular').map(d=>({ruta:'contenido/disenos/panel/'+d.archivo,grande:!!d.grande})).filter(o=>fs.existsSync(path.join(raiz,o.ruta))); }catch(e){ return []; } })();
const TODOS_DIS=[...PANEL,...DISENOS.map(d=>({ruta:'contenido/disenos/'+d+'.png',grande:GRANDES_FIJOS.includes(d)}))];   // los del panel y los fijos rotan a la par
const disenoDe=k=>{ const o=pick(TODOS_DIS,k); return {diseno:o.ruta,espalda:!!(o.grande&&((n+k)%5!==0))}; };   // 80 % de los diseños grandes salen en la espalda
const PROMOS=fs.readdirSync(path.join(raiz,P)).filter(f=>/^2x12-.*\.jpg$/.test(f)&&f!=='2x12-microdurazno-1.jpg').sort();   // 1 y maria-flyer llevan personas/precio: prohibidos
const toma=(a,k,m)=>Array.from({length:m},(_,i)=>a[(((n*3+k+i)%a.length)+a.length)%a.length]);
const cartas=(k,m)=>toma(CARTAS,k,m).map(c=>C+c+'.jpg'), promos=(k,m)=>toma(PROMOS,k,m).map(f=>P+f);
// fondos: se rotan el muro de cartas, el muro de flyers de franelas y los fondos propios del dueño (contenido/biblioteca/fondos/)
const FONDOS=(()=>{ try{ return fs.readdirSync(path.join(raiz,B,'fondos')).filter(f=>/\.(jpe?g|png|webp)$/i.test(f)).sort().map(f=>B+'fondos/'+f); }catch(e){ return []; } })();
const MODOS=['cartas','promos',...(FONDOS.length?['propio','propio']:[])];
const fondoDe=k=>{ const m=pick(MODOS,k); return m==='cartas'?{montaje:cartas(7+k,14)}:m==='promos'?{montaje:promos(k,12)}:{fondo:pick(FONDOS,k),velo:.5}; };
const d1=pick(DIAS,0), d2=pick(DIAS,Math.floor(DIAS.length/2)), nn=pick(NOCHES,0);   // post y story van a mitad del banco, así no coinciden
const base={tema:'neon',datos:[],insignia:'',sello:[],pie:'Maracaibo · @spot__club',fecha:hoy};
const piezas=[
 {id:hoy+'-buenos-dias-1',titulo:'Buenos días · Post',tipo:'Comunidad',formato:'post',pretitulo:d1[2].toUpperCase(),l1:d1[0],l2:d1[1],cartas:cartas(0,3),...fondoDe(0),caption:pick(CAP_DIAS,0)+'\n'+HASH_D},
 {id:hoy+'-buenos-dias-2',titulo:'Buenos días · Story',tipo:'Comunidad',formato:'story',pretitulo:d2[2].toUpperCase(),l1:d2[0],l2:d2[1],...disenoDe(0),...fondoDe(1),caption:'Story: agrega un sticker de pregunta o de encuesta para que la gente conteste.'},
 {id:hoy+'-buenas-noches',titulo:'Buenas noches · Story',tipo:'Comunidad',formato:'story',pretitulo:nn[2].toUpperCase(),l1:nn[0],l2:nn[1],cartas:cartas(3,3),...fondoDe(2),caption:'Story: agrega el sticker de música o una cuenta regresiva para mañana.\n'+pick(CAP_NOCHES,0)+'\n'+HASH_N}
].filter(p=>(modo==='todo'||(modo==='dias'?p.id.includes('buenos-dias'):p.id.includes('buenas-noches')))&&!ya(p.id));
if(!piezas.length){ console.log('los saludos de',hoy,'ya existen'); process.exit(0); }
for(const p of piezas){ const spec=path.join(require('os').tmpdir(),'saludo-'+p.id+'.json'); fs.writeFileSync(spec,JSON.stringify({...base,...p,salida:p.id})); execFileSync('node',[path.join(__dirname,'premium.js'),spec],{stdio:'inherit',cwd:raiz}); }
