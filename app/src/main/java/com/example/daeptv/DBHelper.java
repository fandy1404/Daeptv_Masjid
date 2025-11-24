package com.example.daeptv;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * DBHelper final:
 * - Membuat tabel baru: settings (id,json), media (id,type,base64,created_at), media_meta (id,type,path,name)
 * - Menyediakan API helper (save/get media)
 * - Melakukan migrasi dari skema lama (jika ditemukan)
 */
public class DBHelper extends SQLiteOpenHelper {
    private static final String TAG = "DBHelper";
    private static final String DATABASE_NAME = "daeptv_combined.db";
    private static final int DATABASE_VERSION = 2; // bump when schema changes

    public DBHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    // Called when DB is first created
    @Override
    public void onCreate(SQLiteDatabase db) {
        // settings table: store all settings as single JSON
        db.execSQL("CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, json TEXT);");

        // media table: store base64 blobs (video/audio/hero)
        db.execSQL("CREATE TABLE IF NOT EXISTS media (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "type TEXT," +        // e.g. "video_quran", "audio", "hero"
                "base64 TEXT," +
                "created_at INTEGER DEFAULT (strftime('%s','now'))" +
                ");");

        // metadata table: path / name for files if you use filesystem approach
        db.execSQL("CREATE TABLE IF NOT EXISTS media_meta (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "type TEXT," +
                "path TEXT," +
                "name TEXT" +
                ");");

        // create any old tables if you want to ensure safe migration checks (optional)
        // e.g. if older APK used masjid_info/prayer_times, they may exist already;
        // we don't create them here to avoid overwriting old data.
    }

    // Called on DB version upgrade
    @Override
    public void onUpgrade(SQLiteDatabase db, int oldV, int newV) {
        Log.i(TAG, "onUpgrade: " + oldV + " -> " + newV);
        // If we ever need to change schema, add safe migration code here.
        // For now, attempt migration from old schema (if old tables exist) into new tables.
        migrateOldSchemaIfNeeded(db);
    }

    @Override
    public void onOpen(SQLiteDatabase db) {
        super.onOpen(db);
        // Ensure tables exist (in case DB created by older version)
        db.execSQL("CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, json TEXT);");
        db.execSQL("CREATE TABLE IF NOT EXISTS media (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "type TEXT," +
                "base64 TEXT," +
                "created_at INTEGER DEFAULT (strftime('%s','now'))" +
                ");");
        db.execSQL("CREATE TABLE IF NOT EXISTS media_meta (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "type TEXT," +
                "path TEXT," +
                "name TEXT" +
                ");");

        // Run migration on open too (safe, idempotent)
        migrateOldSchemaIfNeeded(db);
    }

