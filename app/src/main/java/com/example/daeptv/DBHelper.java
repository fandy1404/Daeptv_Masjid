package com.example.daeptv;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

public class DBHelper extends SQLiteOpenHelper {
    private static final String DB_NAME = "daeptv.db";
    private static final int DB_VERSION = 1;
    public DBHelper(Context ctx){ super(ctx, DB_NAME, null, DB_VERSION); }

    @Override
    public void onCreate(SQLiteDatabase db) {
        // table media: type text ('video'|'audio'), base64 text, created_at
        db.execSQL("CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, base64 TEXT, created_at INTEGER);");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldV, int newV) {}

    // returns latest base64 string for type or empty string
    public String getLatestMediaBase64(String type){
        String result = "";
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = null;
        try {
            c = db.rawQuery("SELECT base64 FROM media WHERE type=? ORDER BY id DESC LIMIT 1", new String[]{type});
            if (c != null && c.moveToFirst()){
                result = c.getString(0);
            }
        } catch (Exception e){ Log.e("DB", "getLatestMediaBase64", e); }
        finally { if (c!=null) c.close(); db.close(); }
        return result == null ? "" : result;
    }
}
