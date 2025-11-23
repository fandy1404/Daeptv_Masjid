package com.example.daeptv;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import org.json.JSONArray;
import org.json.JSONObject;

public class DatabaseHelper extends SQLiteOpenHelper {
    private static final String DATABASE_NAME = "media.db";
    private static final int DATABASE_VERSION = 1;
    private static final String TABLE_MEDIA = "media";
    private static final String COLUMN_ID = "id";
    private static final String COLUMN_TYPE = "type"; // "audio" atau "video"
    private static final String COLUMN_PATH = "path"; // Path file, misalnya "audio1.mp3"
    private static final String COLUMN_NAME = "name"; // Nama file

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        String createTable = "CREATE TABLE " + TABLE_MEDIA + " (" +
                COLUMN_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                COLUMN_TYPE + " TEXT, " +
                COLUMN_PATH + " TEXT, " +
                COLUMN_NAME + " TEXT)";
        db.execSQL(createTable);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_MEDIA);
        onCreate(db);
    }

    // Method untuk menyimpan media baru (dipanggil dari form admin)
    public void addMedia(String type, String path, String name) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COLUMN_TYPE, type);
        values.put(COLUMN_PATH, path);
        values.put(COLUMN_NAME, name);
        db.insert(TABLE_MEDIA, null, values);
        db.close();
    }

    // Method untuk mengambil semua media sebagai JSON (untuk dikirim ke WebView)
    public String getAllMediaAsJson() {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT * FROM " + TABLE_MEDIA, null);
        JSONArray jsonArray = new JSONArray();
        if (cursor.moveToFirst()) {
            do {
                JSONObject obj = new JSONObject();
                try {
                    obj.put("id", cursor.getInt(cursor.getColumnIndex(COLUMN_ID)));
                    obj.put("type", cursor.getString(cursor.getColumnIndex(COLUMN_TYPE)));
                    obj.put("path", cursor.getString(cursor.getColumnIndex(COLUMN_PATH)));
                    obj.put("name", cursor.getString(cursor.getColumnIndex(COLUMN_NAME)));
                    jsonArray.put(obj);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            } while (cursor.moveToNext());
        }
        cursor.close();
        db.close();
        return jsonArray.toString();
    }
}
