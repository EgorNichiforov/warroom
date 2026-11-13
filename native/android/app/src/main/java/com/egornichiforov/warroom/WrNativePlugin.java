package com.egornichiforov.warroom;

import android.Manifest;
import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.provider.Settings;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;
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

    @PluginMethod
    public void pause(PluginCall call) { send(RecorderService.ACTION_PAUSE); new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> call.resolve(status()), 250); }

    @PluginMethod
    public void resume(PluginCall call) { send(RecorderService.ACTION_RESUME); new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> call.resolve(status()), 250); }

    private void send(String action) { if (RecorderService.recording) getContext().startService(new Intent(getContext(), RecorderService.class).setAction(action)); }

    private JSObject status() {
        SharedPreferences p = prefs(); JSObject o = new JSObject();
        o.put("recording", RecorderService.recording);
        o.put("startedAt", RecorderService.recording ? RecorderService.startedAt : 0);
        o.put("paused", RecorderService.recording && RecorderService.paused);
        o.put("elapsed", RecorderService.recording ? RecorderService.elapsed() : 0);
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

    /* ───────── screen time (Android usage access) ───────── */
    private boolean usageAllowed() {
        AppOpsManager ops = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        int mode = Build.VERSION.SDK_INT >= 29 ? ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), getContext().getPackageName())
            : ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), getContext().getPackageName());
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    @PluginMethod
    public void usageAccess(PluginCall call) { JSObject o = new JSObject(); o.put("allowed", usageAllowed()); call.resolve(o); }

    @PluginMethod
    public void openUsageSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { getContext().startActivity(i); } catch (Exception e) { getContext().startActivity(new Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); }
        call.resolve();
    }

    /** Foreground time per app per day, from the same events Digital Wellbeing uses. days = how many days back (incl. today). */
    @PluginMethod
    public void usage(PluginCall call) {
        if (!usageAllowed()) { call.reject("NO_ACCESS"); return; }
        int days = Math.max(1, Math.min(30, call.getInt("days", 8)));
        UsageStatsManager um = (UsageStatsManager) getContext().getSystemService(Context.USAGE_STATS_SERVICE);
        PackageManager pm = getContext().getPackageManager();
        String self = getContext().getPackageName();
        Map<String, String> labels = new HashMap<>();
        JSArray out = new JSArray();
        Calendar c = Calendar.getInstance(); c.set(Calendar.HOUR_OF_DAY, 0); c.set(Calendar.MINUTE, 0); c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0);
        long todayStart = c.getTimeInMillis();
        for (int d = days - 1; d >= 0; d--) {
            Calendar s0 = Calendar.getInstance(); s0.setTimeInMillis(todayStart); s0.add(Calendar.DAY_OF_YEAR, -d);
            Calendar e0 = (Calendar) s0.clone(); e0.add(Calendar.DAY_OF_YEAR, 1);
            long start = s0.getTimeInMillis(), end = Math.min(e0.getTimeInMillis(), System.currentTimeMillis());
            // look back 3 h so an app already open at midnight is counted from midnight
            UsageEvents ev = um.queryEvents(start - 3 * 3600 * 1000L, end);
            Map<String, Long> fg = new HashMap<>(), open = new HashMap<>();
            int unlocks = 0; String cur = null;
            UsageEvents.Event e = new UsageEvents.Event();
            while (ev.hasNextEvent()) {
                ev.getNextEvent(e);
                long t = e.getTimeStamp(); String pk = e.getPackageName(); int ty = e.getEventType();
                if (ty == 1) { // ACTIVITY_RESUMED
                    if (cur != null && open.containsKey(cur) && !cur.equals(pk)) { add(fg, cur, Math.max(start, open.get(cur)), Math.min(t, end)); open.remove(cur); }
                    open.put(pk, t); cur = pk;
                } else if (ty == 2 || ty == 23) { // ACTIVITY_PAUSED / STOPPED
                    if (open.containsKey(pk)) { add(fg, pk, Math.max(start, open.get(pk)), Math.min(t, end)); open.remove(pk); }
                    if (pk.equals(cur)) cur = null;
                } else if (ty == 16 || ty == 26) { // SCREEN_NON_INTERACTIVE / DEVICE_SHUTDOWN: everything stops
                    for (Map.Entry<String, Long> x : open.entrySet()) add(fg, x.getKey(), Math.max(start, x.getValue()), Math.min(t, end));
                    open.clear(); cur = null;
                } else if (ty == 18 && t >= start) unlocks++; // KEYGUARD_HIDDEN = phone unlocked
            }
            if (d == 0) for (Map.Entry<String, Long> x : open.entrySet()) add(fg, x.getKey(), Math.max(start, x.getValue()), end);
            JSObject day = new JSObject(); JSArray apps = new JSArray(); long total = 0;
            for (Map.Entry<String, Long> x : fg.entrySet()) {
                long ms = x.getValue(); if (ms < 30000) continue;
                String pk = x.getKey(); if (isLauncher(pm, pk)) continue;
                String lb = labels.get(pk);
                if (lb == null) { try { ApplicationInfo ai = pm.getApplicationInfo(pk, 0); lb = String.valueOf(pm.getApplicationLabel(ai)); } catch (Exception ex) { lb = pk; } labels.put(pk, lb); }
                JSObject a = new JSObject(); a.put("pkg", pk); a.put("name", lb); a.put("ms", ms); a.put("self", pk.equals(self)); apps.put(a); total += ms;
            }
            day.put("start", start); day.put("total", total); day.put("unlocks", unlocks); day.put("apps", apps); day.put("partial", d == 0);
            out.put(day);
        }
        JSObject o = new JSObject(); o.put("days", out); call.resolve(o);
    }
    private static void add(Map<String, Long> m, String k, long a, long b) { if (b > a) m.put(k, (m.containsKey(k) ? m.get(k) : 0L) + (b - a)); }
    private Map<String, Boolean> launcherCache = new HashMap<>();
    private boolean isLauncher(PackageManager pm, String pk) {
        Boolean b = launcherCache.get(pk); if (b != null) return b;
        Intent i = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME);
        boolean r = false; for (android.content.pm.ResolveInfo ri : pm.queryIntentActivities(i, 0)) if (ri.activityInfo != null && pk.equals(ri.activityInfo.packageName)) r = true;
        r = r || pk.equals("com.android.systemui"); launcherCache.put(pk, r); return r;
    }
}
