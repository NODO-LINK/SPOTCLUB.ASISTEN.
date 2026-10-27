# THE SPOT · Panel de ventas

Aplicación web (`index.html`) con Firebase Auth y Firestore. Los datos del proyecto de Firebase están en `firebase-config.js`. Dominio: `thespot.dgp-link.com`.

## Secciones

- **Panel**: qué atender hoy, facturado del mes, cobrado hoy, por cobrar, entregas atrasadas, caja de hoy y gráficas.
- **Entregas**: tablero por etapa (procesado, enviado, en agencia, entregado) con guía, alertas por días sin avanzar, historial y opción de deshacer.
- **Facturación**: comprobante interno correlativo (F-000001), abonos con método y referencia, saldo, anulación con motivo e impresión. No tiene validez fiscal.
- **Ventas**: registro de pedidos con pago inicial opcional, historial con filtros y exportación a CSV. Cada factura se puede editar (datos, productos, etapa de entrega, pagos), anular, restaurar o eliminar.
- **Contenido**: diseños para @spot__club (posts, carruseles y stories) en `contenido/`. Se descargan, se copia el caption, se programan en un calendario de 7 días y se marcan como publicados. Instagram no deja publicar desde el panel, así que la subida es manual. Además tiene un **generador**: plantillas (oferta con precio, frase, número grande, pasos, pregunta), formatos 4:5, 1:1 y 9:16 con la identidad de Spot Club, y generador de captions. Los diseños guardados se almacenan en `piezas_gen` (imagen JPEG incluida). Las fuentes de los diseños fijos están en `contenido/fuentes/` (`node render.js` los regenera).
- **Clientes**: ficha armada con las ventas, agrupadas por cédula. Muestra pedidos, facturado, pagado, saldo, ticket medio, tiempo de entrega, productos que más compra y notas propias. Al registrar una venta con una cédula conocida ofrece cargar sus datos.
- **Inventario**: existencias por producto y talla. Cada venta las descuenta; anular o eliminar una factura las repone. Entradas, mermas y conteos con nota, y alertas de poco stock. Vende igual si no alcanza, pero avisa.
- **Productos** (solo administración): agregar, editar y eliminar productos, tallas y diseños, y el costo de empaque.
- **Actividad** (solo administración): quién cambió qué y cuándo.

## Modelo de datos (Firestore)

```
ventas/{id}   numero, nombre, cedula, telefono, estado, agencia, items[], costoAdicional,
              razonAdicional, empaque, monto, pagos[{fecha,monto,metodo,referencia,por}],
              logistica (procesado|enviado|agencia|entregado), etapaDesde, guia,
              historial[{etapa,fecha,por,nota?}], anulada, motivoAnulacion, fecha
config/catalogo     { productos[], empaque }   catálogo editable (si no existe se usa el de fábrica)
piezas_gen/{id}     { titulo, tipo, formato, caption, img (JPEG data URL), creado, por }
publicaciones/{id}  { estado, programada, caption?, publicadaEn, enlace }   estado de cada pieza de contenido
clientes/{cedula}   { notas, nombre, cedula, actualizado, por }   solo notas; el resto se calcula
inventario/{id}     { productoId, talla, cantidad, minimo, cargado }   id = producto o producto::talla
contadores/ventas   { ultimo }            correlativo de facturas
auditoria/{id}      { accion, ventaId, numero, por, fecha, detalle }
usuarios/{uid}      { rol: "admin" | "ventas" | "despacho" }
```

## Primer uso tras actualizar

1. Entrar como administración. Aparece un aviso con **Migrar pedidos**.
2. La migración numera los pedidos anteriores por fecha, marca como pagados los entregados y deja pendientes el resto. No borra ni mueve datos.
3. Corregir los pagos que no coincidan desde **Facturación**.

## Inventario

Empieza en cero. Entra a **Inventario > Cargar conteo**, escribe lo que tienes de cada variante y guarda. Hasta que una variante se cargue no genera alertas. Las ventas hechas antes de esta versión no descuentan stock.

## Roles

Sin documento en `usuarios/{uid}` se asume `admin`. Para restringir a alguien, crear `usuarios/<uid>` con `rol: "ventas"` o `"despacho"`.
`firestore.rules` contiene las reglas que hacen cumplir esos permisos en el servidor. No están desplegadas; publicarlas desde Firebase Console cuando se hayan creado los documentos de roles.

## Entrega diaria por Telegram

`contenido/fuentes/telegram.js` envía las piezas del día a un chat de Telegram (cada una como foto con su caption y como archivo original). Los datos de acceso van en variables de entorno, nunca en el repositorio:

- `TELEGRAM_BOT_TOKEN`: token que entrega @BotFather al crear el bot (`/newbot`).
- `TELEGRAM_CHAT_ID`: id del chat. Escríbele al bot (o agrégalo al grupo y escribe algo) y ejecuta `node contenido/fuentes/telegram.js --id` para verlo.

Comandos: `--id` (lista los chats), `--prueba` (mensaje de prueba) y, sin argumentos, envía las piezas de hoy (`--fecha AAAA-MM-DD` para otra fecha). El entorno debe permitir conectarse a `api.telegram.org`.

## Cambiar de proyecto de Firebase (por ejemplo, a uno gratuito)

Todo lo que usa el panel (Authentication y Firestore) entra en el plan gratuito Spark. No usa Storage.

1. En el proyecto actual: entrar como administrador, ir a **Actividad → Descargar respaldo** y guardar el archivo.
2. En https://console.firebase.google.com crear un proyecto nuevo y dejarlo en el plan **Spark**.
3. **Authentication → Sign-in method**: activar *Correo electrónico/contraseña*. Luego **Users → Add user** para crear el acceso.
4. **Authentication → Settings → Authorized domains**: agregar `thespot.dgp-link.com`.
5. **Firestore Database → Create database** (modo producción, región cercana) y pegar las reglas de `firestore.rules` en la pestaña **Rules**.
6. **Project settings → Your apps → Web app**: copiar los valores de configuración y pegarlos en `firebase-config.js`.
7. Entrar al panel con el usuario nuevo, ir a **Actividad → Restaurar desde archivo** y elegir el respaldo.
8. Verificar ventas, inventario y clientes. Los usuarios de acceso no se restauran: se crean en Authentication.
