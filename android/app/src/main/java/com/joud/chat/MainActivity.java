package com.yourpackage

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // منع الـ WebView من الـ scroll والـ over-scroll
        this.bridge.webView.apply {
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            overScrollMode = OVER_SCROLL_NEVER
        }
    }
}
