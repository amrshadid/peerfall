import { AppRouter } from '@app/routing'
import { ThemeSync } from '@app/theme'
import { AnalyticsContainer } from '@features/analytics'
import { NoticesContainer } from '@features/notices'
import { useShortcutListener } from '@features/shortcuts/hooks/keys'
import { cleanupGameListeners, setupGameListeners } from '@peerfall/game'
import { useSaveActions } from '@peerfall/game/hooks'
import { useEffect } from 'react'

export const AppProviders = () => {
  const { open, saveNow } = useSaveActions()

  useEffect(() => {
    // Listeners first: opening the save emits events the game's autosave listens for.
    setupGameListeners()
    void open()
    return () => cleanupGameListeners()
  }, [open])

  useEffect(() => {
    const flush = () => void saveNow()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush()
      }
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [saveNow])

  useShortcutListener()

  return (
    <>
      <ThemeSync />
      <AppRouter />
      <NoticesContainer />
      <AnalyticsContainer />
    </>
  )
}
