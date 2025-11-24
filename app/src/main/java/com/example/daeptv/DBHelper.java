package com.example.daeptv;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

public class DBHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "daeptv_media.db";
    private static final int DATABASE_VERSION = 1;

    public DBHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS media (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "type TEXT," +      // video / audio / hero
                "base64 TEXT," +
                "created_at INTEGER DEFAULT (strftime('%s','now')))");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS media");
        onCreate(db);
    }

    public void saveMedia(String type, String base64) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("type", type);
        cv.put("base64", base64);
        db.insert("media", null, cv);
        db.close();
    }

    public String getLatestMediaBase64(String type) {
        String result = "";
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = null;
        try {
            c = db.rawQuery("SELECT base64 FROM media WHERE type=? ORDER BY id DESC LIMIT 1",
                    new String[]{type});
            if (c.moveToFirst()) result = c.getString(0);
        } catch (Exception e) {
            Log.e("DBHelper", "getLatestMediaBase64 error", e);
        } finally {
            if (c != null) c.close();
            db.close();
        }
        return result != null ? result : "";
    }
}
