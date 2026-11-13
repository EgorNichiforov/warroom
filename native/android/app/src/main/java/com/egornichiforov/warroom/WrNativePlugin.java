package com.egornichiforov.warroom;

import android.Manifest;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.view.WindowManager;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "WrNative", permissions = {
    @Permission(alias = "mic", strings = { Manifest.permission.RECORD_AUDIO }),
    @Permission(alias = "notify", strings = { "android.permission.POST_NOTIFICATIONS" })
})
public class WrNativePlugin extends Plugin {

    private SharedPreferences prefs() { return getContext().getSharedPreferences(RecorderService.PREFS, Context.MODE_PRIVATE); }

    private String launch = null;

    @Override
    public void load() { Intent it = getActivity().getIntent(); takeShare(it); takeLaunch(it); }

    private boolean takeLaunch(Intent it) {
        if (it == null) return false;
        String a = null;
        if (it.getData() != null && "warroom".equals(it.getData().getScheme())) a = it.getData().getHost();
        if (a == null && it.getStringExtra("wr_open") != null) a = it.getStringExtra("wr_open");
        if (a == null) return false;
        launch = a; it.setData(null); it.removeExtra("wr_open");
        return true;
    }

    /** What the app was opened for (home-screen shortcut or the recording notification); returned once. */
    @PluginMethod
    public void takeLaunch(PluginCall call) { JSObject o = new JSObject(); o.put("action", launch); launch = null; call.resolve(o); }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (takeShare(intent)) notifyListeners("shared", new JSObject(), true);
        if (takeLaunch(intent)) notifyListeners("launch", new JSObject(), true);
    }

    /** An audio file shared from another app (e.g. the Recorder app) is copied in and queued like a finished recording. */
    private boolean takeShare(Intent it) {
        try {
            if (it == null || !Intent.ACTION_SEND.equals(it.getAction())) return false;
            String type = it.getType(); if (type == null || !(type.startsWith("audio/") || type.startsWith("video/"))) return false;
            Uri u = it.getParcelableExtra(Intent.EXTRA_STREAM); if (u == null) return false;
            ContentResolver cr = getContext().getContentResolver();
            String name = "shared"; try (Cursor c = cr.query(u, null, null, null, null)) { if (c != null && c.moveToFirst()) { int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME); if (i >= 0) name = c.getString(i); } }
            String ext = name.contains(".") ? name.substring(name.lastIndexOf('.')) : (type.contains("mp4") || type.contains("m4a") ? ".m4a" : ".audio");
            File dir = new File(getContext().getFilesDir(), "recordings"); dir.mkdirs();
            long t = System.currentTimeMillis(); File out = new File(dir, "shared-" + t + ext);
            try (InputStream in = cr.openInputStream(u); OutputStream os = new FileOutputStream(out)) { byte[] b = new byte[65536]; int n; while ((n = in.read(b)) > 0) os.write(b, 0, n); }
            prefs().edit().putString("pending", out.getAbsolutePath()).putLong("pendingDur", 0).putLong("pendingAt", t).putString("pendingTitle", name).putString("pendingMime", type).apply();
            it.setAction(Intent.ACTION_MAIN);
            return true;
        } catch (Exception e) { prefs().edit().putString("error", "share: " + e.getMessage()).apply(); return false; }
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("mic") != PermissionState.GRANTED) { requestPermissionForAliases(new String[] { "mic", "notify" }, call, "permsDone"); return; }
        doStart(call);
    }

    @PermissionCallback
    private void permsDone(PluginCall call) {
        if (getPermissionState("mic") != PermissionState.GRANTED) { call.reject("Microphone permission was not given. Allow it in Android Settings → Apps → War Room → Permissions."); return; }
        doStart(call);
    }

    private void doStart(PluginCall call) {
        if (RecorderService.recording) { call.resolve(status()); return; }
        prefs().edit().remove("error").apply();
        Intent i = new Intent(getContext(), RecorderService.class).setAction(RecorderService.ACTION_START).putExtra("title", call.getString("title", ""));
        ContextCompat.startForegroundService(getContext(), i);
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            String err = prefs().getString("error", null);
            if (!RecorderService.recording && err != null) call.reject("Could not start recording: " + err); else call.resolve(status());
        }, 700);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (!RecorderService.recording) { call.resolve(status()); return; }
        Intent i = new Intent(getContext(), RecorderService.class).setAction(RecorderService.ACTION_STOP);
        getContext().startService(i);
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> call.resolve(status()), 900);
    }

    private JSObject status() {
        SharedPreferences p = prefs(); JSObject o = new JSObject();
        o.put("recording", RecorderService.recording);
        o.put("startedAt", RecorderService.recording ? RecorderService.startedAt : 0);
        o.put("title", RecorderService.recording ? RecorderService.title : "");
        String pend = p.getString("pending", null);
        if (pend != null && new File(pend).exists()) {
            JSObject f = new JSObject(); File file = new File(pend);
            f.put("path", pend); f.put("size", file.length()); f.put("durMs", p.getLong("pendingDur", 0)); f.put("at", p.getLong("pendingAt", 0));
            f.put("title", p.getString("pendingTitle", "")); f.put("mime", p.getString("pendingMime", "audio/mp4"));
            o.put("pending", f);
        }
        String err = p.getString("error", null); if (err != null) o.put("error", err);
        return o;
    }

    @PluginMethod
    public void status(PluginCall call) { call.resolve(status()); }

    /** Clears the pending marker once the app has taken the file. */
    @PluginMethod
    public void ack(PluginCall call) { prefs().edit().remove("pending").remove("pendingDur").remove("pendingAt").remove("pendingTitle").remove("pendingMime").apply(); call.resolve(); }

    @PluginMethod
    public void read(PluginCall call) {
        String path = call.getString("path"); if (path == null || !path.startsWith(getContext().getFilesDir().getAbsolutePath())) { call.reject("bad path"); return; }
        File f = new File(path); if (!f.exists()) { call.reject("file not found"); return; }
        int off = call.getInt("offset", 0), len = call.getInt("length", (int) f.length());
        try (FileInputStream in = new FileInputStream(f)) {
            long sk = in.skip(off); byte[] b = new byte[(int) Math.max(0, Math.min(len, f.length() - off))]; int r = 0;
            while (r < b.length) { int n = in.read(b, r, b.length - r); if (n < 0) break; r += n; }
            JSObject o = new JSObject(); o.put("data", Base64.encodeToString(b, 0, r, Base64.NO_WRAP)); o.put("size", f.length()); call.resolve(o);
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void list(PluginCall call) {
        File dir = new File(getContext().getFilesDir(), "recordings"); JSArray a = new JSArray();
        File[] fs = dir.listFiles(); if (fs != null) for (File f : fs) { JSObject o = new JSObject(); o.put("path", f.getAbsolutePath()); o.put("size", f.length()); o.put("at", f.lastModified()); a.put(o); }
        JSObject o = new JSObject(); o.put("files", a); call.resolve(o);
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String path = call.getString("path"); if (path != null && path.startsWith(getContext().getFilesDir().getAbsolutePath())) new File(path).delete();
        call.resolve();
    }

    /** Keeps the screen on (dial sessions). */
    @PluginMethod
    public void keepAwake(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", true));
        getActivity().runOnUiThread(() -> { if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); call.resolve(); });
    }

    @PluginMethod
    public void info(PluginCall call) { JSObject o = new JSObject(); o.put("sdk", Build.VERSION.SDK_INT); o.put("model", Build.MANUFACTURER + " " + Build.MODEL); o.put("version", "1.0"); call.resolve(o); }
}
