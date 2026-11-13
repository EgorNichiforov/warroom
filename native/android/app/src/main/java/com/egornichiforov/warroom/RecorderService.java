package com.egornichiforov.warroom;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import java.io.File;

/** Records the microphone in a foreground service, so it keeps going with the screen off or another app open. */
public class RecorderService extends Service {
    public static final String ACTION_START = "wr.rec.START", ACTION_STOP = "wr.rec.STOP";
    static final String CH = "wr_rec", PREFS = "wr_rec";
    static final int NID = 4711;
    static volatile boolean recording = false;
    static volatile long startedAt = 0;
    static volatile String path = null, title = "";
    private MediaRecorder rec;
    private PowerManager.WakeLock wl;

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String a = intent != null ? intent.getAction() : null;
        if (ACTION_STOP.equals(a)) { finish(); return START_NOT_STICKY; }
        if (ACTION_START.equals(a) && !recording) {
            title = intent.getStringExtra("title"); if (title == null) title = "";
            File dir = new File(getFilesDir(), "recordings"); dir.mkdirs();
            startedAt = System.currentTimeMillis();
            path = new File(dir, "rec-" + startedAt + ".m4a").getAbsolutePath();
            Notification n = note();
            if (Build.VERSION.SDK_INT >= 30) ServiceCompat.startForeground(this, NID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            else startForeground(NID, n);
            try {
                rec = Build.VERSION.SDK_INT >= 31 ? new MediaRecorder(this) : new MediaRecorder();
                rec.setAudioSource(MediaRecorder.AudioSource.MIC);
                rec.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                rec.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
                rec.setAudioChannels(1);
                rec.setAudioSamplingRate(16000);
                rec.setAudioEncodingBitRate(32000);
                rec.setOutputFile(path);
                rec.prepare();
                rec.start();
                recording = true;
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "warroom:rec");
                wl.acquire(4 * 60 * 60 * 1000L);
                prefs().edit().putBoolean("active", true).putLong("startedAt", startedAt).putString("path", path).putString("title", title).apply();
            } catch (Exception e) {
                recording = false; prefs().edit().putString("error", String.valueOf(e.getMessage())).apply();
                stopForeground(true); stopSelf();
            }
        }
        return START_NOT_STICKY;
    }

    private SharedPreferences prefs() { return getSharedPreferences(PREFS, MODE_PRIVATE); }

    private void finish() {
        long dur = System.currentTimeMillis() - startedAt;
        try { if (rec != null) { rec.stop(); } } catch (Exception ignored) { }
        try { if (rec != null) rec.release(); } catch (Exception ignored) { }
        rec = null;
        if (wl != null && wl.isHeld()) wl.release();
        if (recording && path != null) {
            // the finished file waits here until the app picks it up
            prefs().edit().putBoolean("active", false).putString("pending", path).putLong("pendingDur", dur).putLong("pendingAt", startedAt).putString("pendingTitle", title).apply();
        }
        recording = false;
        stopForeground(true);
        stopSelf();
    }

    @Override public void onDestroy() { if (recording) finish(); super.onDestroy(); }

    private Notification note() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CH) == null) {
            NotificationChannel c = new NotificationChannel(CH, "Recording", NotificationManager.IMPORTANCE_LOW);
            c.setDescription("Shown while War Room records a conversation");
            nm.createNotificationChannel(c);
        }
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        Intent stop = new Intent(this, RecorderService.class).setAction(ACTION_STOP);
        PendingIntent pStop = PendingIntent.getService(this, 1, stop, fl);
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("wr_open", "rec");
        PendingIntent pOpen = PendingIntent.getActivity(this, 2, open, fl);
        return new NotificationCompat.Builder(this, CH)
            .setSmallIcon(R.drawable.ic_stat_wr)
            .setContentTitle("War Room is recording")
            .setContentText(title.isEmpty() ? "Tap Stop when the conversation ends" : title)
            .setOngoing(true)
            .setUsesChronometer(true)
            .setWhen(startedAt)
            .setContentIntent(pOpen)
            .addAction(0, "Stop & summarize", pStop)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build();
    }
}
