package expo.modules.blocker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat

object BlockerNotification {
  private const val CHANNEL_ID = "bricks_blocker_active"
  private const val CHANNEL_NAME = "Active lock"
  private const val NOTIFICATION_ID = 7301

  private fun ensureChannel(ctx: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      CHANNEL_NAME,
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Shows while a Mode is active so you can see what's blocked at a glance."
      setShowBadge(false)
      lockscreenVisibility = androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC
    }
    nm.createNotificationChannel(channel)
  }

  fun show(ctx: Context, modeName: String, modeEmoji: String, lockedAt: Long, blockedCount: Int) {
    ensureChannel(ctx)

    val launchIntent = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val pi = launchIntent?.let {
      PendingIntent.getActivity(
        ctx, 0, it,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
    }

    val countText = "$blockedCount " + if (blockedCount == 1) "app" else "apps"
    val title = "$modeEmoji  $modeName"

    val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_lock)
      .setContentTitle(title)
      .setContentText("$countText blocked. Scan cube to unlock.")
      .setOngoing(true)
      .setShowWhen(true)
      .setWhen(lockedAt)
      .setUsesChronometer(true)
      .setOnlyAlertOnce(true)
      .setColor(Color.parseColor("#FF6B3D"))
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(pi)
      .build()

    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.notify(NOTIFICATION_ID, notification)
  }

  fun cancel(ctx: Context) {
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.cancel(NOTIFICATION_ID)
  }
}
