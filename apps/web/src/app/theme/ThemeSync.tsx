import { useDisplaySettings } from '@app/store'
import { useEffect } from 'react'

export function ThemeSync() {
  const { theme, motion, uiScale } = useDisplaySettings()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      delete root.dataset.theme
    } else {
      root.dataset.theme = theme
    }
    if (motion === 'reduce') {
      root.dataset.motion = 'reduce'
    } else {
      delete root.dataset.motion
    }
    root.style.setProperty('--ui-scale', String(uiScale))
  }, [theme, motion, uiScale])

  return null
}
