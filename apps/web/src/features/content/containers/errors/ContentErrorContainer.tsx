import { ContentErrorPresentation } from '@features/content/components/errors'
import { appContent } from '@peerfall/missions/utils'

export function ContentErrorContainer() {
  const content = appContent()
  return <ContentErrorPresentation errors={content.ok ? [] : content.errors} />
}
