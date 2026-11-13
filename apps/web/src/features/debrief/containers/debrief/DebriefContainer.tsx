import { useContent } from '@features/content/hooks/content'
import { DebriefPresentation } from '@features/debrief/components/debrief'
import { debriefMeasuresOf, debriefVerdictOf } from '@features/debrief/utils/measures'
import { useActiveMission, useMissionActions, useRunComparison } from '@peerfall/game/hooks'
import { hrefOf, navigateTo } from '@shared/navigation'

/**
 * After the mission has passed, laid over the workspace as Kernelfall's card is: what the runs
 * measured, the terms it filed in the Codex, and the way on. The Guide beside it tells the
 * debrief and the real world, the end of the mission's story.
 */
export function DebriefContainer() {
  const { mission, isCompleted } = useActiveMission()
  const { baseline, repaired } = useRunComparison()
  const content = useContent()
  const { begin } = useMissionActions()

  if (!mission) {
    return null
  }
  const before = baseline?.summary ?? null
  const after = repaired?.summary ?? null
  const targetMs = mission.recoveryTargetMs ?? null
  const missions = content.game.missions
  const following = missions[missions.findIndex((candidate) => candidate.id === mission.id) + 1]
  return (
    <DebriefPresentation
      title={mission.title}
      verdict={debriefVerdictOf(isCompleted, after, targetMs)}
      measures={debriefMeasuresOf(before, after, targetMs)}
      explanation={[]}
      learned={mission.codex.map((card) => card.term)}
      commands={[]}
      labNote={null}
      next={
        isCompleted && following
          ? {
              label: `Next: ${following.title}`,
              onSelect: () => navigateTo({ name: 'mission', missionId: following.id }),
            }
          : null
      }
      // Back to the network, as the player left it: every run after the first pass is a free retry.
      onReplay={begin}
      titleHref={hrefOf({ name: 'title' })}
    />
  )
}
