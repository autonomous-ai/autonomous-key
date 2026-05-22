package expo.modules.blocker

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent

class BlockerAccessibilityService : AccessibilityService() {

  companion object {
    private const val TAG = "BricksBlocker"
  }

  private var lastBlockedPkg: String? = null
  private var lastBlockedAt: Long = 0L

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return
    val type = event.eventType
    if (type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
      type != AccessibilityEvent.TYPE_WINDOWS_CHANGED) return

    // Prefer the truly active window over event.packageName: when the user
    // resumes a backgrounded app from the Recent Apps switcher, the event
    // packageName can be the launcher / SystemUI while the actual active
    // window is the resumed app.
    val foregroundPkg: String = (
      try { rootInActiveWindow?.packageName?.toString() } catch (e: Throwable) { null }
    ) ?: event.packageName?.toString() ?: return

    val pkg = foregroundPkg

    if (pkg == packageName) return
    if (pkg == "com.android.systemui") return
    if (pkg.startsWith("com.android.settings")) return
    // Filter common launcher packages so we don't trigger on the home screen
    // or the Recent Apps overview itself.
    if (pkg == "com.google.android.apps.nexuslauncher") return
    if (pkg == "com.android.launcher" || pkg.contains("launcher", ignoreCase = true)) return

    val state = BlocklistStore.read(this)
    if (state.blocked.isEmpty()) return
    if (pkg !in state.blocked) {
      Log.d(TAG, "ignore $pkg")
      return
    }

    val now = System.currentTimeMillis()
    if (pkg == lastBlockedPkg && now - lastBlockedAt < 1500) return
    lastBlockedPkg = pkg
    lastBlockedAt = now

    Log.d(TAG, "BLOCK $pkg (event=$type src=${event.packageName})")

    val intent = Intent(this, BlockScreenActivity::class.java).apply {
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_CLEAR_TASK or
        Intent.FLAG_ACTIVITY_NO_HISTORY or
        Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
      )
      putExtra(BlockScreenActivity.EXTRA_PACKAGE, pkg)
      putExtra(BlockScreenActivity.EXTRA_MODE_NAME, state.modeName)
      putExtra(BlockScreenActivity.EXTRA_MODE_EMOJI, state.modeEmoji)
      putExtra(BlockScreenActivity.EXTRA_LOCKED_AT, state.lockedAt)
    }
    startActivity(intent)
  }

  override fun onInterrupt() {}
}
