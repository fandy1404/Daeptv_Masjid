package com.example.daeptv;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Bundle;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;
import android.view.WindowManager;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private JSBridge jsBridge;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Force hardware acceleration for media
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(false); // allow autoplay
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Prevent console errors from crashing flow (catch noisy messages)
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                // swallow console messages to avoid unexpected behavior
                return true;
            }
        });

        jsBridge = new JSBridge(this);
        webView.addJavascriptInterface(jsBridge, "AndroidBridge");

        // Load local index (ensure index.html is at app/src/main/assets/index.html)
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    // Minimal JS bridge to expose Base64 video/audio from SQLite
    public static class JSBridge {
        Context ctx;
        JSBridge(Context c){ ctx = c; }

        @JavascriptInterface
        public String getVideoBase64() {
            try {
                DBHelper db = new DBHelper(ctx);
                return db.getLatestMediaBase64("video");
            } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public String getAudioBase64() {
            try {
                DBHelper db = new DBHelper(ctx);
                return db.getLatestMediaBase64("audio");
            } catch (Exception e) { return ""; }
        }
    }
}
