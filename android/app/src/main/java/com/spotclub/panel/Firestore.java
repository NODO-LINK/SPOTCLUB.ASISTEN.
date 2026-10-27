package com.spotclub.panel;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Lee Firestore por su API REST con la sesión del administrador. Sin librerías externas. */
final class Firestore {

    /** Sesión caducada o revocada: hay que abrir la app para volver a iniciar sesión. */
    static final class SesionInvalida extends Exception {}

    private final SharedPreferences prefs;
    private final String apiKey, proyecto;
    private String idToken;
    private long vence;

    Firestore(Context c) {
        prefs = Avisos.prefs(c);
        apiKey = prefs.getString("apiKey", "");
        proyecto = prefs.getString("proyecto", "");
    }

    private String token() throws Exception {
        if (idToken != null && System.currentTimeMillis() < vence - 60000) return idToken;
        String cuerpo = "grant_type=refresh_token&refresh_token=" + java.net.URLEncoder.encode(prefs.getString("refresh", ""), "UTF-8");
        HttpURLConnection h = (HttpURLConnection) new URL("https://securetoken.googleapis.com/v1/token?key=" + apiKey).openConnection();
        h.setConnectTimeout(20000); h.setReadTimeout(20000); h.setRequestMethod("POST"); h.setDoOutput(true);
        h.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        try (OutputStream o = h.getOutputStream()) { o.write(cuerpo.getBytes("UTF-8")); }
        int codigo = h.getResponseCode();
        if (codigo == 400 || codigo == 401 || codigo == 403) throw new SesionInvalida();
        if (codigo != 200) throw new IOException("token " + codigo);
        JSONObject j = new JSONObject(leer(h.getInputStream()));
        idToken = j.getString("id_token");
        vence = System.currentTimeMillis() + Long.parseLong(j.optString("expires_in", "3600")) * 1000L;
        String nuevo = j.optString("refresh_token", "");
        if (!nuevo.isEmpty()) prefs.edit().putString("refresh", nuevo).apply();
        return idToken;
    }

    private static String leer(InputStream in) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        byte[] t = new byte[8192]; int n;
        while ((n = in.read(t)) > 0) b.write(t, 0, n);
        return b.toString("UTF-8");
    }

    private String get(String url, boolean conToken) throws Exception {
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        h.setConnectTimeout(20000); h.setReadTimeout(30000);
        if (conToken) h.setRequestProperty("Authorization", "Bearer " + token());
        int codigo = h.getResponseCode();
        if (codigo == 404) return null;
        if (codigo == 401) { idToken = null; throw new SesionInvalida(); }
        if (codigo == 403) return null;                       // sin permiso sobre esa colección: se omite
        if (codigo != 200) throw new IOException("http " + codigo);
        return leer(h.getInputStream());
    }

    private String base() { return "https://firestore.googleapis.com/v1/projects/" + proyecto + "/databases/(default)/documents/"; }

    /** Todos los documentos de una colección. Si no existe o no hay permiso, devuelve una lista vacía. */
    List<Map<String, Object>> listar(String coleccion) throws Exception {
        List<Map<String, Object>> out = new ArrayList<>();
        String pagina = "";
        do {
            String r = get(base() + coleccion + "?pageSize=300" + pagina, true);
            if (r == null) break;
            JSONObject j = new JSONObject(r);
            JSONArray docs = j.optJSONArray("documents");
            if (docs != null) for (int i = 0; i < docs.length(); i++) out.add(Resumen.documento(docs.getJSONObject(i)));
            String sig = j.optString("nextPageToken", "");
            pagina = sig.isEmpty() ? "" : "&pageToken=" + java.net.URLEncoder.encode(sig, "UTF-8");
        } while (!pagina.isEmpty());
        return out;
    }

    Map<String, Object> obtener(String ruta) throws Exception {
        String r = get(base() + ruta, true);
        return r == null ? null : Resumen.documento(new JSONObject(r));
    }

    /** Descarga un archivo público del sitio (por ejemplo contenido/contenido.json). */
    static String publico(String url) {
        try {
            HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
            h.setConnectTimeout(15000); h.setReadTimeout(15000);
            return h.getResponseCode() == 200 ? leer(h.getInputStream()) : null;
        } catch (Exception e) { return null; }
    }
}
