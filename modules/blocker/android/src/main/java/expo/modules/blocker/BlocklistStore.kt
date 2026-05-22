package expo.modules.blocker

import android.content.Context

object BlocklistStore {
  private const val PREFS = "bricks_blocker"
  private const val KEY_LIST = "blocklist"
  private const val KEY_MODE_NAME = "mode_name"
  private const val KEY_MODE_EMOJI = "mode_emoji"
  private const val KEY_LOCKED_AT = "locked_at"

  data class State(
    val blocked: Set<String>,
    val modeName: String,
    val modeEmoji: String,
    val lockedAt: Long,
  )

  fun read(ctx: Context): State {
    val p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return State(
      blocked = p.getStringSet(KEY_LIST, emptySet()) ?: emptySet(),
      modeName = p.getString(KEY_MODE_NAME, "") ?: "",
      modeEmoji = p.getString(KEY_MODE_EMOJI, "🧱") ?: "🧱",
      lockedAt = p.getLong(KEY_LOCKED_AT, 0L),
    )
  }

  fun write(ctx: Context, blocked: Set<String>, modeName: String, modeEmoji: String, lockedAt: Long) {
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putStringSet(KEY_LIST, blocked)
      .putString(KEY_MODE_NAME, modeName)
      .putString(KEY_MODE_EMOJI, modeEmoji)
      .putLong(KEY_LOCKED_AT, lockedAt)
      .apply()
  }

  fun clear(ctx: Context) {
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
  }
}
