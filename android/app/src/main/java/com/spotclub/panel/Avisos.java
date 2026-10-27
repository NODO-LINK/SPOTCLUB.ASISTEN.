package com.spotclub.panel;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.Instant;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Notificaciones del teléfono: el resumen de las 8:00 y los recordatorios con hora. */
final class Avisos {

    static final String CANAL = "resumen";
    static final int JOB_ID = 8001;
    private static final long DIA = 86400000L;
    private static final long HORA_RESUMEN = 8L * 3600000L;     // 8:00 a. m. de Caracas

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("avisos", Context.MODE_PRIVATE); }

    static boolean sesionGuardada(Context c) { return !prefs(c).getString("refresh", "").isEmpty(); }
    static boolean activo(Context c) { return prefs(c).getBoolean("activo", true) && sesionGuardada(c); }

    static boolean permiso(Context c) {
        return Build.VERSION.SDK_INT < 33 || c.checkSelfPermission("android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED;
    }

    static void crearCanal(Context c) {
        NotificationChannel ch = new NotificationChannel(CANAL, "Resumen y recordatorios", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Resumen diario de las 8:00 y tus recordatorios");
        c.getSystemService(NotificationManager.class).createNotificationChannel(ch);
    }

    static void notificar(Context c, int id, String titulo, String texto) {
        if (!permiso(c)) return;
        crearCanal(c);
        Intent abrir = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 0, abrir, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        String primera = texto.contains("\n") ? texto.substring(0, texto.indexOf('\n')) : texto;
        Notification n = new Notification.Builder(c, CANAL)
                .setSmallIcon(R.drawable.ic_notificacion)
                .setContentTitle(titulo)
                .setContentText(primera)
                .setStyle(new Notification.BigTextStyle().bigText(texto))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        c.getSystemService(NotificationManager.class).notify(id, n);
    }

    // ── resumen de las 8:00 ─────────────────────────────────────
    static long proximoResumen(long ahora) {
        long hoy8 = Resumen.inicioDia(ahora) + HORA_RESUMEN;
        return ahora < hoy8 ? hoy8 : hoy8 + DIA;
    }

    /** Deja programada la próxima tarea de las 8:00. Con forzar=false no toca una ya programada. */
    static void programar(Context c, boolean forzar) {
        JobScheduler js = c.getSystemService(JobScheduler.class);
        if (!activo(c)) { js.cancel(JOB_ID); return; }
        if (!forzar && js.getPendingJob(JOB_ID) != null) return;
        long espera = proximoResumen(System.currentTimeMillis()) - System.currentTimeMillis();
        JobInfo job = new JobInfo.Builder(JOB_ID, new ComponentName(c, ResumenJob.class))
                .setMinimumLatency(espera)
                .setOverrideDeadline(espera + 2 * 3600000L)
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPersisted(true)
                .build();
        js.schedule(job);
    }

    /**
     * Lee los datos, arma el resumen y lo muestra.
     * @return false si fue un fallo de red (conviene reintentar); true en cualquier otro caso.
     */
    static boolean enviarResumen(Context c) {
        try {
            Firestore fs = new Firestore(c);
            long ahora = System.currentTimeMillis();
            List<Map<String, Object>> ventas = fs.listar("ventas");
            List<Map<String, Object>> inventario = fs.listar("inventario");
            List<Map<String, Object>> recordatorios = fs.listar("recordatorios");

            Map<String, String> nombres = new HashMap<>();
            Map<String, Object> cat = fs.obtener("config/catalogo");
            if (cat != null && cat.get("productos") instanceof List)
                for (Object p : (List<?>) cat.get("productos"))
                    if (p instanceof Map) { Map<?, ?> m = (Map<?, ?>) p; nombres.put(String.valueOf(m.get("id")), String.valueOf(m.get("nombre"))); }

            int piezasHoy = -1;
            String manifiesto = Firestore.publico(BuildConfig.PANEL_URL + "contenido/contenido.json");
            if (manifiesto != null) {
                String hoy = Instant.ofEpochMilli(ahora).atZone(ZoneId.of("America/Caracas")).toLocalDate().toString();
                JSONArray piezas = new JSONObject(manifiesto).optJSONArray("piezas");
                piezasHoy = 0;
                if (piezas != null) for (int i = 0; i < piezas.length(); i++) if (hoy.equals(piezas.getJSONObject(i).optString("fecha"))) piezasHoy++;
            }

            Resumen.Resultado r = Resumen.construir(ventas, inventario, nombres, recordatorios, piezasHoy, ahora);
            notificar(c, 1, r.titulo, r.texto());

            // recordatorios de hoy con hora: se dejan como alarmas del teléfono
            long hoy0 = Resumen.inicioDia(ahora);
            for (Map<String, Object> rec : recordatorios) {
                if (Boolean.TRUE.equals(rec.get("hecho")) || !Boolean.TRUE.equals(rec.get("conHora"))) continue;
                long f = rec.get("fecha") instanceof Number ? ((Number) rec.get("fecha")).longValue() : 0;
                if (f > ahora && f < hoy0 + DIA) programarAlarma(c, String.valueOf(rec.get("_id")), String.valueOf(rec.get("texto")), f);
            }
            return true;
        } catch (Firestore.SesionInvalida e) {
            notificar(c, 2, "Spot Club", "Abre la app e inicia sesión de nuevo para seguir recibiendo el resumen de las 8:00.");
            return true;
        } catch (java.io.IOException e) {
            return false;
        } catch (Exception e) {
            return true;
        }
    }

    // ── recordatorios con hora ──────────────────────────────────
    private static PendingIntent intencion(Context c, String id, String texto) {
        Intent i = new Intent(c, RecordatorioReceiver.class).putExtra("id", id).putExtra("texto", texto);
        i.setAction("recordatorio-" + id);
        return PendingIntent.getBroadcast(c, id.hashCode(), i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static void programarAlarma(Context c, String id, String texto, long cuando) {
        if (cuando <= System.currentTimeMillis()) return;
        c.getSystemService(AlarmManager.class).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cuando, intencion(c, id, texto));
    }

    static void cancelarAlarma(Context c, String id) {
        c.getSystemService(AlarmManager.class).cancel(intencion(c, id, ""));
    }
}
