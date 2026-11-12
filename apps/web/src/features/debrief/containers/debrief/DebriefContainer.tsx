import { useContent } from '@features/content/hooks/content'
import { DebriefPresentation } from '@features/debrief/components/debrief'
import { debriefMeasuresOf, debriefVerdictOf } from '@features/debrief/utils/measures'
import { titledMarkdown } from '@features/guide/utils/markdown'
import { useActiveMission, useMissionActions, useRunComparison } from '@peerfall/game/hooks'
import { hrefOf } from '@shared/navigation'
import { useMemo } from 'react'

/** After the mission has passed: what the two runs measured, then the mission's own explanation. */
export function DebriefContainer() {
  const { mission, isCompleted } = useActiveMission()
  const { baseline, repaired } = useRunComparison()
  const content = useContent()
  const { begin } = useMissionActions()

  const source = mission ? (content.textsOf(mission.id)?.debrief ?? '') : ''
  // The file's own title repeats the mission's name, which the debrief already prints.
  const text = useMemo(() => titledMarkdown(source).blocks, [source])

  if (!mission) {
    return null
  }
  const before = baseline?.summary ?? null
  const after = repaired?.summary ?? null
  return (
    <DebriefPresentation
      title={mission.title}
      verdict={debriefVerdictOf(isCompleted, after, mission.recoveryTargetMs)}
      measures={debriefMeasuresOf(before, after, mission.recoveryTargetMs)}
      explanation={[]}
      text={text}
      learned={[]}
      commands={[]}
      labNote={null}
      next={null}
      // Back to the network, as the player left it: every run after the first pass is a free retry.
      onReplay={begin}
      titleHref={hrefOf({ name: 'title' })}
    />
  )
}
