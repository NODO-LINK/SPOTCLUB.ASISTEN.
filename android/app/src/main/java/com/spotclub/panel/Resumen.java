package com.spotclub.panel;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Arma el resumen de las 8:00 a partir de los documentos de Firestore.
 * No usa nada de Android para poder probarlo en cualquier computador.
 * Las reglas son las mismas que usa el panel (límites de atraso, stock mínimo, etc.).
 */
public final class Resumen {

    private static final long DIA = 86400000L;
    private static final long CARACAS = -4L * 3600000L;          // Venezuela: UTC-4 todo el año
    private static final int DIAS_COBRO_URGENTE = 7;

    public static final class Resultado {
        public String titulo = "Spot Club · resumen de hoy";
        public final List<String> lineas = new ArrayList<>();
        public String texto() { return String.join("\n", lineas); }
    }

    /** Convierte un documento de la API REST de Firestore en un mapa simple. */
    public static Map<String, Object> documento(JSONObject d) throws Exception {
        Map<String, Object> m = campos(d.optJSONObject("fields"));
        String nombre = d.optString("name", "");
        m.put("_id", nombre.substring(nombre.lastIndexOf('/') + 1));
        return m;
    }

    private static Map<String, Object> campos(JSONObject f) throws Exception {
        Map<String, Object> m = new HashMap<>();
        if (f == null) return m;
        JSONArray claves = f.names();
        if (claves == null) return m;
        for (int i = 0; i < claves.length(); i++) {
            String k = claves.getString(i);
            m.put(k, valor(f.getJSONObject(k)));
        }
        return m;
    }

    private static Object valor(JSONObject v) throws Exception {
        if (v.has("stringValue")) return v.getString("stringValue");
        if (v.has("integerValue")) return Long.parseLong(v.getString("integerValue"));
        if (v.has("doubleValue")) return v.getDouble("doubleValue");
        if (v.has("booleanValue")) return v.getBoolean("booleanValue");
        if (v.has("timestampValue")) return Instant.parse(v.getString("timestampValue")).toEpochMilli();
        if (v.has("arrayValue")) {
            List<Object> l = new ArrayList<>();
            JSONArray a = v.getJSONObject("arrayValue").optJSONArray("values");
            if (a != null) for (int i = 0; i < a.length(); i++) l.add(valor(a.getJSONObject(i)));
            return l;
        }
        if (v.has("mapValue")) return campos(v.getJSONObject("mapValue").optJSONObject("fields"));
        return null;
    }

    // ── utilidades ──────────────────────────────────────────────
    private static double num(Object o) { return o instanceof Number ? ((Number) o).doubleValue() : 0; }
    private static String txt(Object o) { return o == null ? "" : String.valueOf(o); }
    private static boolean si(Object o) { return Boolean.TRUE.equals(o); }
    @SuppressWarnings("unchecked") private static List<Object> lista(Object o) { return o instanceof List ? (List<Object>) o : new ArrayList<>(); }
    @SuppressWarnings("unchecked") private static Map<String, Object> mapa(Object o) { return o instanceof Map ? (Map<String, Object>) o : new HashMap<>(); }

    public static long inicioDia(long ms) { return Math.floorDiv(ms + CARACAS, DIA) * DIA - CARACAS; }

    private static String dinero(double v) { return "$" + String.format(Locale.US, "%.2f", v).replace('.', ','); }

    private static String hora(long ms) {
        long m = Math.floorMod(ms + CARACAS, DIA) / 60000L;
        int h = (int) (m / 60), mi = (int) (m % 60);
        String ampm = h >= 12 ? "p. m." : "a. m.";
        int h12 = h % 12 == 0 ? 12 : h % 12;
        return h12 + ":" + String.format("%02d", mi) + " " + ampm;
    }

    private static String plural(long n, String uno, String varios) { return n + " " + (n == 1 ? uno : varios); }

    private static String primerNombre(Object o) { String s = txt(o).trim(); int i = s.indexOf(' '); return i > 0 ? s.substring(0, i) : s; }

    private static long fechaDe(Map<String, Object> v) { return v.get("fecha") instanceof Number ? ((Number) v.get("fecha")).longValue() : 0; }

    private static String etapaDe(Map<String, Object> v) {
        String e = txt(v.get("logistica"));
        return e.equals("enviado") || e.equals("agencia") || e.equals("entregado") ? e : "procesado";
    }

    private static long desdeDe(Map<String, Object> v) {
        if (v.get("etapaDesde") instanceof Number) return ((Number) v.get("etapaDesde")).longValue();
        List<Object> h = lista(v.get("historial"));
        if (!h.isEmpty()) { Object f = mapa(h.get(h.size() - 1)).get("fecha"); if (f instanceof Number) return ((Number) f).longValue(); }
        return fechaDe(v);
    }

    private static int limite(String etapa) { return etapa.equals("procesado") ? 2 : etapa.equals("enviado") ? 5 : etapa.equals("agencia") ? 3 : -1; }

    private static double pagado(Map<String, Object> v) { double s = 0; for (Object p : lista(v.get("pagos"))) s += num(mapa(p).get("monto")); return s; }

