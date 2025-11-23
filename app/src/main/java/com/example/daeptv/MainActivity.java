package com.example.daeptv;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.JavascriptInterface;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private DatabaseHelper dbHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        dbHelper = new DatabaseHelper(this);  // Inisialisasi DB untuk akses data media

        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);  // Aktifkan JS untuk WASM dan interaksi
        ws.setDomStorageEnabled(true);  // Untuk penyimpanan lokal
        ws.setAllowFileAccess(true);    // Izinkan akses file di assets
        ws.setAllowContentAccess(true);
        ws.setMediaPlaybackRequiresUserGesture(false);  // Coba izinkan autoplay media

        // WebViewClient: Tangani error pemuatan tanpa crash
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                // Jika error (misalnya, file tidak ada), tampilkan pesan alih-alih crash
                view.loadData("<html><body><h1>Aplikasi Siap</h1><p>Data media belum ada. Gunakan form admin untuk menambah.</p></body></html>", "text/html", "UTF-8");
            }
        });

        // WebChromeClient: Tangani media (video/audio) tanpa crash
        webView.setWebChromeClient(new WebChromeClient());

        // JavaScript Interface: Izinkan HTML/WASM akses DB
        webView.addJavascriptInterface(new WebAppInterface(), "Android");

        webView.loadUrl("file:///android_asset/index.html");
    }

    // Class untuk interface JS
    public class WebAppInterface {
        @JavascriptInterface
        public String getMediaData() {
            return dbHelper.getAllMediaAsJson();  // Ambil data media sebagai JSON
        }
    }

    // Tangani tombol back
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
