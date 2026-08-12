package com.nasktv.tvapp

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  private fun configureMediaPlayback(view: View): Boolean {
    if (view is WebView) {
      view.settings.mediaPlaybackRequiresUserGesture = false
      view.settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
      return true
    }

    var configured = false
    if (view is ViewGroup) {
      for (index in 0 until view.childCount) {
        configured = configureMediaPlayback(view.getChildAt(index)) || configured
      }
    }
    return configured
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    val root = window.decorView
    if (!configureMediaPlayback(root)) {
      root.viewTreeObserver.addOnGlobalLayoutListener(
        object : ViewTreeObserver.OnGlobalLayoutListener {
          override fun onGlobalLayout() {
            if (configureMediaPlayback(root)) {
              root.viewTreeObserver.removeOnGlobalLayoutListener(this)
            }
          }
        },
      )
    }
  }
}
