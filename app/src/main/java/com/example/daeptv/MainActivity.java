package com.example.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    WebView webView;
    DBHelper dbHelper;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        dbHelper = new DBHelper(this);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

s.setDatabasePath(getApplicationContext().getDir("databases", Context.MODE_PRIVATE).getPath());
// ⬆ kode ini penting untuk Android < 9 (untuk menyimpan data WebSQL/IndexedDB)
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage msg) {
                Log.d("WebViewConsole", msg.message());
                return true;
            }
        });

        webView.addJavascriptInterface(new JSBridge(), "AndroidBridge");
        webView.loadUrl("file:///android_asset/index.html");
    }

    public class JSBridge {

        @JavascriptInterface
        public void saveSettingsJSON(String json) {
            try {
                dbHelper.saveSettingsJson(dbHelper.getWritableDatabase(), json);
                Log.d("JSBridge", "saveSettingsJSON OK");
            } catch (Exception e) {
                Log.e("JSBridge", "saveSettingsJSON ERROR", e);
            }
        }

        @JavascriptInterface
        public String loadSettingsJSON() {
            try {
                return dbHelper.loadSettingsJson(dbHelper.getReadableDatabase());
            } catch (Exception e) {
                Log.e("JSBridge", "loadSettingsJSON ERROR", e);
                return "";
            }
        }

        @JavascriptInterface
        public void saveMedia(String type, String base64) {
            try {
                dbHelper.saveMedia(dbHelper.getWritableDatabase(), type, base64);
                Log.d("JSBridge", "saveMedia OK: " + type);
            } catch (Exception e) {
                Log.e("JSBridge", "saveMedia ERROR", e);
            }
        }

        @JavascriptInterface
        public String getLatestMedia(String type) {
            try {
                return dbHelper.getLatestMedia(dbHelper.getReadableDatabase(), type);
            } catch (Exception e) {
                Log.e("JSBridge", "getLatestMedia ERROR", e);
                return "";
            }
        }
    }
}
