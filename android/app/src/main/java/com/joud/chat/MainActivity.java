package com.yourpackage;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // منع الـ WebView من الـ scroll والـ over-scroll
        this.bridge.getWebView().setVerticalScrollBarEnabled(false);
        this.bridge.getWebView().setHorizontalScrollBarEnabled(false);
        this.bridge.getWebView().setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
    }
}
