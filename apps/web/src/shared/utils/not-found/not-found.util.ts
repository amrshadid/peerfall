/** The theme the player chose in Settings, from the saved settings text; null for "system" or anything unreadable. */
export function savedThemeOf(saved: string | null): 'light' | 'dark' | null {
  if (saved === null) {
    return null
  }
  try {
    const value = JSON.parse(saved) as { state?: { theme?: unknown }; theme?: unknown } | null
    // Settings written before version 1 are the bare object, without zustand's `state` wrapper.
    const theme: unknown = value?.state ? value.state.theme : value?.theme
    return theme === 'light' || theme === 'dark' ? theme : null
  } catch {
    return null
  }
}

/** What BusyBox `ls` prints for a path that isn't there, as on the Machine. */
export function notFoundLine(pathname: string): string {
  let path = pathname
  try {
    path = decodeURIComponent(pathname)
  } catch {
    // A malformed escape: show the address as it was sent.
  }
  return `$ ls ${path}\nls: ${path}: No such file or directory`
}
