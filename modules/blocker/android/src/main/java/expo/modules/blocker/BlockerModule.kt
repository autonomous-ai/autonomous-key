package expo.modules.blocker

import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BlockerModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("Blocker")

    AsyncFunction("applyShield") { opts: Map<String, Any?> ->
      val ctx = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      @Suppress("UNCHECKED_CAST")
      val ids = (opts["appIds"] as? List<String>) ?: emptyList()
      val name = (opts["modeName"] as? String) ?: ""
      val emoji = (opts["modeEmoji"] as? String) ?: "🧱"
      val lockedAt = when (val v = opts["lockedAt"]) {
        is Number -> v.toLong()
        else -> System.currentTimeMillis()
      }
      BlocklistStore.write(ctx, ids.toSet(), name, emoji, lockedAt)
      BlockerNotification.show(ctx, name, emoji, lockedAt, ids.size)
    }

    AsyncFunction("clearShield") {
      val ctx = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      BlocklistStore.clear(ctx)
      BlockerNotification.cancel(ctx)
    }

    AsyncFunction("getCurrentBlocklist") {
      val ctx = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      BlocklistStore.read(ctx).blocked.toList()
    }

    AsyncFunction("isAuthorized") {
      val ctx = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      isAccessibilityServiceEnabled(ctx)
    }

    AsyncFunction("requestAuthorization") {
      val ctx = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      // Force Settings to rebuild its task: without CLEAR_TASK, tapping this
      // a second time can resume the same Accessibility page that the user
      // left after triggering the restricted warning — which still shows the
      // warning until Android refreshes the state, leaving the toggle stuck.
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TASK or
          Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
        )
      }
      ctx.startActivity(intent)
    }

    /** Opens this app's App Info page. Forces re-creation of the Settings
     *  activity stack so the ⋮ menu reflects the current restricted state
     *  rather than a cached snapshot from before the user triggered the
     *  Accessibility warning. */
    AsyncFunction("openAppInfo") {
      val ctx = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
        data = android.net.Uri.fromParts("package", ctx.packageName, null)
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
        )
      }
      ctx.startActivity(intent)
    }

    /** Fallback when the deep-linked App Info page still caches a stale
     *  ⋮ menu — opens the Settings → Apps list so the user navigates in
     *  manually, which always loads a fresh App Info page. */
    AsyncFunction("openAppsList") {
      val ctx = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val intent = Intent(Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS).apply {
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TASK or
          Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
        )
      }
      ctx.startActivity(intent)
    }
  }

  private fun isAccessibilityServiceEnabled(context: Context): Boolean {
    val expected = "${context.packageName}/expo.modules.blocker.BlockerAccessibilityService"
    val enabled = Settings.Secure.getString(
      context.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false
    val splitter = TextUtils.SimpleStringSplitter(':')
    splitter.setString(enabled)
    while (splitter.hasNext()) {
      if (splitter.next().equals(expected, ignoreCase = true)) return true
    }
    return false
  }
}
