package expo.modules.installedapps

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.util.Base64
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

class InstalledAppsModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("InstalledApps")

    AsyncFunction("listInstalledApps") { options: Map<String, Any?>?  ->
      val includeSystem = (options?.get("includeSystem") as? Boolean) ?: false
      val ctx = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val pm = ctx.packageManager
      val launcherIntent = Intent(Intent.ACTION_MAIN).apply {
        addCategory(Intent.CATEGORY_LAUNCHER)
      }
      val resolved = pm.queryIntentActivities(launcherIntent, 0)

      resolved
        .asSequence()
        .map { it.activityInfo.applicationInfo }
        .distinctBy { it.packageName }
        .filter { includeSystem || (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 ||
          (it.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0 }
        .filter { it.packageName != ctx.packageName }
        .map { info ->
          val label = pm.getApplicationLabel(info).toString()
          val iconB64 = runCatching { drawableToBase64(pm.getApplicationIcon(info)) }.getOrNull()
          mapOf(
            "id" to info.packageName,
            "name" to label,
            "iconBase64" to iconB64
          )
        }
        .sortedBy { (it["name"] as String).lowercase() }
        .toList()
    }

    AsyncFunction("presentPicker") {
      throw IllegalStateException("presentPicker is iOS-only. Use listInstalledApps on Android.")
    }
  }

  private fun drawableToBase64(d: Drawable): String {
    val bmp: Bitmap = if (d is BitmapDrawable && d.bitmap != null) {
      d.bitmap
    } else {
      val w = if (d.intrinsicWidth > 0) d.intrinsicWidth else 96
      val h = if (d.intrinsicHeight > 0) d.intrinsicHeight else 96
      val b = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
      val c = Canvas(b)
      d.setBounds(0, 0, c.width, c.height)
      d.draw(c)
      b
    }
    val out = ByteArrayOutputStream()
    bmp.compress(Bitmap.CompressFormat.PNG, 90, out)
    return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
  }
}
