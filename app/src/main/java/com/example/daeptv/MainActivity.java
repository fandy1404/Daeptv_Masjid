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
    private DatabaseHelper databaseHelper;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        dbHelper = new DBHelper(this);           // fallback base64
        databaseHelper = new DatabaseHelper(this); // metadata / path

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
                Log.d("WebViewConsole", consoleMessage.message() +
                        " -- Line: " + consoleMessage.lineNumber());
                return true;
            }
        });

        jsBridge = new JSBridge(this, dbHelper, databaseHelper);
        webView.addJavascriptInterface(jsBridge, "AndroidBridge");

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    // JS Bridge class
    public static class JSBridge {
        Context ctx;
        DBHelper db;
        DatabaseHelper dbMeta;

        JSBridge(Context c, DBHelper dbHelper, DatabaseHelper databaseHelper) {
            ctx = c;
            db = dbHelper;
            dbMeta = databaseHelper;
        }

        // ===== Base64 fallback =====
        @JavascriptInterface
        public String getVideoBase64() {
            try {
                return db.getLatestMediaBase64("video");
            } catch (Exception e) {
                Log.e("JSBridge", "Error getVideoBase64", e);
                return "";
            }
        }

        @JavascriptInterface
        public String getAudioBase64() {
            try {
                return db.getLatestMediaBase64("audio");
            } catch (Exception e) {
                Log.e("JSBridge", "Error getAudioBase64", e);
                return "";
            }
        }

        @JavascriptInterface
        public void saveVideoBase64(String base64) {
            try {
                db.saveMedia("video", base64);
            } catch (Exception e) {
                Log.e("JSBridge", "Error saveVideoBase64", e);
            }
        }

        @JavascriptInterface
        public void saveAudioBase64(String base64) {
            try {
                db.saveMedia("audio", base64);
            } catch (Exception e) {
                Log.e("JSBridge", "Error saveAudioBase64", e);
            }
        }

        // ===== Metadata / file path =====
        @JavascriptInterface
        public void addMedia(String type, String path, String name) {
            try {
                dbMeta.addMedia(type, path, name);
            } catch (Exception e) {
                Log.e("JSBridge", "Error addMedia", e);
            }
        }

        @JavascriptInterface
        public String getAllMediaJson() {
            try {
                return dbMeta.getAllMediaAsJson();
            } catch (Exception e) {
                Log.e("JSBridge", "Error getAllMediaJson", e);
                return "[]";
            }
        }
    }
}
