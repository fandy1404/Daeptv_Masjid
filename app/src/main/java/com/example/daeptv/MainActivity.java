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

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main); // pakai FrameLayout XML

        webView = findViewById(R.id.webview);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);      // IndexedDB / LocalStorage
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // WebChromeClient untuk console log JS
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d("WebViewConsole", consoleMessage.message() +
                        " -- From line: " + consoleMessage.lineNumber());
                return true;
            }
        });

        // JS Bridge
        jsBridge = new JSBridge(this);
        webView.addJavascriptInterface(jsBridge, "AndroidBridge");

        // Load local index.html
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

        JSBridge(Context c) {
            ctx = c;
        }

        @JavascriptInterface
        public String getVideoBase64() {
            try {
                DBHelper db = new DBHelper(ctx);
                return db.getLatestMediaBase64("video");
            } catch (Exception e) {
                Log.e("JSBridge", "Error getVideoBase64", e);
                return "";
            }
        }

        @JavascriptInterface
        public String getAudioBase64() {
            try {
                DBHelper db = new DBHelper(ctx);
                return db.getLatestMediaBase64("audio");
            } catch (Exception e) {
                Log.e("JSBridge", "Error getAudioBase64", e);
                return "";
            }
        }
    }
}
