import type { ContinueTarget, FirstMission } from '@features/title/types'
import type { ChapterEntry, MissionDefinition, MissionStatus } from '@peerfall/game/types'
import { hrefOf } from '@shared/navigation'
import type { ContentsEntry } from '@shared/types'
import { formatLastPlayed } from '@shared/utils/format'

const STATUS_TEXT: Readonly<Record<MissionStatus, string>> = {
  locked: 'Locked',
  available: 'Not started',
  in_progress: 'In progress',
  completed: 'Passed',
}

/** "Stage 4": a chapter by its place in the journey. */
export function stageName(chapter: ChapterEntry | undefined): string {
  return chapter ? `Stage ${chapter.chapter.stage}` : 'The journey'
}

/** "Stage 4: Recover from failure": the stage the player is in names the manual's volume. */
export function volumeOf(chapter: ChapterEntry | undefined): string {
  return chapter ? `Stage ${chapter.chapter.stage}: ${chapter.chapter.title}` : 'The journey'
}

/** The chapter a mission belongs to; the first one that has missions when there is none to continue. */
export function currentChapter(
  chapters: readonly ChapterEntry[],
  mission: MissionDefinition | null
): ChapterEntry | undefined {
  return (
    chapters.find((entry) => entry.chapter.id === mission?.chapter) ??
    chapters.find((entry) => entry.missions.length > 0) ??
    chapters[0]
  )
}

export interface TitleContentsInput {
  /** The stage the player is in. */
  readonly chapter: ChapterEntry | undefined
  /** Where New game starts. */
  readonly firstMission: MissionDefinition | undefined
  readonly onNewGame: () => void
}

export function titleContentsOf({ chapter, firstMission, onNewGame }: TitleContentsInput): ContentsEntry[] {
  const passed = chapter?.missions.filter((entry) => entry.status === 'completed').length ?? 0
  return [
    {
      id: 'new',
      name: 'New game',
      reference: firstMission ? `from ${firstMission.title}` : 'from the first mission',
      onSelect: onNewGame,
    },
    {
      id: 'map',
      name: 'Peer Map',
      reference: chapter ? `${stageName(chapter)}, ${passed} of ${chapter.missions.length} passed` : 'the journey',
      href: hrefOf({ name: 'map' }),
    },
    {
      id: 'settings',
      name: 'Settings',
      reference: 'theme, motion, saves',
      href: hrefOf({ name: 'settings', section: null }),
    },
  ]
}

export interface ContinueTargetInput {
  readonly mission: MissionDefinition
  readonly chapters: readonly ChapterEntry[]
  /** " · last played 2 days ago", or empty before the first save. */
  readonly lastPlayed: string
}

export function continueTargetOf({ mission, chapters, lastPlayed }: ContinueTargetInput): ContinueTarget {
  const chapter = chapters.find((entry) => entry.chapter.id === mission.chapter)
  const status = chapter?.missions.find((entry) => entry.mission.id === mission.id)?.status ?? 'available'
  return {
    href: hrefOf({ name: 'mission', missionId: mission.id }),
    where: [chapter ? stageName(chapter) : null, chapter?.chapter.title, mission.title].filter(Boolean).join(' · '),
    step: `${STATUS_TEXT[status]}${lastPlayed}`,
  }
}

export function firstMissionOf(mission: MissionDefinition | undefined): FirstMission {
  return mission
    ? { where: `Start at ${mission.title}.`, step: mission.objective }
    : { where: 'No mission is written yet.', step: 'The journey is on the Peer Map.' }
}

export function lastPlayedText(now: number, lastSavedAt: number | null): string {
  return lastSavedAt === null ? '' : ` · last played ${formatLastPlayed(now, lastSavedAt)}`
}
