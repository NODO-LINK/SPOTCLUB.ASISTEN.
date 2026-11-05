#!/usr/bin/env python3
"""Estampa un diseño sobre la foto real de una franela (negra o blanca, elegida según el diseño) y guarda la franela recortada (PNG con fondo transparente).
Uso:  python3 -I contenido/fuentes/mockup_franela.py diseno.png salida.png [--escala auto] [--y 0.25] [--blanca|--negra|--hoodie] [--espalda] [--dx 0] [--sin-recorte]
La tela de la foto aporta las sombras y los pliegues; el diseño se mezcla con ellos para que no se vea pegado."""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(AQUI, '..', 'mockups', 'base-franela-negra-frente.jpg')          # de aquí sale siempre la silueta
BASE_BLANCA = os.path.join(AQUI, '..', 'mockups', 'base-franela-blanca-frente.jpg')
BASE_HOODIE = os.path.join(AQUI, '..', 'mockups', 'base-hoodie-frente.jpg')
ESP = {n: os.path.join(AQUI, '..', 'mockups', f) for n, f in (('negra', 'base-franela-negra-espalda.jpg'), ('blanca', 'base-franela-blanca-espalda.jpg'), ('hoodie', 'base-hoodie-espalda.jpg'))}   # ver hacer_espalda.py          # hoodie negro (sin silueta aparte: se recorta de su propia foto)


def mascara(base):
    """Prenda = todo lo que no es el fondo blanco conectado a las esquinas."""
    g = base.convert('L')
    b = g.point(lambda v: 255 if v > 205 else 0)
    ImageDraw.floodfill(b, (0, 0), 128, thresh=0)
    ImageDraw.floodfill(b, (b.width - 1, b.height - 1), 128, thresh=0)
    m = np.asarray(b) != 128
    return Image.fromarray((m * 255).astype('uint8'))


def luminosidad_diseno(png):
    """Luminosidad media (0-255) de lo que se imprime; sirve para elegir franela negra o blanca."""
    a = np.asarray(Image.open(png).convert('RGBA')).astype('float32')
    w = a[..., 3] / 255.0
    if w.sum() < 1: return 255.0
    return float(((0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]) * w).sum() / w.sum())


def componer(diseno_png, escala=None, y=None, dx=0.0, recorte=True, color='auto', espalda=False):
    if color == 'auto':
        color = 'blanca' if luminosidad_diseno(diseno_png) < 110 else 'negra'
    hoodie = color == 'hoodie'
    if espalda:      # la silueta sale siempre de la foto negra de espalda (o la del hoodie); la tela de la foto de su color
        base_forma = Image.open(ESP['hoodie'] if hoodie else ESP['negra']).convert('RGB')
        base = base_forma if hoodie else Image.open(ESP['blanca'] if color == 'blanca' else ESP['negra']).convert('RGB')
    else:
        base_forma = Image.open(BASE_HOODIE if hoodie else BASE).convert('RGB')
        base = base_forma if hoodie else Image.open(BASE_BLANCA if color == 'blanca' else BASE).convert('RGB')
    W, H = base.size
    m = mascara(base_forma)
    oscura = np.asarray(base_forma.convert('L')) < (200 if hoodie else 150)          # la prenda es negra: lo claro que quede dentro es fondo (huecos bajo las mangas)
    m = Image.fromarray(((np.asarray(m) > 0) & oscura).astype('uint8') * 255)
    ys, xs = np.where(np.asarray(m) > 0)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bw, bh = x1 - x0, y1 - y0
    cx = (x0 + x1) / 2 + dx * bw

    # luz: baja frecuencia (iluminación general) y alta frecuencia (pliegues)
    L = np.asarray(base.convert('L')).astype('float32') if color != 'blanca' else np.asarray(base.convert('L')).astype('float32') * 0.2
    lf = np.asarray(Image.fromarray(L.astype('uint8')).filter(ImageFilter.GaussianBlur(28))).astype('float32')
    hf = L - lf

    d = Image.open(diseno_png).convert('RGBA')
    asp = d.height / d.width
    if escala is None:                       # se ajusta a la forma: ni más ancho que el pecho ni más alto que el torso
        if espalda:   # espalda: el diseño grande ocupa casi todo el torso
            escala = min(0.44, 0.62 * bh / (asp * bw)) if hoodie else min(0.60, 0.74 * bh / (asp * bw))
        else:
            escala = min(0.36, 0.30 * bh / (asp * bw)) if hoodie else min(0.42, 0.50 * bh / (asp * bw))
    if y is None:
        y = (0.20 if hoodie else 0.14) if espalda else (0.31 if hoodie else 0.25)
    dw = int(bw * escala)
    dh = int(dw * d.height / d.width)
    d = d.resize((dw, dh), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.5))
    px, py = int(cx - dw / 2), int(y0 + bh * y)
    lienzo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    lienzo.paste(d, (px, py), d)
    c = np.asarray(lienzo).astype('float32')

    # sombreado: la tinta sigue la iluminación y los pliegues de la tela
    ref = lf[py:py + dh, px:px + dw].mean() + 1e-3
    ilum = np.clip((lf / ref) ** 0.55, 0.62, 1.22)
    plieg = np.clip(1 + hf * 0.045, 0.78, 1.18)
    sh = (ilum * plieg)[..., None]
    rgb = np.clip(c[..., :3] * sh, 0, 255)
    rng = np.random.default_rng(3)
    grano = 1 - 0.035 * rng.random((H, W, 1)).astype('float32')   # la tinta toma la trama de la tela
    rgb = np.clip(rgb * grano, 0, 255)
    a = (c[..., 3:4] / 255.0) * 0.97

    b = np.asarray(base).astype('float32')
    out = b * (1 - a) + rgb * a
    res = Image.fromarray(out.astype('uint8')).convert('RGBA')
    if recorte:
        al = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.9))   # se come el borde blanco del fondo
        res.putalpha(al)
        res = res.crop((max(0, x0 - 6), max(0, y0 - 6), min(W, x1 + 7), min(H, y1 + 7)))
    return res


if __name__ == '__main__':
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__); sys.exit(1)
    op = {'--escala': None, '--y': None, '--dx': 0.0}
    color = 'auto'
    for c in ('negra', 'blanca', 'hoodie'):
        if '--' + c in args: color = c
    i = 2
    while i < len(args):
        if args[i] in op:
            op[args[i]] = float(args[i + 1]); i += 2
        else:
            i += 1
    res = componer(args[0], op['--escala'], op['--y'], op['--dx'], '--sin-recorte' not in args, color, '--espalda' in args)
    res.save(args[1])
    print('ok', args[1], res.size)
