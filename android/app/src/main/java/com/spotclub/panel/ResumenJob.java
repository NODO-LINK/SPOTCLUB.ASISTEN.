package com.spotclub.panel;

import android.app.job.JobParameters;
import android.app.job.JobService;

/** Se ejecuta cerca de las 8:00 a. m. y muestra el resumen del día. */
public class ResumenJob extends JobService {

    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(() -> {
            boolean listo = Avisos.enviarResumen(this);
            if (listo) Avisos.programar(this, true);          // deja lista la de mañana
            jobFinished(params, !listo);                       // si falló la red, Android reintenta
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) { return true; }
}
