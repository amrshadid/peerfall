/** macOS and iOS: the shortcut modifier is Cmd there and Ctrl everywhere else. */
export function isMacPlatform(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
}
