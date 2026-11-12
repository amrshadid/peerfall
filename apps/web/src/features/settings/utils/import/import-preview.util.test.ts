import { emptyProgress, exportSave } from '@peerfall/game/utils'
import { describe, expect, it } from 'vitest'
import { previewOf } from './import-preview.util'

describe('previewOf', () => {
  it('summarises a valid save', () => {
    const json = exportSave(emptyProgress(), Date.UTC(2026, 9, 12, 12))
    expect(previewOf(json)).toEqual({ valid: true, summary: '0 missions passed, saved Oct 12, 2026.' })
  })

  it('refuses a file that is not a save, with the reason', () => {
    const preview = previewOf('{"hello": 1}')
    expect(preview.valid).toBe(false)
    expect(preview.summary).toMatch(/^This file can't be imported: /)
  })
})
