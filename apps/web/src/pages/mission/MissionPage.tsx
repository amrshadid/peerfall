import { CodexModalContainer } from '@features/codex'
import { NotFoundContainer } from '@features/content'
import { DebriefContainer } from '@features/debrief'
import { EditorContainer } from '@features/editor'
import { GuideContainer } from '@features/guide'
import { waitReasonOf } from '@features/guide/utils/run'
import { MissionContainer } from '@features/mission'
import { TerminalContainer } from '@features/terminal'
import { TimelineContainer } from '@features/timeline'
import { TopologyContainer } from '@features/topology'

export interface MissionPageProps {
  missionId: string
  /** A Codex card open over the mission, from the address. */
  cardId: string | null
}

/** `#/mission/<id>`: the mission's container lays the panels' containers out around its run. */
export function MissionPage({ missionId, cardId }: MissionPageProps) {
  return (
    <>
      <MissionContainer
        missionId={missionId}
        guide={(view) => <GuideContainer {...view} />}
        editor={({ run }) => <EditorContainer waiting={waitReasonOf(run.phase)} />}
        terminal={<TerminalContainer />}
        topology={<TopologyContainer />}
        timeline={<TimelineContainer />}
        debrief={<DebriefContainer />}
        notFound={<NotFoundContainer />}
      />
      <CodexModalContainer missionId={missionId} cardId={cardId} />
    </>
  )
}
