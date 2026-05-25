package com.yourpackage; // تأكد من مطابقة اسم الحزمة الموجود في build.gradle

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
// استيراد الإضافات التي تستخدمها
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import com.tchvu3.capacitorvoicerecorder.VoiceRecorder;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // تسجيل الإضافات (هذا السطر هو الذي سيمنع الإغلاق المفاجئ)
        registerPlugin(GoogleAuth.class);
        registerPlugin(VoiceRecorder.class);
        
        // إعدادات الـ WebView الخاصة بك
        this.bridge.getWebView().setVerticalScrollBarEnabled(false);
        this.bridge.getWebView().setHorizontalScrollBarEnabled(false);
        this.bridge.getWebView().setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
    }
}
