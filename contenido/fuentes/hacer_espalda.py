#!/usr/bin/env python3
"""Genera las bases de ESPALDA a partir de las fotos de frente que ya hay en contenido/mockups/:
 - franela negra y blanca: se cierra el escote delantero y se dibuja el cuello trasero (más alto y plano).
 - hoodie: se usa la foto de espalda real que envió el dueño (se pasa con --hoodie-espalda foto.jpg, recorte de la mitad derecha).
Uso: python3 -I contenido/fuentes/hacer_espalda.py [--hoodie-espalda ruta.jpg]"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__)); MOCK = os.path.join(AQUI, '..', 'mockups')


def cerrar_cuello(frente, salida):
    im = Image.open(os.path.join(MOCK, frente)).convert('RGB'); a = np.asarray(im).astype('float32')
    tela = a[150:170, 330:410].reshape(-1, 3).mean(axis=0)           # color de la tela justo debajo del cuello
    luz = a[150:170, 330:410].mean()
    capa = Image.new('RGB', im.size, tuple(int(v) for v in tela))
    mask = Image.new('L', im.size, 0); d = ImageDraw.Draw(mask)
    d.ellipse((276, 41, 460, 142), fill=255)                           # abre-cuello + aro delantero
    mask = mask.filter(ImageFilter.GaussianBlur(2))
    im2 = Image.composite(capa, im, mask)
    # los hombros que asoman por encima del aro quedan recortados por la silueta original: se redibuja el cuello trasero
    d2 = ImageDraw.Draw(im2)
    claro = tuple(min(255, int(v + (14 if luz < 120 else -10))) for v in tela)
    oscuro = tuple(max(0, int(v - (10 if luz < 120 else 26))) for v in tela)
    for k, col, w in ((0, claro, 3), (11, oscuro, 3)):                 # banda del cuello: dos líneas curvas paralelas, por dentro de la silueta
        d2.arc((304, 22 + k, 434, 50 + k), 15, 165, fill=col, width=w)
    # sombra suave bajo el cuello
    sh = Image.new('L', im.size, 0); ImageDraw.Draw(sh).ellipse((310, 48, 430, 84), fill=40)
    sh = sh.filter(ImageFilter.GaussianBlur(8)); sh.paste(0, (0, 0, im.width, 46))   # la sombra no sale por encima de la silueta
    im2 = Image.composite(Image.new('RGB', im.size, oscuro), im2, sh)
    im2.save(os.path.join(MOCK, salida), quality=95)
    print('ok', salida)


def hoodie_espalda(ruta):
    im = Image.open(ruta).convert('RGB'); w, h = im.size
    mitad = im.crop((w // 2, 0, w, h)); mitad = mitad.resize((mitad.width * 2, mitad.height * 2), Image.LANCZOS)
    mitad.save(os.path.join(MOCK, 'base-hoodie-espalda.jpg'), quality=95); print('ok base-hoodie-espalda.jpg', mitad.size)


if __name__ == '__main__':
    cerrar_cuello('base-franela-negra-frente.jpg', 'base-franela-negra-espalda.jpg')
    cerrar_cuello('base-franela-blanca-frente.jpg', 'base-franela-blanca-espalda.jpg')
    if '--hoodie-espalda' in sys.argv:
        hoodie_espalda(sys.argv[sys.argv.index('--hoodie-espalda') + 1])
