// Dibuja una pieza de Spot Club (1080 px de ancho) en un <canvas>.
// La usan el panel (index.html) y el script diario (contenido/fuentes/diario.js).
function dibujarPieza(cv,g){
    const W=1080, H=g.formato==='story'?1920:g.formato==='cuadrado'?1080:1350, story=g.formato==='story';
    cv.width=W; cv.height=H;
    const c=cv.getContext('2d'), K='#060608', Wh='#F5F5F5', R='#E5212E', FONT='Inter,Arial,sans-serif';
    const fnt=(sz,w=900)=>{ c.font=`${w} ${sz}px ${FONT}`; };
    const sp=(px)=>{ if('letterSpacing' in c) c.letterSpacing=px+'px'; };
    c.textBaseline='top'; c.textAlign='left';
    c.fillStyle=K; c.fillRect(0,0,W,H);
    // foto de fondo opcional (g.img): recorte tipo "cover" y velo oscuro para que el texto se lea
    if(g.img){
        const iw=g.img.naturalWidth||g.img.width, ih=g.img.naturalHeight||g.img.height, k=Math.max(W/iw,H/ih);
        const dw=iw*k, dh=ih*k, fx=g.focoX==null?.5:g.focoX, fy=g.focoY==null?.5:g.focoY;
        c.drawImage(g.img,(W-dw)*fx,(H-dh)*fy,dw,dh);
        const v=c.createLinearGradient(0,0,0,H); v.addColorStop(0,'rgba(6,6,8,.72)'); v.addColorStop(.5,'rgba(6,6,8,.50)'); v.addColorStop(1,'rgba(6,6,8,.82)');
        c.fillStyle=v; c.fillRect(0,0,W,H);
    }
    // brillo rojo y líneas de escaneo
    const gl=c.createRadialGradient(W*.9,H*.08,0,W*.9,H*.08,W*.75);
    gl.addColorStop(0,'rgba(229,33,46,.34)'); gl.addColorStop(1,'rgba(229,33,46,0)');
    c.fillStyle=gl; c.fillRect(0,0,W,H);
    const gl2=c.createRadialGradient(0,H,0,0,H,W*.7);
    gl2.addColorStop(0,'rgba(229,33,46,.22)'); gl2.addColorStop(1,'rgba(229,33,46,0)');
    c.fillStyle=gl2; c.fillRect(0,0,W,H);
    c.fillStyle='rgba(255,255,255,.035)'; for(let y=0;y<H;y+=6) c.fillRect(0,y,W,2);
    // logo enorme y tenue de marca de agua, abajo a la derecha
    if(g.logo){ c.save(); c.globalAlpha=.07; const lw=W*1.0, lh=lw*g.logo.naturalHeight/g.logo.naturalWidth; c.drawImage(g.logo,W*.30,H-lh*.78,lw,lh); c.restore(); }

    const M=90, maxW=W-2*M;
    const up=t=>String(t||'').toUpperCase();
    const fit=(t,size,w=900,k=-.045,min=36)=>{ let s=size; do{ fnt(s,w); sp(k*s); if(c.measureText(t).width<=maxW||s<=min) break; s-=4; }while(true); return s; };
    const lineTxt=(t,y,color,size,glitch)=>{
        t=up(t); if(!t) return y;
        const s=fit(t,size);
        if(glitch){ c.fillStyle=R; c.fillText(t,M-7,y); c.fillStyle='rgba(245,245,245,.35)'; c.fillText(t,M+7,y); }
        c.fillStyle=color; c.fillText(t,M,y);
        return y+s*.92;
    };
    const small=(t,y,size,w=800,color=Wh)=>{
        t=up(t); if(!t) return y; fnt(size,w); sp(size*.03); c.fillStyle=color;
        const ls=[]; let cur=''; t.split(/\s+/).forEach(wd=>{ const tr=cur?cur+' '+wd:wd; if(c.measureText(tr).width>maxW&&cur){ ls.push(cur); cur=wd; } else cur=tr; }); if(cur) ls.push(cur);
        ls.forEach((ln,i)=>c.fillText(ln,M,y+i*size*1.25));
        return y+ls.length*size*1.25;
    };
    const wrap=(t,size,w,wid)=>{ fnt(size,w); sp(-.02*size); const out=[]; let cur=''; up(t).split(/\s+/).forEach(wd=>{ const tr=cur?cur+' '+wd:wd; if(c.measureText(tr).width>wid&&cur){ out.push(cur); cur=wd; } else cur=tr; }); if(cur) out.push(cur); return out; };

    // cabecera
    const hy=story?260:70;
    let tx=M+36;
    if(g.logo){ const lh=56, lw=lh*g.logo.naturalWidth/g.logo.naturalHeight; c.drawImage(g.logo,M,hy-8,lw,lh); tx=M+lw+18; }
    else { c.fillStyle=R; c.fillRect(M,hy+8,22,22); }
    fnt(40); sp(-.8); c.fillStyle=Wh; c.fillText('SPOT CLUB',tx,hy);
    fnt(30,800); sp(1); c.globalAlpha=.85; c.textAlign='right'; c.fillText('@SPOT__CLUB',W-M,hy+4); c.textAlign='left'; c.globalAlpha=1;

    const bandH=270, bandTop=story?H-340-bandH:H-bandH;
    const y0=story?420:(g.formato==='cuadrado'?200:240);
    let y=y0;
    const gli=g.glitch;

    if(g.plantilla==='oferta'){
        y=lineTxt(g.l1,y,Wh,story?150:138,gli); y=lineTxt(g.l2,y,R,story?150:138,gli)+24;
        y=small(g.sub,y,40)+40;
        // bloque de precio
        c.save(); c.translate(70,y); c.rotate(-.052);
        const pr='$'+String(g.precio||'10').replace(',','.');
        fnt(290); sp(-17); const pw=Math.min(c.measureText(pr).width,620);
        c.fillStyle=R; c.fillRect(0,0,pw+140,story?420:(g.formato==='cuadrado'?330:400));
        c.fillStyle=Wh; fnt(48); sp(2); c.fillText('DESDE',44,28);
        let ps=290; do{ fnt(ps); sp(-.06*ps); if(c.measureText(pr).width<=pw||ps<=80) break; ps-=8; }while(true);
        c.fillText(pr,44,story?110:96);
        c.restore();
    }else if(g.plantilla==='frase'){
        const sz=g.formato==='cuadrado'?170:190;
        y+=story?140:(g.formato==='cuadrado'?60:200); y=lineTxt(g.l1,y,Wh,sz,gli); y=lineTxt(g.l2,y,R,sz,gli)+30;
        y=small(g.sub,y,40);
    }else if(g.plantilla==='numero'){
        const t=up(g.num||'0'); let s=fit(t,story?720:640,900,-.06,120);
        c.fillStyle=R; c.fillText(t,M-10,y-30); y+=s*.78;
        y=lineTxt(g.l1,y,Wh,story?180:170,gli); if(g.l2) y=lineTxt(g.l2,y,R,story?180:170,gli);
        y+=20; y=small(g.sub,y,46);
    }else if(g.plantilla==='pasos'){
        y=lineTxt(g.l1,y-20,Wh,150,gli); y=lineTxt(g.l2,y,R,150,gli)+50;
        g.p.filter(x=>x.trim()).forEach((tx,i)=>{
            fnt(90); sp(0); c.fillStyle=R; c.fillText(String(i+1),M,y-6);
            const ls=wrap(tx,60,900,maxW-110); fnt(60,900); sp(-1.2); c.fillStyle=Wh;
            ls.forEach((ln,j)=>c.fillText(ln,M+110,y+j*62));
            y+=Math.max(96,ls.length*62)+36;
        });
    }else{ // pregunta
        y=lineTxt(g.l1,y,Wh,g.formato==='cuadrado'?150:170,gli); y=lineTxt(g.l2,y,R,g.formato==='cuadrado'?150:170,gli)+40;
        y=small(g.sub,y,58,900);
        fnt(150); sp(0); c.fillStyle=R; c.fillText('↓',M,Math.max(y+20,H-(story?340:70)-330));
    }

    if(g.cta){
        c.fillStyle='rgba(6,6,8,.9)'; c.fillRect(0,bandTop,W,bandH);
        c.fillStyle=R; c.fillRect(0,bandTop,W,3);
        c.textAlign='center';
        fnt(40); sp(1); c.fillStyle=Wh; c.fillText('HAZ LA TUYA',W/2,bandTop+34);
        if(g.sinPrecio){ fnt(82); sp(-2.5); c.fillStyle=R; c.fillText('PÍDELA POR DM',W/2,bandTop+98); }
        else{
        fnt(82); sp(-2.5); c.fillStyle=R; c.fillText('DESDE $'+String(g.precio||'10').replace(',','.'),W/2,bandTop+88);
        fnt(40); sp(1); c.fillStyle=Wh; c.fillText('PÍDELA POR DM',W/2,bandTop+190);
        }
        c.textAlign='left';
    }else if(!story){
        fnt(28,800); sp(1.7); c.fillStyle='rgba(245,245,245,.9)'; c.fillText('YOU LOOK LIKE SUCCESS',M,H-70);
    }
    sp(0);
}
