import { errorResponse, handleServiceError } from '@peerfall/core/services'
import type { ServiceResponse } from '@peerfall/core/types'
import type { MissionId } from '#types/definitions/mission'
import type { SaveIssue } from '#types/definitions/saves'

/** Storage refused a write (full, or blocked in a private window). */
export const handleStorageError = (error: unknown): ServiceResponse<never> =>
  handleServiceError(error, { fallbackCode: 'UNAVAILABLE' })

export const noContentError = (): ServiceResponse<never> =>
  errorResponse('NOT_READY', 'No missions are loaded: pass the content to configureGame() first.')

export const noActiveMissionError = (): ServiceResponse<never> =>
  errorResponse('NOT_READY', 'No mission is active: start a mission first.')

export const unknownMissionError = (missionId: MissionId): ServiceResponse<never> =>
  errorResponse('NOT_FOUND', `unknown mission "${missionId}"`)

export const lockedMissionError = (missionId: MissionId): ServiceResponse<never> =>
  errorResponse('FORBIDDEN', `mission "${missionId}" is locked`)

export const noHintLeftError = (missionId: MissionId): ServiceResponse<never> =>
  errorResponse('NOT_FOUND', `all three hints of "${missionId}" are already revealed`)

export const notCompletedError = (missionId: MissionId): ServiceResponse<never> =>
  errorResponse('FORBIDDEN', `mission "${missionId}" has no passing run yet: the debrief comes after one`)

/** A save that failed validation; `details` keeps every problem, each with its path. */
export const invalidSaveError = (errors: readonly string[]): ServiceResponse<never> =>
  errorResponse('VALIDATION_ERROR', errors[0] ?? 'The save is not valid.', errors)

export const saveFailedError = (issue: SaveIssue): ServiceResponse<never> =>
  errorResponse('UNAVAILABLE', "Progress couldn't be written to storage; the game keeps it in memory.", issue)