    // ── el resumen ──────────────────────────────────────────────
    /**
     * @param ventas        documentos de la colección ventas
     * @param inventario    documentos de inventario
     * @param nombres       id de producto → nombre (de config/catalogo)
     * @param recordatorios documentos de recordatorios
     * @param piezasHoy     cuántos diseños nuevos de hoy hay en contenido/contenido.json (-1 si no se pudo leer)
     * @param ahora         hora actual en milisegundos
     */
    public static Resultado construir(List<Map<String, Object>> ventas, List<Map<String, Object>> inventario,
                                      Map<String, String> nombres, List<Map<String, Object>> recordatorios,
                                      int piezasHoy, long ahora) {
        Resultado r = new Resultado();
        long hoy0 = inicioDia(ahora), ayer0 = hoy0 - DIA;

        List<String> atrasadas = new ArrayList<>();
        int sinEnviar = 0, cobrosN = 0, seguimiento = 0, pedidosAyer = 0, pagosAyerN = 0;
        double cobrosTotal = 0, cobradoAyer = 0;

        for (Map<String, Object> v : ventas) {
            if (si(v.get("anulada"))) continue;
            String etapa = etapaDe(v);
            long dias = Math.max(0, (ahora - desdeDe(v)) / DIA);
            int lim = limite(etapa);
            if (lim >= 0 && dias > lim) atrasadas.add(primerNombre(v.get("nombre")));
            if (etapa.equals("procesado")) sinEnviar++;
            if (etapa.equals("entregado") && !si(v.get("seguimiento")) && dias >= 2 && dias <= 10) seguimiento++;
            // cobros: solo pedidos ya migrados (con número de factura)
            if (v.get("numero") != null) {
                double saldo = Math.max(0, num(v.get("monto")) - pagado(v));
                if (saldo > 0.004 && (ahora - fechaDe(v)) / DIA > DIAS_COBRO_URGENTE) { cobrosN++; cobrosTotal += saldo; }
            }
            long f = fechaDe(v);
            if (f >= ayer0 && f < hoy0) pedidosAyer++;
            for (Object p : lista(v.get("pagos"))) {
                Map<String, Object> pm = mapa(p);
                long pf = pm.get("fecha") instanceof Number ? ((Number) pm.get("fecha")).longValue() : 0;
                if (pf >= ayer0 && pf < hoy0) { cobradoAyer += num(pm.get("monto")); pagosAyerN++; }
            }
        }

        if (!atrasadas.isEmpty()) {
            String quienes = String.join(", ", atrasadas.subList(0, Math.min(3, atrasadas.size()))) + (atrasadas.size() > 3 ? "…" : "");
            r.lineas.add("Entregas atrasadas: " + atrasadas.size() + " (" + quienes + ")");
        }
        if (sinEnviar > 0) r.lineas.add(plural(sinEnviar, "pedido espera despacho", "pedidos esperan despacho"));
        if (cobrosN > 0) r.lineas.add("Cobros con más de " + DIAS_COBRO_URGENTE + " días: " + cobrosN + " (" + dinero(cobrosTotal) + ")");

        List<String> bajos = new ArrayList<>();
        for (Map<String, Object> s : inventario) {
            if (!si(s.get("cargado"))) continue;
            double cant = num(s.get("cantidad"));
            double min = s.get("minimo") instanceof Number ? ((Number) s.get("minimo")).doubleValue() : 3;
            if (cant <= min) {
                String id = txt(s.get("productoId")), talla = txt(s.get("talla"));
                String nombre = nombres.containsKey(id) ? nombres.get(id) : id;
                bajos.add(nombre + (talla.isEmpty() ? "" : " T." + talla) + " (" + (long) cant + ")");
            }
        }
        if (!bajos.isEmpty()) r.lineas.add("Poco stock: " + String.join(", ", bajos.subList(0, Math.min(3, bajos.size()))) + (bajos.size() > 3 ? " y " + (bajos.size() - 3) + " más" : ""));

        if (seguimiento > 0) r.lineas.add(plural(seguimiento, "cliente para seguimiento", "clientes para seguimiento"));
        if (piezasHoy > 0) r.lineas.add(plural(piezasHoy, "diseño nuevo de hoy para descargar", "diseños nuevos de hoy para descargar"));

        // recordatorios propios: los de hoy o vencidos que no estén hechos
        List<Map<String, Object>> propios = new ArrayList<>();
        for (Map<String, Object> rec : recordatorios) {
            if (si(rec.get("hecho"))) continue;
            long f = rec.get("fecha") instanceof Number ? ((Number) rec.get("fecha")).longValue() : 0;
            if (f < hoy0 + DIA) propios.add(rec);
        }
        propios.sort((a, b) -> Long.compare(((Number) a.get("fecha")).longValue(), ((Number) b.get("fecha")).longValue()));
        for (Map<String, Object> rec : propios) {
            long f = ((Number) rec.get("fecha")).longValue();
            String cuando = f < hoy0 ? "vencido" : si(rec.get("conHora")) ? hora(f) : "hoy";
            r.lineas.add("Recordatorio: " + txt(rec.get("texto")) + " (" + cuando + ")");
        }

        // cierre de caja de ayer
        if (pagosAyerN > 0 || pedidosAyer > 0)
            r.lineas.add("Ayer: cobraste " + dinero(cobradoAyer) + " en " + plural(pagosAyerN, "pago", "pagos") + " y entraron " + plural(pedidosAyer, "pedido", "pedidos"));

        if (r.lineas.isEmpty()) r.lineas.add("Todo al día. No hay nada pendiente.");
        return r;
    }
}
