package com.yourapp.package; // GANTI dengan nama paket kamu

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.content.ContentValues;
import android.database.Cursor;

public class DBHelper extends SQLiteOpenHelper {

    public static final String DATABASE_NAME = "webapp.db";
    public static final int DATABASE_VERSION = 1;

    public DBHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {

        // TABLE AUTH (Login Admin)
        db.execSQL("CREATE TABLE auth (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "username TEXT UNIQUE," +
                "password TEXT" +
                ")");

        // TABLE SETTINGS (Judul, hero image, video, dll.)
        db.execSQL("CREATE TABLE settings (" +
                "id INTEGER PRIMARY KEY CHECK(id = 1)," +
                "hero_image BLOB," +
                "video_quran BLOB," +
                "video_kajian BLOB" +
                ")");

        // TABLE RUNTIME (cache & data webview)
        db.execSQL("CREATE TABLE runtime (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "key TEXT UNIQUE," +
                "value TEXT" +
                ")");

        // Insert user admin default
        db.execSQL("INSERT INTO auth (username, password) VALUES ('admin', 'admin123')");
        // Insert row settings kosong (wajib karena id = 1)
        db.execSQL("INSERT INTO settings (id) VALUES (1)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS auth");
        db.execSQL("DROP TABLE IF EXISTS settings");
        db.execSQL("DROP TABLE IF EXISTS runtime");
        onCreate(db);
    }

    // ===================== AUTH =======================
    public boolean checkLogin(String username, String password) {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor c = db.rawQuery(
                "SELECT * FROM auth WHERE username=? AND password=?",
                new String[]{username, password}
        );
        boolean ok = c.moveToFirst();
        c.close();
        return ok;
    }

    // ===================== SETTINGS =====================
    public boolean saveSettings(byte[] hero, byte[] quran, byte[] kajian) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues cv = new ContentValues();
        if (hero != null) cv.put("hero_image", hero);
        if (quran != null) cv.put("video_quran", quran);
        if (kajian != null) cv.put("video_kajian", kajian);

        long result = db.update("settings", cv, "id = 1", null);
        return result > 0;
    }

    public Cursor getSettings() {
        SQLiteDatabase db = this.getReadableDatabase();
        return db.rawQuery("SELECT * FROM settings WHERE id = 1", null);
    }

    // =================== RUNTIME ==========================
    public boolean saveRuntime(String key, String value) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("key", key);
        cv.put("value", value);
        long result = db.insertWithOnConflict("runtime", null, cv, SQLiteDatabase.CONFLICT_REPLACE);
        return result > 0;
    }

    public String getRuntime(String key) {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor c = db.rawQuery("SELECT value FROM runtime WHERE key=?", new String[]{key});
        String v = c.moveToFirst() ? c.getString(0) : null;
        c.close();
        return v;
    }
}
