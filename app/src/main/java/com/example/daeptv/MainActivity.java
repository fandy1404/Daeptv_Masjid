package com.example.daeptv;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {

    private static final int FILE_CHOOSER_REQUEST_CODE = 2025;

    WebView webView;
    DBHelper dbHelper;

    // Untuk choose-file WebView
    private ValueCallback<Uri[]> filePathCallback;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestPermissionsIfNeeded();

        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        dbHelper = new DBHelper(this);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);

        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Untuk Android < 9, biar WebSQL/IndexedDB aktif
        s.setDatabasePath(getApplicationContext().getDir("databases", Context.MODE_PRIVATE).getPath());

        // Mencegah WebView membuka browser eksternal
        webView.setWebViewClient(new WebViewClient());

        // FULL FIX — Choose File Handler
        webView.setWebChromeClient(new WebChromeClient() {

            @Override
            public boolean onConsoleMessage(ConsoleMessage msg) {
                Log.d("WebViewConsole", msg.message());
                return true;
            }

            // ⚡ BAGIAN TERPENTING untuk <input type="file">
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        // Bridge untuk SQLite JSON dan Media
        webView.addJavascriptInterface(new JSBridge(), "AndroidBridge");

        // Load index Anda
        webView.loadUrl("file:///android_asset/index.html");
    }

    // 🍀 PERIZINAN WAJIB untuk kamera + akses file
    private void requestPermissionsIfNeeded() {
        String[] perms = {
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE,
                Manifest.permission.CAMERA
        };

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean needRequest = false;
            for (String p : perms) {
                if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                    needRequest = true;
                }
            }
            if (needRequest) {
                ActivityCompat.requestPermissions(this, perms, 1);
            }
        }
    }

    // 🔥 Hasil pilihan file WebView
    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback != null) {

                Uri[] result = null;

                if (resultCode == Activity.RESULT_OK) {
                    if (data != null) {
                        Uri uri = data.getData();
                        if (uri != null) {
                            result = new Uri[]{ uri };
                        }
                    }
                }

                filePathCallback.onReceiveValue(result);
                filePathCallback = null;
            }
        }
    }

    // ==========================================================
    // 🔗 JavaScript Bridge — milik Anda
    // ==========================================================
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
