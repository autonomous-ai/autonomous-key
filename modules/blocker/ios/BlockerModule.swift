import ExpoModulesCore
import FamilyControls
import ManagedSettings
import UIKit

/// iOS counterpart to the Android BlockerModule.
///
/// Cross-module data flow:
///   InstalledApps.presentPicker() shows FamilyActivityPicker, persists the
///   resulting FamilyActivitySelection into UserDefaults keyed by a token
///   string. BlockerModule.applyShield() reads that key back and writes the
///   tokens into ManagedSettingsStore.shield so iOS blocks those apps.
public class BlockerModule: Module {

  private static let store = ManagedSettingsStore(named: .init("bricks.shield"))
  private static let metaModeName = "bricks.shield.modeName"
  private static let metaModeEmoji = "bricks.shield.modeEmoji"
  private static let metaLockedAt = "bricks.shield.lockedAt"

  public func definition() -> ModuleDefinition {
    Name("Blocker")

    AsyncFunction("applyShield") { (opts: [String: Any]) throws in
      guard let token = opts["iosSelectionToken"] as? String, !token.isEmpty else {
        throw Exception(
          name: "NoSelectionToken",
          description: "applyShield requires iosSelectionToken — pick apps first."
        )
      }
      guard let data = UserDefaults.standard.data(forKey: "bricks.selection.\(token)") else {
        throw Exception(
          name: "SelectionMissing",
          description: "No saved selection for that token. Pick apps again in the Mode editor."
        )
      }
      let selection = try JSONDecoder().decode(FamilyActivitySelection.self, from: data)

      Self.store.shield.applications = selection.applicationTokens.isEmpty
        ? nil : selection.applicationTokens
      Self.store.shield.applicationCategories = selection.categoryTokens.isEmpty
        ? nil : .specific(selection.categoryTokens)
      Self.store.shield.webDomains = selection.webDomainTokens.isEmpty
        ? nil : selection.webDomainTokens

      if let name = opts["modeName"] as? String {
        UserDefaults.standard.set(name, forKey: Self.metaModeName)
      }
      if let emoji = opts["modeEmoji"] as? String {
        UserDefaults.standard.set(emoji, forKey: Self.metaModeEmoji)
      }
      if let lockedAt = opts["lockedAt"] as? Double {
        UserDefaults.standard.set(lockedAt, forKey: Self.metaLockedAt)
      }
    }

    AsyncFunction("clearShield") {
      Self.store.shield.applications = nil
      Self.store.shield.applicationCategories = nil
      Self.store.shield.webDomains = nil
      UserDefaults.standard.removeObject(forKey: Self.metaModeName)
      UserDefaults.standard.removeObject(forKey: Self.metaModeEmoji)
      UserDefaults.standard.removeObject(forKey: Self.metaLockedAt)
    }

    AsyncFunction("isAuthorized") { () -> Bool in
      AuthorizationCenter.shared.authorizationStatus == .approved
    }

    AsyncFunction("requestAuthorization") {
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
    }

    /// Opens the app's page in iOS Settings — used if the FamilyControls
    /// authorization was previously denied and the user needs to flip it
    /// back on under Settings → Screen Time → ours.
    AsyncFunction("openAppInfo") {
      await MainActor.run {
        if let url = URL(string: UIApplication.openSettingsURLString) {
          UIApplication.shared.open(url)
        }
      }
    }

    /// iOS has no separate "Apps list" page equivalent to Android's
    /// Settings → Apps; just open this app's Settings entry so the user
    /// can navigate from there.
    AsyncFunction("openAppsList") {
      await MainActor.run {
        if let url = URL(string: UIApplication.openSettingsURLString) {
          UIApplication.shared.open(url)
        }
      }
    }

    AsyncFunction("getCurrentBlocklist") { () -> [String] in
      // iOS hides app identities behind opaque tokens. Return count as
      // placeholder strings so the JS side can still show "N apps blocked".
      let count = Self.store.shield.applications?.count ?? 0
      return Array(repeating: "ios-token", count: count)
    }
  }
}
