import { appConfig } from '@app/config'
import { useCheatSheet } from '@app/store'
import { useScreenChrome } from '@features/chrome/hooks/screen'
import { storageTextOf } from '@features/settings/utils/storage'
import { TitlePresentation } from '@features/title/components/title'
import { useEnterActivatesPrimary } from '@features/title/hooks/title'
import { FIGURE_KEY, JOURNEY, TITLE_FIGURE, titleContentsOf, titleStartOf } from '@features/title/utils/contents'
import { useTourScreen } from '@features/tour/hooks/tour'
import { useMemo } from 'react'

/**
 * The cover. What it lists is fixed for now; once the game keeps progress and the missions package
 * loads its content, the start button and the contents come from their hooks instead.
 */
export function TitleContainer() {
  const chrome = useScreenChrome()
  useTourScreen('title')
  const { openCheatSheet } = useCheatSheet()
  useEnterActivatesPrimary(true)

  const { devRoutes } = appConfig()
  const contents = useMemo(() => titleContentsOf({ journey: JOURNEY, devRoutes }), [devRoutes])
  const start = useMemo(() => titleStartOf(), [])

  return (
    <TitlePresentation
      chrome={chrome}
      start={start}
      contents={contents}
      figure={TITLE_FIGURE}
      figureKey={FIGURE_KEY}
      storageText={storageTextOf(chrome.storageIssue)}
      onShortcuts={openCheatSheet}
    />
  )
}
