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
        Avisos.notificar(c, id.hashCode(), "Recordatorio", texto);
    }
}
