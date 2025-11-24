// import statements
import android.webkit.JavascriptInterface;
import android.util.Log;
import android.database.sqlite.SQLiteDatabase;
import android.database.Cursor;

...

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private DBHelper dbHelper;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webview);

        // Setup DB helper
        dbHelper = new DBHelper(this);

        // WebView settings
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

        // Console logging
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage msg) {
                Log.d("WebViewConsole", msg.message() + " -- From line: " + msg.lineNumber());
                return true;
            }
        });

        // Register bridge
        webView.addJavascriptInterface(new JSBridge(this, dbHelper), "AndroidBridge");

        webView.loadUrl("file:///android_asset/index.html");
    }

    // JSBridge inner class
    public static class JSBridge {
        Context ctx;
        DBHelper helper;

        public JSBridge(Context c, DBHelper dbHelper) {
            ctx = c;
            helper = dbHelper;
        }

        // Save whole settings JSON
        @JavascriptInterface
        public void saveSettingsJSON(String json) {
            try {
                SQLiteDatabase db = helper.getWritableDatabase();
                helper.saveSettingsJson(db, json);
                db.close();
                Log.i("JSBridge", "saveSettingsJSON OK");
            } catch (Exception e) {
                Log.e("JSBridge", "saveSettingsJSON error", e);
            }
        }

        @JavascriptInterface
        public String loadSettingsJSON() {
            try {
                SQLiteDatabase db = helper.getReadableDatabase();
                String res = helper.loadSettingsJson(db);
                db.close();
                return res;
            } catch (Exception e) {
                Log.e("JSBridge", "loadSettingsJSON error", e);
                return "";
            }
        }

        // Media save
        @JavascriptInterface
        public void saveHeroBase64(String b64) {
            try {
                SQLiteDatabase db = helper.getWritableDatabase();
                helper.saveMedia(db, "hero", b64);
                db.close();
            } catch (Exception e) {
                Log.e("JSBridge", "saveHeroBase64 error", e);
            }
        }

        @JavascriptInterface
        public void saveAudioBase64(String b64) {
            try {
                SQLiteDatabase db = helper.getWritableDatabase();
                helper.saveMedia(db, "audio", b64);
                db.close();
            } catch (Exception e) {
                Log.e("JSBridge", "saveAudioBase64 error", e);
            }
        }

        @JavascriptInterface
        public void saveVideoQuranBase64(String b64) {
            try {
                SQLiteDatabase db = helper.getWritableDatabase();
                helper.saveMedia(db, "video_quran", b64);
                db.close();
            } catch (Exception e) {
                Log.e("JSBridge", "saveVideoQuranBase64 error", e);
            }
        }

        // get latest media
        @JavascriptInterface
        public String getLatestMedia(String type) {
            try {
                SQLiteDatabase db = helper.getReadableDatabase();
                String res = helper.getLatestMedia(db, type);
                db.close();
                return res;
            } catch (Exception e) {
                Log.e("JSBridge", "getLatestMedia error", e);
                return "";
            }
        }

        @JavascriptInterface
        public String getAllMediaMetaJson() {
            try {
                SQLiteDatabase db = helper.getReadableDatabase();
                String res = helper.getAllMediaMetaJson(db);
                db.close();
                return res;
            } catch (Exception e) {
                Log.e("JSBridge", "getAllMediaMetaJson error", e);
                return "[]";
            }
        }
    } // end JSBridge
}
