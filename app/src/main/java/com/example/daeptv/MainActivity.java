// import statements
import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private DBHelper dbHelper;

    @SuppressLint({"SetJavaScriptEnabled"})
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
        s.setMediaPlaybackRequiresUserGesture(false);

        // agar console.log terlihat di Logcat
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage msg) {
                Log.d("WebViewConsole", msg.message() + " -- From line: " + msg.lineNumber());
                return true;
            }
        });

        // hubungkan bridge database
        webView.addJavascriptInterface(new JSBridge(this, dbHelper), "AndroidBridge");

        webView.loadUrl("file:///android_asset/index.html");
    }

    // =====================
    //  JS BRIDGE
    // =====================
    public static class JSBridge {
        Context ctx;
        DBHelper helper;

        public JSBridge(Context c, DBHelper dbHelper) {
            ctx = c;
            helper = dbHelper;
        }

        private void toast(String msg) {
            Toast.makeText(ctx, msg, Toast.LENGTH_SHORT).show();
        }

        /* ======= JSON Handling Settings ======= */
        @JavascriptInterface
        public void saveSettingsJSON(String json) {
            try {
                helper.saveSettingsJson(helper.getWritableDatabase(), json);
                toast("SUKSES: Settings tersimpan");
                Log.i("JSBridge", "saveSettingsJSON OK");
                callbackJS("saveSettingsJSON", true, "");
            } catch (Exception e) {
                toast("ERROR: Gagal menyimpan settings");
                Log.e("JSBridge", "saveSettingsJSON ERROR", e);
                callbackJS("saveSettingsJSON", false, e.getMessage());
            }
        }

        @JavascriptInterface
        public String loadSettingsJSON() {
            try {
                String r = helper.loadSettingsJson(helper.getReadableDatabase());
                Log.i("JSBridge", "loadSettingsJSON OK");
                return r;
            } catch (Exception e) {
                Log.e("JSBridge", "loadSettingsJSON ERROR", e);
                return "";
            }
        }

        /* ======= Media Base64 Save ======= */
        private void saveMediaInternal(String type, String b64) {
            try {
                helper.saveMedia(helper.getWritableDatabase(), type, b64);
                toast("Media " + type + " berhasil disimpan");
                Log.i("JSBridge", "saveMedia(" + type + ") OK");
                callbackJS("saveMedia_" + type, true, "");
            } catch (Exception e) {
                toast("Media " + type + " GAGAL");
                Log.e("JSBridge", "saveMedia(" + type + ") ERROR", e);
                callbackJS("saveMedia_" + type, false, e.getMessage());
            }
        }

        @JavascriptInterface public void saveHeroBase64(String b64) { saveMediaInternal("hero", b64); }
        @JavascriptInterface public void saveAudioBase64(String b64) { saveMediaInternal("audio", b64); }
        @JavascriptInterface public void saveVideoQuranBase64(String b64) { saveMediaInternal("video_quran", b64); }

        /* ======= Media load ======= */
        @JavascriptInterface
        public String getLatestMedia(String type) {
            try {
                return helper.getLatestMedia(helper.getReadableDatabase(), type);
            } catch (Exception e) {
                Log.e("JSBridge", "getLatestMedia ERROR", e);
                return "";
            }
        }

        @JavascriptInterface
        public String getAllMediaMetaJson() {
            try {
                return helper.getAllMediaMetaJson(helper.getReadableDatabase());
            } catch (Exception e) {
                Log.e("JSBridge", "getAllMediaMetaJson ERROR", e);
                return "[]";
            }
        }

        /* ======= Kirim callback ke JavaScript ======= */
        private void callbackJS(String event, boolean ok, String errorMsg) {
            String js = "window.onAndroidCallback && window.onAndroidCallback("
                    + "'" + event + "', " + ok + ", '" + errorMsg + "' );";

            if (ctx instanceof MainActivity) {
                ((MainActivity) ctx).runOnUiThread(() ->
                        ((MainActivity) ctx).webView.evaluateJavascript(js, null)
                );
            }
        }
    }
}
