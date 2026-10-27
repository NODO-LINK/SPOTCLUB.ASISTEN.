// Genera los PNG de ../ a partir de piezas.html. Uso: node render.js
const {chromium}=require('playwright');const path=require('path');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1400}});
  await p.goto('file://'+path.join(__dirname,'piezas.html'));
  await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(800);
  const ids=await p.$$eval('section.s',e=>e.map(x=>x.id));
  for(const id of ids){
    await p.locator('#'+id).screenshot({path:path.join(__dirname,'..','spot-'+id+'.png')});
    console.log('ok',id);
  }
  await b.close();
})();
