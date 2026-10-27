// Envía las piezas del día a un chat de Telegram con un bot creado en @BotFather.
// Variables de entorno (nunca van en el repo):
//   TELEGRAM_BOT_TOKEN  token que entrega @BotFather
//   TELEGRAM_CHAT_ID    id del chat, grupo o canal donde llegan las piezas
// Uso:
//   node contenido/fuentes/telegram.js --id        muestra los chats que le han escrito al bot
//   node contenido/fuentes/telegram.js --prueba    manda un mensaje de prueba
//   node contenido/fuentes/telegram.js [--fecha AAAA-MM-DD]   manda las piezas de esa fecha (por defecto, hoy en Caracas)
const fs=require('fs');const path=require('path');
const API=(process.env.TELEGRAM_API||'https://api.telegram.org')+'/bot'+(process.env.TELEGRAM_BOT_TOKEN||'');
const dir=path.join(__dirname,'..');
const arg=n=>{const i=process.argv.indexOf(n);return i>=0?(process.argv[i+1]||true):null;};
function falta(v){ console.error('Falta la variable '+v+'. Configúrala en el entorno (no en el repositorio).'); process.exit(2); }
if(!process.env.TELEGRAM_BOT_TOKEN) falta('TELEGRAM_BOT_TOKEN');

async function llamar(metodo,datos){
  const r=await fetch(API+'/'+metodo,{method:'POST',body:datos});
  const j=await r.json().catch(()=>({}));
  if(!j.ok) throw new Error(metodo+': '+(j.description||r.status));
  return j.result;
}
const form=o=>{const f=new FormData();for(const [k,v] of Object.entries(o)) f.append(k,v);return f;};
const hoyCaracas=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas'}).format(new Date());

(async()=>{
  if(arg('--id')){
    const u=await (await fetch(API+'/getUpdates')).json();
    if(!u.ok) throw new Error('getUpdates: '+u.description);
    const m=new Map();
    u.result.forEach(x=>{const c=(x.message||x.channel_post||x.my_chat_member||{}).chat; if(c) m.set(c.id,(c.title||c.username||[c.first_name,c.last_name].filter(Boolean).join(' '))+' ('+c.type+')');});
    if(!m.size) console.log('No hay mensajes todavía. Escríbele al bot (o agrégalo al grupo y escribe algo) y vuelve a ejecutar.');
    m.forEach((n,id)=>console.log(id+'  '+n));
    return;
  }
  const chat=process.env.TELEGRAM_CHAT_ID; if(!chat) falta('TELEGRAM_CHAT_ID');
  if(arg('--prueba')){
    await llamar('sendMessage',form({chat_id:chat,text:'Spot Club: conexión lista. Aquí llegará el contenido del día.'}));
    console.log('ok prueba'); return;
  }
  const fecha=typeof arg('--fecha')==='string'?arg('--fecha'):hoyCaracas();
  const piezas=JSON.parse(fs.readFileSync(path.join(dir,'contenido.json'),'utf8')).piezas.filter(p=>p.fecha===fecha);
  if(!piezas.length){ console.error('No hay piezas con fecha '+fecha); process.exit(1); }
  for(const p of piezas){
    const archivo=p.archivos[0], buf=fs.readFileSync(path.join(dir,archivo));
    const cab='Spot Club · '+p.titulo+' ('+p.formato+')';
    const cap=(cab+'\n\n'+(p.caption||'')).slice(0,1024);
    const f1=form({chat_id:chat,caption:cap}); f1.append('photo',new Blob([buf],{type:'image/png'}),archivo);
    await llamar('sendPhoto',f1);
    const f2=form({chat_id:chat,caption:'Archivo original para publicar: '+p.titulo}); f2.append('document',new Blob([buf],{type:'image/png'}),archivo);
    await llamar('sendDocument',f2);
    console.log('ok',archivo);
  }
})().catch(e=>{ console.error('Error:',e.message); process.exit(1); });
