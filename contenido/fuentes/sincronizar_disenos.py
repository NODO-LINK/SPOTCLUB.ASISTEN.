#!/usr/bin/env python3
"""Baja a contenido/disenos/panel/ los diseños que el dueño sube en el apartado «Diseños» del panel (Firestore), para que los
generadores del contenido diario los reutilicen. Deja una copia de trabajo (máx. 2000 px de lado, PNG con transparencia);
el original completo sigue guardado en el panel.
Uso:  python3 -I contenido/fuentes/sincronizar_disenos.py [--proyecto spot-club-inventario]
Necesita las reglas de Firestore con lectura pública SOLO de los diseños (ver firestore.rules). Si no están publicadas, avisa y sale sin error.
Escribe contenido/disenos/panel/indice.json: {"disenos":[{"id","titulo","archivo","fecha","tipo","prenda","usar"}]}, del más nuevo al más viejo.
  tipo   = "diseno" (PNG con transparencia: va en franelas/hoodie/pósters) o "rectangular" (imagen opaca completa, p. ej. una carta o una foto: va en cartas/pósters, NO se estampa en franelas)
  prenda = "negra" (diseño claro), "blanca" (diseño oscuro) según la luminosidad de la tinta
  grande = true si es un collage/ilustración densa: se estampa en la ESPALDA casi siempre (80 %)
  usar   = false si el archivo está en contenido/disenos/panel/excluir.json (lista "archivos" con motivo)"""
import base64, io, json, os, re, sys, time, unicodedata, urllib.request, urllib.error
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, '..', 'disenos', 'panel')
PROYECTO = 'spot-club-inventario'
if '--proyecto' in sys.argv:
    PROYECTO = sys.argv[sys.argv.index('--proyecto') + 1]
BASE = f'https://firestore.googleapis.com/v1/projects/{PROYECTO}/databases/(default)/documents'
MAX_LADO = 2000
Image.MAX_IMAGE_PIXELS = 120_000_000


def consulta(coleccion, campo, valor):
    cuerpo = {'structuredQuery': {'from': [{'collectionId': coleccion}],
              'where': {'fieldFilter': {'field': {'fieldPath': campo}, 'op': 'EQUAL', 'value': {'stringValue': valor}}}}}
    req = urllib.request.Request(BASE + ':runQuery', data=json.dumps(cuerpo).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        filas = json.load(r)
    return [f['document'] for f in filas if 'document' in f]


def val(v):
    if 'stringValue' in v: return v['stringValue']
    if 'integerValue' in v: return int(v['integerValue'])
    if 'timestampValue' in v: return v['timestampValue']
    if 'mapValue' in v: return {k: val(x) for k, x in v['mapValue'].get('fields', {}).items()}
    return None


def campos(doc):
    d = {k: val(v) for k, v in doc.get('fields', {}).items()}
    d['id'] = doc['name'].rsplit('/', 1)[-1]
    return d


def slug(t):
    t = unicodedata.normalize('NFKD', t or 'diseno').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')[:60] or 'diseno'


def clasificar(im):
    a = np.asarray(im.convert('RGBA')).astype('float32'); w = a[..., 3] / 255.0
    opaco = float((a[..., 3] > 250).mean()); luz = float(((0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]) * w).sum() / max(w.sum(), 1))
    ys, xs = np.where(a[..., 3] > 25); cob = float((a[..., 3] > 25)[ys.min():ys.max() + 1, xs.min():xs.max() + 1].mean()) if len(ys) else 0
    grande = (min(im.size) >= 900 and cob > 0.45) and opaco <= 0.9   # collage/ilustración densa: va en la ESPALDA casi siempre
    return {'tipo': 'rectangular' if opaco > 0.9 else 'diseno', 'prenda': 'negra' if luz >= 110 else 'blanca', 'grande': bool(grande)}


def main():
    os.makedirs(SALIDA, exist_ok=True)
    ip = os.path.join(SALIDA, 'indice.json')
    previo = json.load(open(ip, encoding='utf8')) if os.path.exists(ip) else {'disenos': []}
    previos = {d['id']: d for d in previo['disenos']}
    try:
        docs = [campos(d) for d in consulta('piezas_gen', 'kind', 'diseno')]
    except urllib.error.HTTPError as e:
        print(f'No se pudo leer el panel (HTTP {e.code}). Falta publicar las reglas de Firestore con lectura de diseños; se usan los diseños que ya hay en el repositorio.')
        return
    except Exception as e:
        print('No se pudo conectar al panel:', e); return
    docs.sort(key=lambda d: d.get('creado') or '', reverse=True)
    ex = os.path.join(SALIDA, 'excluir.json')
    excluidos = set(json.load(open(ex, encoding='utf8')).get('archivos', [])) if os.path.exists(ex) else set()
    nuevos, lista, vistos = 0, [], set()
    for d in docs:
        o = d.get('orig')
        if not o:   # sin original completo solo hay vista previa de baja calidad: no sirve para el contenido
            continue
        prev = previos.get(d['id'])
        if prev and os.path.exists(os.path.join(SALIDA, prev['archivo'])) and prev.get('partes') == o.get('partes'):
            prev['usar'] = prev['archivo'] not in excluidos
            if 'grande' not in prev:   # entradas de antes de existir la clasificación
                prev.update(clasificar(Image.open(os.path.join(SALIDA, prev['archivo']))))
            lista.append(prev); vistos.add(prev['archivo']); continue
        partes = sorted((campos(x) for x in consulta('disenos_orig', 'p', d['id'])), key=lambda x: x['n'])
        if len(partes) != o.get('partes'):
            print('incompleto, se omite:', d.get('titulo')); continue
        try:
            im = Image.open(io.BytesIO(base64.b64decode(''.join(p['d'] for p in partes)))); im.load()
        except Exception as e:
            print('archivo dañado, se omite:', d.get('titulo'), e); continue
        im = im.convert('RGBA')
        if max(im.size) > MAX_LADO:
            k = MAX_LADO / max(im.size); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        nombre = slug(d.get('titulo')) + '.png'
        if nombre in vistos: nombre = slug(d.get('titulo')) + '-' + d['id'][:5] + '.png'
        im.save(os.path.join(SALIDA, nombre), optimize=True)
        vistos.add(nombre); nuevos += 1
        lista.append({'id': d['id'], 'titulo': d.get('titulo'), 'archivo': nombre, 'partes': o.get('partes'), 'fecha': d.get('creado'), 'nuevo': True,
                      **clasificar(im), 'usar': nombre not in excluidos})
        print('nuevo:', nombre, im.size)
    # borra de la copia local los diseños que ya no están en el panel
    quitados = 0
    for f in os.listdir(SALIDA):
        if f.endswith('.png') and f not in vistos:
            os.remove(os.path.join(SALIDA, f)); quitados += 1
    json.dump({'actualizado': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'disenos': lista}, open(ip, 'w', encoding='utf8'), indent=2, ensure_ascii=False)
    print(f'{len(lista)} diseños del panel ({nuevos} nuevos, {quitados} quitados).')


main()
