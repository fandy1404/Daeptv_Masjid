package com.example.daeptv;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONArray;
import org.json.JSONObject;

public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "media_metadata.db";
    private static final int DATABASE_VERSION = 1;
    private static final String TABLE_MEDIA = "media";
    private static final String COLUMN_ID = "id";
    private static final String COLUMN_TYPE = "type";
    private static final String COLUMN_PATH = "path";
    private static final String COLUMN_NAME = "name";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE " + TABLE_MEDIA + " (" +
                COLUMN_ID + " INTEGER PRIMARY KEY AUTOINCREMENT," +
                COLUMN_TYPE + " TEXT," +
                COLUMN_PATH + " TEXT," +
                COLUMN_NAME + " TEXT)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_MEDIA);
        onCreate(db);
    }

    public void addMedia(String type, String path, String name) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put(COLUMN_TYPE, type);
        cv.put(COLUMN_PATH, path);
        cv.put(COLUMN_NAME, name);
        db.insert(TABLE_MEDIA, null, cv);
        db.close();
    }

    public String getAllMediaAsJson() {
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT * FROM " + TABLE_MEDIA, null);
        JSONArray arr = new JSONArray();
        if (cursor.moveToFirst()) {
            do {
                try {
                    JSONObject obj = new JSONObject();
                    obj.put("id", cursor.getInt(cursor.getColumnIndex(COLUMN_ID)));
                    obj.put("type", cursor.getString(cursor.getColumnIndex(COLUMN_TYPE)));
                    obj.put("path", cursor.getString(cursor.getColumnIndex(COLUMN_PATH)));
                    obj.put("name", cursor.getString(cursor.getColumnIndex(COLUMN_NAME)));
                    arr.put(obj);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            } while (cursor.moveToNext());
        }
        cursor.close();
        db.close();
        return arr.toString();
    }
}
