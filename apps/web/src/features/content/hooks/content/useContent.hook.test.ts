// @vitest-environment jsdom
import { appContent } from '@peerfall/missions/utils'
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useContent } from './useContent.hook'

vi.mock('@peerfall/missions/utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('@peerfall/missions/utils')>()
  return { ...original, appContent: vi.fn(original.appContent) }
})

describe('useContent', () => {
  afterEach(() => {
    // Back to the real content: a reset vi.fn() runs the implementation it was made with.
    vi.mocked(appContent).mockReset()
    vi.restoreAllMocks()
  })

  it('hands screens the checked content in the repository', () => {
    const { result } = renderHook(() => useContent())
    expect(result.current.game.missions.length).toBeGreaterThan(0)
    expect(result.current.game.chapters).toHaveLength(11)
  })

  it('refuses invalid content, which the router shows as errors instead of a screen', () => {
    // Every render sees it: React renders again after a throw before giving up.
    vi.mocked(appContent).mockReturnValue({ ok: false, errors: ['chapters.yaml: missing'] })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderHook(() => useContent())).toThrow('invalid mission content')
  })
})
