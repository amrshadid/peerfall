import { useContent } from '@features/content/hooks/content'
import { DebriefPresentation } from '@features/debrief/components/debrief'
import {
  debriefHeadlineOf,
  debriefMeasuresOf,
  debriefResultOf,
  filedCardsOf,
  finishedStageOf,
} from '@features/debrief/utils'
import { useActiveMission, useCodex, useMissionActions, useRunComparison } from '@peerfall/game/hooks'
import { hrefOf, navigateTo } from '@shared/navigation'

export interface DebriefContainerProps {
  /**
   * Plays the mission again from its scene, on the network as the mission found it, with every
   * hint to ask for again, as Kernelfall's Replay level does.
   */
  onPlayAgain: () => void
}

/**
 * After the mission has passed, laid over the workspace as Kernelfall's card is: the headline and
 * result, what the runs measured, the cards it filed in the Codex, and the way on. The Guide beside
 * it tells the debrief and the real world, the end of the mission's story.
 */
export function DebriefContainer({ onPlayAgain }: DebriefContainerProps) {
  const { mission, isCompleted } = useActiveMission()
  const { baseline, repaired } = useRunComparison()
  const codex = useCodex()
  const content = useContent()
  const { leaveDebrief } = useMissionActions()

  if (!mission) {
    return null
  }
  const before = baseline?.summary ?? null
  const after = repaired?.summary ?? null
  const targetMs = mission.recoveryTargetMs ?? null
  const missions = content.game.missions
  const following = missions[missions.findIndex((candidate) => candidate.id === mission.id) + 1]
  const label = (id: string) =>
    [content.game.numberOf(id), content.game.mission(id)?.title ?? id].filter(Boolean).join(' ')
  return (
    <DebriefPresentation
      headline={debriefHeadlineOf(content.storyOf(mission.id)?.sections.get('debrief'))}
      result={debriefResultOf(isCompleted, mission.objectives.length, after, targetMs)}
      measures={debriefMeasuresOf(before, after, targetMs)}
      learned={mission.codex.map((card) => card.term)}
      cards={filedCardsOf(codex, mission, label)}
      seenIn={mission.title}
      stage={finishedStageOf(codex, mission)}
      next={
        isCompleted && following
          ? {
              label: `Next mission: ${following.title}`,
              // Closed before leaving, as Kernelfall files its card, so this mission no longer opens at it.
              onSelect: () => void leaveDebrief().then(() => navigateTo({ name: 'mission', missionId: following.id })),
            }
          : null
      }
      // As Kernelfall's Replay level: a fresh play-through, never the network as the player left it.
      // Going back into play closes the debrief.
      onReplay={onPlayAgain}
      mapHref={hrefOf({ name: 'map' })}
      onMap={() => void leaveDebrief()}
    />
  )
}
