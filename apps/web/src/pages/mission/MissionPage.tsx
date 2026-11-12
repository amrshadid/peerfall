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
}

/** `#/mission/<id>`: the mission's container lays the panels' containers out around its run. */
export function MissionPage({ missionId }: MissionPageProps) {
  return (
    <MissionContainer
      missionId={missionId}
      guide={({ run, step, stepLabel, onStartOver }) => (
        <GuideContainer run={run} step={step} stepLabel={stepLabel} onStartOver={onStartOver} />
      )}
      editor={({ run }) => <EditorContainer waiting={waitReasonOf(run.phase)} />}
      terminal={<TerminalContainer />}
      topology={<TopologyContainer />}
      timeline={<TimelineContainer />}
      debrief={<DebriefContainer />}
      notFound={<NotFoundContainer />}
    />
  )
}
