import { MissionContainer } from '@features/mission'

export interface MissionPageProps {
  missionId: string
}

export function MissionPage({ missionId }: MissionPageProps) {
  return <MissionContainer missionId={missionId} />
}
