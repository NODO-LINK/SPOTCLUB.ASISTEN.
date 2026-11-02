# Diseños para los mockups

Aquí van los diseños de las franelas como **PNG con fondo transparente** (el arte solo, sin la prenda).
Cada archivo genera su mockup sobre la franela real y sirve de diseño en los flyers de producto.

- Nombre corto y claro: `ojo-spot.png`, `perros-criollos.png`.
- Mínimo 1500 px de ancho para que se vea nítido.
- Para un diseño negro, mándalo también en blanco (se estampa sobre franela negra).
- Mockup solo: `node contenido/fuentes/premium.js` con `"modo":"mockup"`.

## Planchas de DTF (varios diseños en un PNG grande)
`python3 -I contenido/fuentes/extraer_disenos.py plancha.png prefijo`
Separa cada diseño en `contenido/disenos/<prefijo>-NN.png` (fondo transparente) y crea `<prefijo>-hoja.png` para revisarlos.
Si un diseño sale partido en pedazos, subir `--union` (por ejemplo 200); si dos diseños salen pegados, bajarlo. Con `--min` se ignoran motas y marcas.
Lo mejor es una plancha con fondo transparente; en fondo blanco se pierden los diseños blancos.
