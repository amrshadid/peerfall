// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useHeaderWidth } from './useHeaderWidth.hook'

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
  document.documentElement.style.fontSize = ''
})

// jsdom lays nothing out, so the boxes are given by hand.
function boxed(element: HTMLElement, left: number, right: number): HTMLElement {
  element.getBoundingClientRect = () => ({ left, right }) as DOMRect
  return element
}

describe('useHeaderWidth', () => {
  it("is the width that puts the panel's divider under the header's rule", () => {
    document.documentElement.style.fontSize = '16px'
    const bar = document.body.appendChild(document.createElement('nav'))
    const header = boxed(bar.appendChild(document.createElement('div')), 100, 338)
    header.className = 'name'
    header.style.borderRight = '2px solid'
    const panel = boxed(document.body.appendChild(document.createElement('aside')), 16, 300)
    panel.id = 'guide'

    const { result } = renderHook(() => useHeaderWidth('.name', 'guide'))
    expect(result.current).toBe(20)
  })

  it('is null while the header or the panel is not on the page', () => {
    const { result } = renderHook(() => useHeaderWidth('.name', 'guide'))
    expect(result.current).toBeNull()
  })
})
