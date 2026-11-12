// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEnterActivatesPrimary } from './useEnterActivatesPrimary.hook'

let primary: HTMLButtonElement

beforeEach(() => {
  primary = document.createElement('button')
  primary.dataset.primary = ''
  document.body.append(primary)
})

afterEach(() => {
  cleanup()
  primary.remove()
})

const pressEnter = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

describe('useEnterActivatesPrimary', () => {
  it('clicks the primary action on Enter when nothing has focus', () => {
    const click = vi.fn()
    primary.addEventListener('click', click)
    renderHook(() => useEnterActivatesPrimary(true))
    pressEnter()
    expect(click).toHaveBeenCalledOnce()
  })

  it('leaves Enter alone while disabled or when something has focus', () => {
    const click = vi.fn()
    primary.addEventListener('click', click)
    const { rerender } = renderHook(({ enabled }) => useEnterActivatesPrimary(enabled), {
      initialProps: { enabled: false },
    })
    pressEnter()
    rerender({ enabled: true })
    primary.focus()
    pressEnter()
    expect(click).not.toHaveBeenCalled()
  })
})
