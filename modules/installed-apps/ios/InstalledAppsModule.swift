import ExpoModulesCore
import FamilyControls
import SwiftUI
import UIKit

public class InstalledAppsModule: Module {
  // Keep a single store of selections so the app can apply the shield later.
  private static var lastSelection: FamilyActivitySelection?

  public func definition() -> ModuleDefinition {
    Name("InstalledApps")

    Function("isSimulator") { () -> Bool in
      #if targetEnvironment(simulator)
      return true
      #else
      return false
      #endif
    }

    AsyncFunction("listInstalledApps") { (_: [String: Any]?) -> [[String: Any]] in
      // iOS does not expose a list of installed apps for privacy reasons.
      // The user picks apps through FamilyActivityPicker. See presentPicker.
      throw Exception(
        name: "UnsupportedOnIOS",
        description: "iOS cannot enumerate installed apps. Call presentPicker() instead."
      )
    }

    View(SelectionLabelView.self) {
      Prop("token") { (view: SelectionLabelView, token: String) in
        view.setToken(token)
      }
    }

    AsyncFunction("presentPicker") { (opts: [String: Any]?) -> [String: Any] in
      // If caller passes an existing selectionToken (e.g. editing a Mode),
      // pre-load that selection so the picker opens with previous ticks.
      var initialSelection = FamilyActivitySelection()
      if let token = opts?["existingToken"] as? String,
         let data = UserDefaults.standard.data(forKey: "bricks.selection.\(token)"),
         let prev = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
        initialSelection = prev
      }

      // Request Family Controls authorization first (no-op if granted).
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)

      // Present the picker as a sheet from the current top view controller.
      let selection = try await MainActor.run { () -> FamilyActivitySelection? in
        nil
      }
      // SwiftUI presentation needs to happen on main; bridge through a hosting controller.
      let presented: FamilyActivitySelection = try await withCheckedThrowingContinuation { cont in
        DispatchQueue.main.async {
          guard let root = Self.topViewController() else {
            cont.resume(throwing: Exception(name: "NoRootVC", description: "No root view controller."))
            return
          }

          let pickerView = PickerHost(initial: initialSelection) { result in
            root.dismiss(animated: true)
            switch result {
            case .success(let sel): cont.resume(returning: sel)
            case .failure(let err): cont.resume(throwing: err)
            }
          }
          let hosting = UIHostingController(rootView: pickerView)
          hosting.modalPresentationStyle = .formSheet
          root.present(hosting, animated: true)
        }
      }

      Self.lastSelection = presented
      _ = selection // silence warning

      // We cannot serialize ApplicationTokens to JS. Use a string key so JS can
      // refer back to this selection later (e.g. when applying the shield).
      let key = "selection_\(Int(Date().timeIntervalSince1970 * 1000))"

      // In-memory store keeps the live object for the current process.
      SelectionStore.shared.store[key] = presented

      // Persist to UserDefaults so the BlockerModule (in a different Expo
      // module) can read the selection back when applying the shield, and
      // so it survives app restarts.
      do {
        let data = try JSONEncoder().encode(presented)
        UserDefaults.standard.set(data, forKey: "bricks.selection.\(key)")
      } catch {
        // Picker still works without persistence — caller can re-pick if
        // applyShield later can't find the data.
      }

      return [
        "selectionToken": key,
        "selectedCount": presented.applicationTokens.count + presented.categoryTokens.count
      ]
    }
  }

  private static func topViewController(
    base: UIViewController? = UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.keyWindow }
      .first?.rootViewController
  ) -> UIViewController? {
    if let nav = base as? UINavigationController { return topViewController(base: nav.visibleViewController) }
    if let tab = base as? UITabBarController, let sel = tab.selectedViewController {
      return topViewController(base: sel)
    }
    if let presented = base?.presentedViewController { return topViewController(base: presented) }
    return base
  }
}

/// Lightweight in-memory store for FamilyActivitySelection keyed by a token
/// string. Lets JS refer to a selection without ever seeing its contents.
final class SelectionStore {
  static let shared = SelectionStore()
  var store: [String: FamilyActivitySelection] = [:]
  private init() {}
}

private struct PickerHost: View {
  let onResult: (Result<FamilyActivitySelection, Error>) -> Void
  @State private var selection: FamilyActivitySelection

  init(initial: FamilyActivitySelection, onResult: @escaping (Result<FamilyActivitySelection, Error>) -> Void) {
    self.onResult = onResult
    self._selection = State(initialValue: initial)
  }

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Pick apps to block")
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") {
              onResult(.failure(NSError(
                domain: "Bricks", code: -1,
                userInfo: [NSLocalizedDescriptionKey: "User cancelled."]
              )))
            }
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") { onResult(.success(selection)) }
          }
        }
    }
  }
}
