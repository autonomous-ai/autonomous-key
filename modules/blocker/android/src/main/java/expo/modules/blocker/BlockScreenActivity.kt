package expo.modules.blocker

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class BlockScreenActivity : Activity() {
  companion object {
    const val EXTRA_PACKAGE = "blocked_package"
    const val EXTRA_MODE_NAME = "mode_name"
    const val EXTRA_MODE_EMOJI = "mode_emoji"
    const val EXTRA_LOCKED_AT = "locked_at"
  }

  private var lockedAt: Long = 0L
  private val handler = Handler(Looper.getMainLooper())
  private var timerView: TextView? = null

  private val tick: Runnable = object : Runnable {
    override fun run() {
      timerView?.text = formatElapsed(System.currentTimeMillis() - lockedAt)
      handler.postDelayed(this, 1000)
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val modeName = intent.getStringExtra(EXTRA_MODE_NAME) ?: ""
    val modeEmoji = intent.getStringExtra(EXTRA_MODE_EMOJI) ?: "🧱"
    lockedAt = intent.getLongExtra(EXTRA_LOCKED_AT, System.currentTimeMillis())

    val dp = resources.displayMetrics.density
    fun px(v: Int) = (v * dp).toInt()

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.BLACK)
      setPadding(px(32), px(32), px(32), px(32))
    }

    val brick = TextView(this).apply {
      text = modeEmoji
      textSize = 96f
      gravity = Gravity.CENTER
    }

    val title = TextView(this).apply {
      text = "This app is blocked"
      textSize = 28f
      setTextColor(Color.WHITE)
      setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER
      setPadding(0, px(20), 0, px(8))
    }

    val mode = TextView(this).apply {
      text = if (modeName.isNotEmpty()) modeName else "Locked"
      textSize = 17f
      setTextColor(Color.parseColor("#FF6B3D"))
      setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER
    }

    timerView = TextView(this).apply {
      text = formatElapsed(System.currentTimeMillis() - lockedAt)
      textSize = 14f
      setTextColor(Color.parseColor("#9A9AA8"))
      gravity = Gravity.CENTER
      setPadding(0, px(4), 0, px(20))
    }

    val hint = TextView(this).apply {
      text = "Scan your Bricks cube to unlock."
      textSize = 15f
      setTextColor(Color.parseColor("#9A9AA8"))
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, px(28))
    }

    val openBricks = Button(this).apply {
      text = "Open Bricks"
      setOnClickListener {
        val launch = packageManager.getLaunchIntentForPackage(this@BlockScreenActivity.packageName)
        if (launch != null) {
          launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
          startActivity(launch)
        }
        finish()
      }
    }

    val goHome = Button(this).apply {
      text = "Go home"
      setOnClickListener { finishAndGoHome() }
    }

    root.addView(brick, lp())
    root.addView(title, lp())
    root.addView(mode, lp())
    root.addView(timerView, lp())
    root.addView(hint, lp())
    root.addView(openBricks, btnLp(px(220), px(48)))
    root.addView(View(this).apply { layoutParams = ViewGroup.LayoutParams(0, px(12)) })
    root.addView(goHome, btnLp(px(220), px(48)))

    setContentView(root)
  }

  override fun onResume() {
    super.onResume()
    handler.post(tick)
  }

  override fun onPause() {
    super.onPause()
    handler.removeCallbacks(tick)
  }

  override fun onBackPressed() {
    finishAndGoHome()
  }

  private fun finishAndGoHome() {
    val home = Intent(Intent.ACTION_MAIN).apply {
      addCategory(Intent.CATEGORY_HOME)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }
    startActivity(home)
    finish()
  }

  private fun lp() = LinearLayout.LayoutParams(
    ViewGroup.LayoutParams.WRAP_CONTENT,
    ViewGroup.LayoutParams.WRAP_CONTENT
  )

  private fun btnLp(w: Int, h: Int) = LinearLayout.LayoutParams(w, h)

  private fun formatElapsed(ms: Long): String {
    if (ms <= 0) return "Just locked"
    val totalSec = ms / 1000
    val s = totalSec % 60
    val m = (totalSec / 60) % 60
    val h = totalSec / 3600
    return when {
      h > 0 -> "Locked for ${h}h ${m}m"
      m > 0 -> "Locked for ${m}m ${s}s"
      else -> "Locked for ${s}s"
    }
  }
}
