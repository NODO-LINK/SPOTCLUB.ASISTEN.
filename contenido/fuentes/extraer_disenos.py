#!/usr/bin/env python3
"""Separa los diseños de una plancha de DTF (PNG grande con varios diseños) y guarda cada uno como PNG con fondo transparente.
Uso:  python3 -I contenido/fuentes/extraer_disenos.py plancha.png prefijo [--union 90] [--min 1.5] [--margen 24] [--salida contenido/disenos]
  --union   distancia (en píxeles de la plancha original) para considerar que dos partes son el mismo diseño (letras sueltas, detalles). Subirla si un diseño sale partido.
  --min     tamaño mínimo (en % del lado menor de la plancha) para guardar una pieza; evita salvar motas y marcas de registro.
  --margen  margen transparente alrededor de cada diseño.
Funciona con planchas de fondo transparente o de fondo liso (blanco, negro o de color): el fondo se toma de las esquinas.
También deja <prefijo>-hoja.png (vista general numerada) para revisar qué salió y ponerles nombre."""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

Image.MAX_IMAGE_PIXELS = None   # las planchas de un metro cuadrado son enormes


def mascara(img):
    """Devuelve (mascara_bool, alfa_final) a resolución completa: True = parte del diseño."""
    a = np.asarray(img.convert('RGBA'))
    alfa = a[..., 3]
    if alfa.min() < 250 and (alfa < 10).mean() > 0.02:          # fondo transparente
        return alfa > 12, alfa
    # fondo liso: color de las esquinas
    h, w = alfa.shape
    esq = np.concatenate([a[:8, :8, :3].reshape(-1, 3), a[:8, -8:, :3].reshape(-1, 3), a[-8:, :8, :3].reshape(-1, 3), a[-8:, -8:, :3].reshape(-1, 3)])
    fondo = np.median(esq, axis=0)
    dist = np.abs(a[..., :3].astype('int16') - fondo.astype('int16')).max(axis=2)
    m = dist > 28
    # alfa suave según la distancia al fondo (bordes limpios)
    al = np.clip((dist.astype('float32') - 14) * 255 / 40, 0, 255).astype('uint8')
    return m, al


def etiquetar(mini):
    """Componentes conectados (8 vecinos) de una máscara chica con unión-búsqueda. Devuelve lista de cajas (x0,y0,x1,y1)."""
    h, w = mini.shape
    padre = {}
    def hallar(i):
        while padre[i] != i:
            padre[i] = padre[padre[i]]; i = padre[i]
        return i
    def unir(a, b):
        ra, rb = hallar(a), hallar(b)
        if ra != rb: padre[rb] = ra
    et = np.zeros((h, w), dtype='int64'); n = 0
    for y in range(h):
        fila = mini[y]
        for x in np.flatnonzero(fila):
            vecinos = []
            if x > 0 and et[y, x - 1]: vecinos.append(et[y, x - 1])
            if y > 0:
                for dx in (-1, 0, 1):
                    xx = x + dx
                    if 0 <= xx < w and et[y - 1, xx]: vecinos.append(et[y - 1, xx])
            if not vecinos:
                n += 1; padre[n] = n; et[y, x] = n
            else:
                et[y, x] = vecinos[0]
                for v in vecinos[1:]: unir(vecinos[0], v)
    cajas = {}
    ys, xs = np.nonzero(et)
    for y, x in zip(ys, xs):
        r = hallar(et[y, x]); c = cajas.get(r)
        if c is None: cajas[r] = [x, y, x, y, 1]
        else:
            if x < c[0]: c[0] = x
            if y < c[1]: c[1] = y
            if x > c[2]: c[2] = x
            if y > c[3]: c[3] = y
            c[4] += 1
    return [tuple(c) for c in cajas.values()]


