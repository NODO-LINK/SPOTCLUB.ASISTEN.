package com.spotclub.panel;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Muestra un recordatorio propio a su hora. */
public class RecordatorioReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String id = i.getStringExtra("id"), texto = i.getStringExtra("texto");
        if (id == null || texto == null) return;
        if (id.startsWith("diario-")) {                       // aviso fijo: "título|texto", y deja listo el de mañana
            int k = texto.indexOf('|');
            Avisos.notificar(c, id.hashCode(), k < 0 ? "Spot Club" : texto.substring(0, k), k < 0 ? texto : texto.substring(k + 1));
            if (Avisos.activo(c)) Avisos.programarDiarios(c);
            return;
        }
        Avisos.notificar(c, id.hashCode(), "Recordatorio", texto);
    }
}