    // -------------------------
    // Migration: detect old schema and copy
    // -------------------------
    private void migrateOldSchemaIfNeeded(SQLiteDatabase db) {
        try {
            // Check for existence of an old table (e.g. masjid_info or media)
            if (tableExists(db, "masjid_info") || tableExists(db, "media") || tableExists(db, "quote")) {
                Log.i(TAG, "Old schema detected -> running migration");

                // Read old values (wrap each in try/catch)
                JSONObject settingsJson = new JSONObject();

                try {
                    if (tableExists(db, "masjid_info")) {
                        Cursor c = db.rawQuery("SELECT name, address FROM masjid_info WHERE id = 1 LIMIT 1", null);
                        if (c != null && c.moveToFirst()) {
                            settingsJson.put("masjidName", c.getString(0));
                            settingsJson.put("masjidAddress", c.getString(1));
                        }
                        if (c != null) c.close();
                    }
                } catch (Exception e) { Log.w(TAG, "migrate: masjid_info read error", e); }

                try {
                    if (tableExists(db, "prayer_times")) {
                        Cursor c = db.rawQuery("SELECT subuh, dzuhur, ashar, maghrib, isya, imsak, syuruq FROM prayer_times WHERE id = 1 LIMIT 1", null);
                        JSONObject pt = new JSONObject();
                        if (c != null && c.moveToFirst()) {
                            pt.put("subuh", c.getString(0));
                            pt.put("dzuhur", c.getString(1));
                            pt.put("ashar", c.getString(2));
                            pt.put("maghrib", c.getString(3));
                            pt.put("isya", c.getString(4));
                            pt.put("imsak", c.getString(5));
                            pt.put("syuruq", c.getString(6));
                            settingsJson.put("prayerTimes", pt);
                        }
                        if (c != null) c.close();
                    }
                } catch (Exception e) { Log.w(TAG, "migrate: prayer_times read error", e); }

                try {
                    if (tableExists(db, "iqomah_delays")) {
                        Cursor c = db.rawQuery("SELECT subuh, dzuhur, ashar, maghrib, isya FROM iqomah_delays WHERE id = 1 LIMIT 1", null);
                        JSONObject delays = new JSONObject();
                        if (c != null && c.moveToFirst()) {
                            delays.put("subuh", c.getInt(0));
                            delays.put("dzuhur", c.getInt(1));
                            delays.put("ashar", c.getInt(2));
                            delays.put("maghrib", c.getInt(3));
                            delays.put("isya", c.getInt(4));
                            settingsJson.put("iqomahDelays", delays);
                        }
                        if (c != null) c.close();
                    }
                } catch (Exception e) { Log.w(TAG, "migrate: iqomah_delays read error", e); }

                try {
                    if (tableExists(db, "quote")) {
                        Cursor c = db.rawQuery("SELECT text, source FROM quote WHERE id = 1 LIMIT 1", null);
                        if (c != null && c.moveToFirst()) {
                            JSONObject quote = new JSONObject();
                            quote.put("text", c.getString(0));
                            quote.put("source", c.getString(1));
                            settingsJson.put("quote", quote);
                        }
                        if (c != null) c.close();
                    }
                } catch (Exception e) { Log.w(TAG, "migrate: quote read error", e); }

                try {
                    if (tableExists(db, "running_text")) {
                        Cursor c = db.rawQuery("SELECT text FROM running_text WHERE id = 1 LIMIT 1", null);
                        if (c != null && c.moveToFirst()) {
                            settingsJson.put("runningText", c.getString(0));
                        }
                        if (c != null) c.close();
                    }
                } catch (Exception e) { Log.w(TAG, "migrate: running_text read error", e); }

                // If old media table contains hero_image, video blobs or base64 (schema may vary),
                // try to copy into new media table as type + base64.
                try {
                    if (tableExists(db, "media")) {
                        // Try multiple possibilities safely
                        Cursor c = db.rawQuery("SELECT id, hero_image, video_quran, video_kajian, video_khutbah, audio_azan FROM media LIMIT 1", null);
                        if (c != null && c.moveToFirst()) {
                            // hero_image etc might be stored as blob or base64; handle as string fallback
                            try {
                                String hero_b64 = c.getString(c.getColumnIndex("hero_image"));
                                if (hero_b64 != null && hero_b64.length() > 10) insertMediaIfNotExists(db, "hero", hero_b64);
                            } catch (Exception ignored) {}
                            try {
                                String vq = c.getString(c.getColumnIndex("video_quran"));
                                if (vq != null && vq.length() > 10) insertMediaIfNotExists(db, "video_quran", vq);
                            } catch (Exception ignored) {}
                            try {
                                String vk = c.getString(c.getColumnIndex("video_kajian"));
                                if (vk != null && vk.length() > 10) insertMediaIfNotExists(db, "video_kajian", vk);
                            } catch (Exception ignored) {}
                            try {
                                String vh = c.getString(c.getColumnIndex("video_khutbah"));
                                if (vh != null && vh.length() > 10) insertMediaIfNotExists(db, "video_khutbah", vh);
                            } catch (Exception ignored) {}
                            try {
                                String audio = c.getString(c.getColumnIndex("audio_azan"));
                                if (audio != null && audio.length() > 10) insertMediaIfNotExists(db, "audio", audio);
                            } catch (Exception ignored) {}
                        }
                        if (c != null) c.close();
                    }
                } catch (Exception e) { Log.w(TAG, "migrate: media copy error", e); }

                // Finally, store the settings JSON into new settings table (only if non-empty)
                if (settingsJson.length() > 0) {
                    try {
                        ContentValues cv = new ContentValues();
                        cv.put("id", 1);
                        cv.put("json", settingsJson.toString());
                        db.insertWithOnConflict("settings", null, cv, SQLiteDatabase.CONFLICT_REPLACE);
                        Log.i(TAG, "Migration: settings saved to new table.");
                    } catch (Exception e) {
                        Log.w(TAG, "migrate: write settings failed", e);
                    }
                }

                // Optionally: mark migration done by dropping old tables or adding a migration flag table.
                // We won't drop old tables automatically to avoid data loss; we can add a migration flag:
                try {
                    db.execSQL("CREATE TABLE IF NOT EXISTS migration_flags (name TEXT PRIMARY KEY, value INTEGER);");
                    ContentValues flag = new ContentValues();
                    flag.put("name", "migrated_to_v2");
                    flag.put("value", 1);
                    db.insertWithOnConflict("migration_flags", null, flag, SQLiteDatabase.CONFLICT_REPLACE);
                } catch (Exception e) { Log.w(TAG, "migrate: set flag failed", e); }
            }
        } catch (Exception ex) {
            Log.w(TAG, "migrateOldSchemaIfNeeded error", ex);
        }
    }

