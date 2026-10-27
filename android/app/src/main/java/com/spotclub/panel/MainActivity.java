package com.spotclub.panel;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.URLUtil;
import android.widget.Toast;

import java.io.OutputStream;

/** Abre el panel de Spot Club dentro de una app. Toda la lógica vive en la página web. */
public class MainActivity extends Activity {

    private static final int PEDIR_ARCHIVO = 1;
    private WebView web;
    private ValueCallback<Uri[]> alElegirArchivo;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        Avisos.programar(this, false);        // deja listos los avisos de las 7:00, 8:00 y 20:00
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0c0d0e"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " SpotClubApp/1.0");
        CookieManager.getInstance().setAcceptCookie(true);

        web.addJavascriptInterface(new Puente(), "AndroidApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                String esquema = u.getScheme() == null ? "" : u.getScheme();
                String miHost = Uri.parse(BuildConfig.PANEL_URL).getHost();
                // Las páginas del propio panel se quedan dentro; WhatsApp, Instagram, correo, teléfono, etc. salen a su app.
                if ((esquema.equals("https") || esquema.equals("http")) && miHost != null && miHost.equals(u.getHost())) {
                    return false;
                }
                if (esquema.equals("blob") || esquema.equals("data") || esquema.equals("about")) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (ActivityNotFoundException e) {
                    Toast.makeText(MainActivity.this, "No hay una app para abrir este enlace", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                // La impresión del navegador no existe en la app: se redirige al servicio de impresión de Android.
                v.evaluateJavascript("window.print=function(){AndroidApp.imprimir();};", null);
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) {
                    String html = "<html><body style='margin:0;background:#0c0d0e;color:#f0f2f2;font-family:sans-serif;"
                            + "display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px'>"
                            + "<h2 style='margin:0 0 8px'>Sin conexión</h2>"
                            + "<p style='color:#9ba2a7;margin:0 0 20px'>Revisa tu internet y vuelve a intentar.</p>"
                            + "<a href='" + BuildConfig.PANEL_URL + "' style='background:#f0f2f2;color:#0c0d0e;padding:12px 22px;"
                            + "border-radius:8px;text-decoration:none;font-weight:700'>Reintentar</a></body></html>";
                    v.loadDataWithBaseURL(BuildConfig.PANEL_URL, html, "text/html", "utf-8", null);
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (alElegirArchivo != null) alElegirArchivo.onReceiveValue(null);
                alElegirArchivo = cb;
                try {
                    startActivityForResult(p.createIntent(), PEDIR_ARCHIVO);
                } catch (ActivityNotFoundException e) {
                    alElegirArchivo = null;
                    return false;
                }
                return true;
            }
        });