def fusionar(cajas, sep):
    """Une cajas que se tocan o están a menos de `sep` (por si el dilatado no alcanzó)."""
    cajas = [list(c[:4]) for c in cajas]
    cambio = True
    while cambio:
        cambio = False
        for i in range(len(cajas)):
            for j in range(i + 1, len(cajas)):
                a, b = cajas[i], cajas[j]
                if a[0] - sep <= b[2] and b[0] - sep <= a[2] and a[1] - sep <= b[3] and b[1] - sep <= a[3]:
                    cajas[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                    del cajas[j]; cambio = True; break
            if cambio: break
    return cajas


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__); sys.exit(1)
    src, pref = args[0], args[1]
    op = {'--union': 90.0, '--min': 1.5, '--margen': 24.0}
    salida = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'disenos')
    i = 2
    while i < len(args):
        if args[i] == '--salida': salida = args[i + 1]; i += 2
        elif args[i] in op: op[args[i]] = float(args[i + 1]); i += 2
        else: i += 1
    os.makedirs(salida, exist_ok=True)

    img = Image.open(src); W, H = img.size
    print('plancha', W, 'x', H, 'px')
    m, alfa = mascara(img)

    # versión chica para hallar los diseños rápido: se dilata para que las partes de un mismo diseño se unan
    f = max(1, int(max(W, H) / 1400))
    mini = np.asarray(Image.fromarray((m * 255).astype('uint8')).resize((W // f, H // f), Image.BOX)) > 8
    k = int(op['--union'] / f) | 1
    k = max(3, min(k, 151))
    mini_d = np.asarray(Image.fromarray((mini * 255).astype('uint8')).filter(ImageFilter.MaxFilter(k))) > 0
    cajas = etiquetar(mini_d)
    cajas = fusionar([c for c in cajas], 0)
    lado_min = min(W, H) * op['--min'] / 100.0
    piezas = []
    for x0, y0, x1, y1 in cajas:
        X0, Y0, X1, Y1 = x0 * f, y0 * f, (x1 + 1) * f, (y1 + 1) * f
        # recorte ajustado al contenido real
        sub = m[max(0, Y0 - k * f // 2):min(H, Y1 + k * f // 2), max(0, X0 - k * f // 2):min(W, X1 + k * f // 2)]
        ys, xs = np.nonzero(sub)
        if len(ys) == 0: continue
        ox, oy = max(0, X0 - k * f // 2), max(0, Y0 - k * f // 2)
        bx0, by0, bx1, by1 = ox + xs.min(), oy + ys.min(), ox + xs.max() + 1, oy + ys.max() + 1
        if max(bx1 - bx0, by1 - by0) < lado_min: continue
        piezas.append((bx0, by0, bx1, by1))
    # orden de lectura: arriba→abajo, izquierda→derecha
    alto = np.median([p[3] - p[1] for p in piezas]) if piezas else 1
    piezas.sort(key=lambda p: (round(p[1] / max(alto * .6, 1)), p[0]))
    print(len(piezas), 'diseños encontrados')

    rgba = img.convert('RGBA')
    miniaturas = []
    mar = int(op['--margen'])
    for n, (x0, y0, x1, y1) in enumerate(piezas, 1):
        crop = rgba.crop((x0, y0, x1, y1))
        al = Image.fromarray(alfa[y0:y1, x0:x1])
        crop.putalpha(al)
        lienzo = Image.new('RGBA', (crop.width + 2 * mar, crop.height + 2 * mar), (0, 0, 0, 0))
        lienzo.paste(crop, (mar, mar))
        nombre = f'{pref}-{n:02d}.png'
        lienzo.save(os.path.join(salida, nombre))
        print(' ', nombre, lienzo.size)
        miniaturas.append(lienzo)

    # hoja de revisión numerada, sobre damero gris
    if miniaturas:
        cel, cols = 320, 5
        filas = (len(miniaturas) + cols - 1) // cols
        hoja = Image.new('RGB', (cel * cols, (cel + 28) * filas), (70, 70, 78))
        d = ImageDraw.Draw(hoja)
        for n, im in enumerate(miniaturas):
            t = im.copy(); t.thumbnail((cel - 20, cel - 20))
            cx, cy = (n % cols) * cel, (n // cols) * (cel + 28)
            fondo = Image.new('RGB', (cel - 10, cel - 10), (110, 110, 120)); hoja.paste(fondo, (cx + 5, cy + 5))
            hoja.paste(t, (cx + (cel - t.width) // 2, cy + (cel - t.height) // 2), t)
            d.text((cx + 8, cy + cel - 4), f'{pref}-{n + 1:02d}  {im.width}x{im.height}', fill=(255, 255, 255))
        hoja.save(os.path.join(salida, f'{pref}-hoja.png'))
        print('hoja de revisión:', os.path.join(salida, f'{pref}-hoja.png'))


if __name__ == '__main__':
    main()