    private boolean tableExists(SQLiteDatabase db, String tableName) {
        Cursor c = null;
        try {
            c = db.rawQuery("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1", new String[]{tableName});
            boolean exists = (c != null && c.moveToFirst());
            if (c != null) c.close();
            return exists;
        } catch (Exception e) {
            if (c != null) c.close();
            return false;
        }
    }

    // insert into new media table only if there's no similar record (basic check)
    private void insertMediaIfNotExists(SQLiteDatabase db, String type, String base64) {
        try {
            Cursor c = db.rawQuery("SELECT id FROM media WHERE type=? LIMIT 1", new String[]{type});
            boolean exists = (c != null && c.moveToFirst());
            if (c != null) c.close();
            if (!exists) {
                ContentValues cv = new ContentValues();
                cv.put("type", type);
                cv.put("base64", base64);
                db.insert("media", null, cv);
            }
        } catch (Exception e) {
            Log.w(TAG, "insertMediaIfNotExists error", e);
        }
    }

    // -------------------------
    // Public helper API (used by JSBridge)
    // -------------------------
    public void saveSettingsJson(SQLiteDatabase db, String json) {
        ContentValues cv = new ContentValues();
        cv.put("id", 1);
        cv.put("json", json);
        db.insertWithOnConflict("settings", null, cv, SQLiteDatabase.CONFLICT_REPLACE);
    }

    public String loadSettingsJson(SQLiteDatabase db) {
        Cursor c = db.rawQuery("SELECT json FROM settings WHERE id=1 LIMIT 1", null);
        String res = "";
        if (c != null && c.moveToFirst()) {
            res = c.getString(0);
            c.close();
        }
        return res == null ? "" : res;
    }

    public void saveMedia(SQLiteDatabase db, String type, String base64) {
        ContentValues cv = new ContentValues();
        cv.put("type", type);
        cv.put("base64", base64);
        db.insert("media", null, cv);
    }

    public String getLatestMedia(SQLiteDatabase db, String type) {
        Cursor c = db.rawQuery("SELECT base64 FROM media WHERE type=? ORDER BY id DESC LIMIT 1", new String[]{type});
        String res = "";
        if (c != null && c.moveToFirst()) {
            res = c.getString(0);
            c.close();
        }
        return res == null ? "" : res;
    }

    public String getAllMediaMetaJson(SQLiteDatabase db) {
        Cursor cursor = db.rawQuery("SELECT id, type, path, name FROM media_meta", null);
        JSONArray arr = new JSONArray();
        if (cursor.moveToFirst()) {
            do {
                JSONObject o = new JSONObject();
                try {
                    o.put("id", cursor.getInt(0));
                    o.put("type", cursor.getString(1));
                    o.put("path", cursor.getString(2));
                    o.put("name", cursor.getString(3));
                    arr.put(o);
                } catch (JSONException ignored) {}
            } while (cursor.moveToNext());
        }
        cursor.close();
        return arr.toString();
    }
}