        web.setDownloadListener((url, agente, disposicion, mime, largo) -> {
            if (url.startsWith("data:")) {
                guardarDataUrl(url);
            } else if (url.startsWith("blob:")) {
                // Si la página no usó el puente, se pide al navegador interno que convierta el blob.
                String nombre = URLUtil.guessFileName(url, disposicion, mime);
                String js = "(async()=>{try{const r=await fetch('" + url + "');const b=await r.blob();const f=new FileReader();"
                        + "f.onloadend=()=>AndroidApp.guardar('" + nombre + "','" + mime + "',String(f.result).split(',')[1]);f.readAsDataURL(b);}catch(e){}})()";
                web.evaluateJavascript(js, null);
            } else {
                try {
                    DownloadManager.Request pedido = new DownloadManager.Request(Uri.parse(url));
                    pedido.setMimeType(mime);
                    pedido.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url));
                    pedido.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    pedido.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, URLUtil.guessFileName(url, disposicion, mime));
                    ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(pedido);
                    Toast.makeText(this, "Descargando…", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(this, "No se pudo descargar el archivo", Toast.LENGTH_LONG).show();
                }
            }
        });

        if (estado != null) {
            web.restoreState(estado);
        } else {
            web.loadUrl(BuildConfig.PANEL_URL);
        }
    }

    /** Guarda un archivo en la carpeta Descargas del teléfono. */
    private void guardarArchivo(String nombre, String mime, byte[] datos) {
        try {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME, nombre);
            v.put(MediaStore.Downloads.MIME_TYPE, mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
            v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            Uri destino = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (destino == null) throw new Exception("sin destino");
            try (OutputStream o = getContentResolver().openOutputStream(destino)) {
                o.write(datos);
            }
            Toast.makeText(this, "Guardado en Descargas: " + nombre, Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(this, "No se pudo guardar el archivo", Toast.LENGTH_LONG).show();
        }
    }

    private void guardarDataUrl(String url) {
        try {
            int coma = url.indexOf(',');
            String cabecera = url.substring(5, coma);
            String mime = cabecera.split(";")[0];
            String ext = mime.contains("/") ? mime.substring(mime.indexOf('/') + 1).replace("jpeg", "jpg") : "bin";
            byte[] datos = cabecera.contains("base64")
                    ? Base64.decode(url.substring(coma + 1), Base64.DEFAULT)
                    : Uri.decode(url.substring(coma + 1)).getBytes("UTF-8");
            guardarArchivo("spot-" + System.currentTimeMillis() + "." + ext, mime, datos);
        } catch (Exception e) {
            Toast.makeText(this, "No se pudo guardar el archivo", Toast.LENGTH_LONG).show();
        }
    }

    /** Funciones que la página puede llamar como AndroidApp.guardar(...) y AndroidApp.imprimir(). */
    private class Puente {
        @JavascriptInterface
        public void guardar(String nombre, String mime, String base64) {
            try {
                final byte[] datos = Base64.decode(base64, Base64.DEFAULT);
                runOnUiThread(() -> guardarArchivo(nombre, mime, datos));
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "No se pudo guardar el archivo", Toast.LENGTH_LONG).show());
            }
        }

        // ── avisos ───────────────────────────────────────────
        /** La página entrega la sesión del administrador para que el resumen de las 8:00 pueda leer los datos. */
        @JavascriptInterface
        public void sesion(String apiKey, String proyecto, String refresh) {
            Avisos.prefs(MainActivity.this).edit().putString("apiKey", apiKey).putString("proyecto", proyecto).putString("refresh", refresh).apply();
            Avisos.crearCanal(MainActivity.this);
            Avisos.programar(MainActivity.this, false);
        }

        @JavascriptInterface
        public void cerrarSesion() {
            Avisos.prefs(MainActivity.this).edit().remove("refresh").apply();
            Avisos.programar(MainActivity.this, true);
        }

        @JavascriptInterface
        public void avisos(boolean activos) {
            Avisos.prefs(MainActivity.this).edit().putBoolean("activo", activos).apply();
            Avisos.programar(MainActivity.this, true);
        }

        @JavascriptInterface
        public String estadoAvisos() {
            return "{\"activo\":" + Avisos.prefs(MainActivity.this).getBoolean("activo", true)
                    + ",\"sesion\":" + Avisos.sesionGuardada(MainActivity.this)
                    + ",\"permiso\":" + Avisos.permiso(MainActivity.this) + "}";
        }

        @JavascriptInterface
        public void pedirPermiso() {
            runOnUiThread(() -> {
                if (!Avisos.permiso(MainActivity.this)) requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 2);
            });
        }

        @JavascriptInterface
        public void probarAviso() {
            new Thread(() -> {
                boolean ok = Avisos.enviarResumen(MainActivity.this);
                if (!ok) runOnUiThread(() -> Toast.makeText(MainActivity.this, "No hay conexión para armar el resumen", Toast.LENGTH_LONG).show());
            }).start();
        }

        @JavascriptInterface
        public void programar(String id, String texto, String milisegundos) {
            try { Avisos.programarAlarma(MainActivity.this, id, texto, Long.parseLong(milisegundos)); } catch (NumberFormatException ignorar) { }
        }

        @JavascriptInterface
        public void cancelar(String id) { Avisos.cancelarAlarma(MainActivity.this, id); }

        @JavascriptInterface
        public void imprimir() {
            runOnUiThread(() -> {
                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                pm.print("Recibo Spot Club", web.createPrintDocumentAdapter("Recibo Spot Club"), new PrintAttributes.Builder().build());
            });
        }
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent datos) {
        if (pedido == PEDIR_ARCHIVO && alElegirArchivo != null) {
            alElegirArchivo.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultado, datos));
            alElegirArchivo = null;
            return;
        }
        super.onActivityResult(pedido, resultado, datos);
    }

    @Override
    protected void onSaveInstanceState(Bundle estado) {
        super.onSaveInstanceState(estado);
        web.saveState(estado);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
