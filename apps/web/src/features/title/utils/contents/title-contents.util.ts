import type { JourneyStage, TitleStart } from '@features/title/types'
import { hrefOf } from '@shared/navigation'
import type { ContentsEntry } from '@shared/types'
import { FIRST_MISSION, JOURNEY } from './title-contents.constants'

export interface TitleContentsInput {
  readonly journey: readonly JourneyStage[]
  /** Adds the workspace fixtures to the list: on a dev server only. */
  readonly devRoutes: boolean
}

/** The journey's stages, then Settings. A stage with no mission yet is listed without a link. */
export function titleContentsOf({ journey, devRoutes }: TitleContentsInput): ContentsEntry[] {
  const stages: ContentsEntry[] = journey.map((stage) => ({
    id: `stage-${stage.number}`,
    name: `${stage.number} · ${stage.name}`,
    reference: stage.parts,
    ...(stage.missionId === null ? {} : { href: hrefOf({ name: 'mission', missionId: stage.missionId }) }),
  }))
  return [
    ...stages,
    {
      id: 'settings',
      name: 'Settings',
      reference: 'theme, text size, keys',
      href: hrefOf({ name: 'settings', section: null }),
    },
    ...(devRoutes
      ? [
          {
            id: 'dev-workspace',
            name: 'Workspace fixtures',
            reference: 'dev only',
            href: hrefOf({ name: 'dev-workspace' }),
          },
        ]
      : []),
  ]
}

/** The primary button: the first mission, and where it sits in the journey. */
export function titleStartOf(journey: readonly JourneyStage[] = JOURNEY): TitleStart {
  const stage = journey.find((candidate) => candidate.number === FIRST_MISSION.stage)
  return {
    href: hrefOf({ name: 'mission', missionId: FIRST_MISSION.id }),
    label: 'Start',
    where: [stage ? `Stage ${stage.number} · ${stage.name}` : null, FIRST_MISSION.title].filter(Boolean).join(' · '),
    note: 'A link loses every packet while both of its interfaces stay up. Find out why nothing notices, and fix it.',
  }
}
