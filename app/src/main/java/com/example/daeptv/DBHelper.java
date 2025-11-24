package com.example.app;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class DBHelper extends SQLiteOpenHelper {
    private static final String DB_NAME = "appdata.db";
    private static final int DB_VERSION = 1;

    public DBHelper(Context context) {
        super(context, DB_NAME, null, DB_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS settings_json(id INTEGER PRIMARY KEY AUTOINCREMENT, json TEXT)");
        db.execSQL("CREATE TABLE IF NOT EXISTS media(id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, data TEXT)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS settings_json");
        db.execSQL("DROP TABLE IF EXISTS media");
        onCreate(db);
    }

    public void saveSettingsJson(SQLiteDatabase db, String json) {
        ContentValues cv = new ContentValues();
        cv.put("json", json);
        db.insert("settings_json", null, cv);
    }

    public String loadSettingsJson(SQLiteDatabase db) {
        Cursor c = db.rawQuery("SELECT json FROM settings_json ORDER BY id DESC LIMIT 1", null);
        if (c.moveToFirst()) {
            String result = c.getString(0);
            c.close();
            return result;
        }
        c.close();
        return "";
    }

    public void saveMedia(SQLiteDatabase db, String type, String data) {
        ContentValues cv = new ContentValues();
        cv.put("type", type);
        cv.put("data", data);
        db.insert("media", null, cv);
    }

    public String getLatestMedia(SQLiteDatabase db, String type) {
        Cursor c = db.rawQuery("SELECT data FROM media WHERE type = ? ORDER BY id DESC LIMIT 1", new String[]{type});
        if (c.moveToFirst()) {
            String result = c.getString(0);
            c.close();
            return result;
        }
        c.close();
        return "";
    }
}
