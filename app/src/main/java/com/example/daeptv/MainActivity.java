package com.example.daeptv;

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

    private WebView webView;
    private JSBridge jsBridge;
    private DBHelper dbHelper;
    private DatabaseHelper dbMeta;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        dbHelper = new DBHelper(this);
        dbMeta = new DatabaseHelper(this);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d("WebViewConsole", consoleMessage.message() + " -- line " + consoleMessage.lineNumber());
                return true;
            }
        });

        jsBridge = new JSBridge(this, dbHelper, dbMeta);
        webView.addJavascriptInterface(jsBridge, "AndroidBridge");

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    // ===== JSBridge =====
    public static class JSBridge {
        Context ctx;
        DBHelper db;
        DatabaseHelper dbMeta;

        JSBridge(Context c, DBHelper dbHelper, DatabaseHelper databaseHelper) {
            ctx = c;
            db = dbHelper;
            dbMeta = databaseHelper;
        }

        // Base64 fallback
        @JavascriptInterface
        public String getVideoBase64() { return db.getLatestMediaBase64("video"); }

        @JavascriptInterface
        public String getAudioBase64() { return db.getLatestMediaBase64("audio"); }

        @JavascriptInterface
        public void saveVideoBase64(String base64) { db.saveMedia("video", base64); }

        @JavascriptInterface
        public void saveAudioBase64(String base64) { db.saveMedia("audio", base64); }

        @JavascriptInterface
        public void saveHeroBase64(String base64) { db.saveMedia("hero", base64); }

        // Metadata
        @JavascriptInterface
        public void addMedia(String type, String path, String name) { dbMeta.addMedia(type, path, name); }

        @JavascriptInterface
        public String getAllMediaJson() { return dbMeta.getAllMediaAsJson(); }
    }
}
