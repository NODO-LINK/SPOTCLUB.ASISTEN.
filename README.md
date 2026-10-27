# THE SPOT · Panel de ventas

Aplicación de un solo archivo (`index.html`) con Firebase Auth y Firestore. Dominio: `thespot.dgp-link.com`.

## Secciones

- **Panel**: qué atender hoy, facturado del mes, cobrado hoy, por cobrar, entregas atrasadas, caja de hoy y gráficas.
- **Entregas**: tablero por etapa (procesado, enviado, en agencia, entregado) con guía, alertas por días sin avanzar, historial y opción de deshacer.
- **Facturación**: comprobante interno correlativo (F-000001), abonos con método y referencia, saldo, anulación con motivo e impresión. No tiene validez fiscal.
- **Ventas**: registro de pedidos con pago inicial opcional, historial con filtros y exportación a CSV. Cada factura se puede editar (datos, productos, etapa de entrega, pagos), anular, restaurar o eliminar.
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
