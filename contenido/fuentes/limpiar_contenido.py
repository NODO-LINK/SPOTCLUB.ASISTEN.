#!/usr/bin/env python3
"""Deja en el panel SOLO el contenido de hoy (hora de Caracas): quita de contenido.json las piezas de otros días (y las que no tienen fecha, como los mockups viejos) y borra sus archivos.
Uso: python3 -I contenido/fuentes/limpiar_contenido.py [AAAA-MM-DD]"""
import json, os, sys, datetime
AQUI = os.path.dirname(os.path.abspath(__file__)); DIR = os.path.join(AQUI, '..')
hoy = sys.argv[1] if len(sys.argv) > 1 else (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=4)).strftime('%Y-%m-%d')
mp = os.path.join(DIR, 'contenido.json'); m = json.load(open(mp, encoding='utf8'))
quedan = [p for p in m['piezas'] if p.get('fecha') == hoy]; fuera = [p for p in m['piezas'] if p.get('fecha') != hoy]
if not quedan:
    print('no hay piezas de', hoy, '- no se borra nada'); sys.exit(0)
usados = {a for p in quedan for a in p.get('archivos', []) + ([p['poster']] if p.get('poster') else [])}
borrados = 0
for p in fuera:
    for a in p.get('archivos', []) + ([p['poster']] if p.get('poster') else []):
        f = os.path.join(DIR, a)
        if a not in usados and not str(a).startswith('data:') and os.path.isfile(f) and os.path.dirname(os.path.abspath(f)) == os.path.abspath(DIR):
            os.remove(f); borrados += 1
m['piezas'] = quedan
open(mp, 'w', encoding='utf8').write(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
print(f'quedan {len(quedan)} piezas de {hoy}; se quitaron {len(fuera)} y {borrados} archivos')
