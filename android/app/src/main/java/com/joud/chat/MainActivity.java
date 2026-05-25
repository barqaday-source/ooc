package com.drdshati.app; 

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import com.tchvu3.capacitorvoicerecorder.VoiceRecorder;
import android.view.View; // أضف هذا السطر

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            registerPlugin(GoogleAuth.class);
            registerPlugin(VoiceRecorder.class);
        } catch (Exception e) {}

        // --- هذا هو الحل للمشكلة ---
        // نقوم بتعديل نافذة التطبيق لتسمح بظهور أزرار النظام
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE | 
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );
        // ---------------------------
        
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setVerticalScrollBarEnabled(false);
            this.bridge.getWebView().setHorizontalScrollBarEnabled(false);
            this.bridge.getWebView().setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
        }
    }
}
