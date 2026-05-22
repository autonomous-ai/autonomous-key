import ExpoModulesCore
import FamilyControls
import SwiftUI
import UIKit

/// Expo View that renders the apps + categories from a FamilyActivitySelection
/// using Apple's `Label(token)` SwiftUI initializer. Apple draws the icons
/// and names privately — JS code never sees the underlying identifiers.
public final class SelectionLabelView: ExpoView {
  private var hostingController: UIHostingController<SelectionLabelHost>?
  private var currentToken: String = ""

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear
    setupHostingController()
  }

  private func setupHostingController() {
    let host = SelectionLabelHost(selection: nil)
    let hc = UIHostingController(rootView: host)
    hc.view.backgroundColor = .clear
    hc.view.translatesAutoresizingMaskIntoConstraints = false
    addSubview(hc.view)
    NSLayoutConstraint.activate([
      hc.view.topAnchor.constraint(equalTo: topAnchor),
      hc.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      hc.view.trailingAnchor.constraint(equalTo: trailingAnchor),
      hc.view.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
    hostingController = hc
  }

  func setToken(_ token: String) {
    guard token != currentToken else { return }
    currentToken = token
    reload()
  }

  private func reload() {
    guard !currentToken.isEmpty,
          let data = UserDefaults.standard.data(forKey: "bricks.selection.\(currentToken)"),
          let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) else {
      hostingController?.rootView = SelectionLabelHost(selection: nil)
      return
    }
    hostingController?.rootView = SelectionLabelHost(selection: selection)
  }
}

private struct SelectionLabelHost: View {
  let selection: FamilyActivitySelection?

  var body: some View {
    if let selection = selection,
       !selection.applicationTokens.isEmpty || !selection.categoryTokens.isEmpty {
      VStack(alignment: .leading, spacing: 10) {
        ForEach(Array(selection.applicationTokens), id: \.self) { token in
          Label(token)
            .labelStyle(.titleAndIcon)
            .foregroundColor(.white)
            .font(.system(size: 15))
        }
        ForEach(Array(selection.categoryTokens), id: \.self) { token in
          Label(token)
            .labelStyle(.titleAndIcon)
            .foregroundColor(.white)
            .font(.system(size: 15))
        }
      }
      .padding(8)
    } else {
      EmptyView()
    }
  }
}
