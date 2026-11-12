import { useDisplaySettings } from '@app/store'
import { useCallback, useSyncExternalStore } from 'react'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const systemDark = () => window.matchMedia(DARK_QUERY).matches

export interface UseThemeResult {
  /** Whether chosen or followed from the system. */
  readonly isDark: boolean
  /** Leaves "follow the system" behind. */
  readonly toggleTheme: () => void
}

export function useTheme(): UseThemeResult {
  const { theme, setTheme } = useDisplaySettings()
  const dark = useSyncExternalStore(subscribe, systemDark, () => false)
  const isDark = theme === 'dark' || (theme === 'system' && dark)
  const toggleTheme = useCallback(() => setTheme(isDark ? 'light' : 'dark'), [isDark, setTheme])
  return { isDark, toggleTheme }
}
