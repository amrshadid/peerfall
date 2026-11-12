import { describe, expect, it } from 'vitest'
import { saveFileName } from './save-file-name.util'

describe('saveFileName', () => {
  it('dates the file with the local day', () => {
    expect(saveFileName(new Date(2026, 9, 3, 23, 59))).toBe('peerfall-save-2026-10-03.json')
  })
})
