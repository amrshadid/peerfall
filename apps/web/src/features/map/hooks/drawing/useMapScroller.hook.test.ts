// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMapScroller } from './useMapScroller.hook'

const WIDTH = 900
const HEIGHT = 600

/** A scroll container with a fixed size, as jsdom lays nothing out. */
function scrollBox(): HTMLDivElement {
  const element = document.createElement('div')
  Object.defineProperty(element, 'clientWidth', { value: WIDTH })
  Object.defineProperty(element, 'clientHeight', { value: HEIGHT })
  element.scrollTo = vi.fn() as typeof element.scrollTo
  return element
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useMapScroller', () => {
  it('reads the size of the element it is attached to', () => {
    const { result } = renderHook(() => useMapScroller())
    expect(result.current.width).toBe(0)

    act(() => result.current.ref(scrollBox()))
    expect(result.current).toMatchObject({ width: WIDTH, view: HEIGHT })
    expect(result.current.read()).toEqual({ top: 0, view: HEIGHT })
  })

  it('hands the scroll position to the listener once a frame, without rendering', () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (paint: FrameRequestCallback) => frames.push(paint))
    vi.stubGlobal('cancelAnimationFrame', () => frames.splice(0))
    const onFrame = vi.fn()
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      return useMapScroller(onFrame)
    })
    const element = scrollBox()
    act(() => result.current.ref(element))
    const rendered = renders

    for (const top of [100, 200, 300]) {
      element.scrollTop = top
      element.dispatchEvent(new Event('scroll'))
    }
    expect(frames).toHaveLength(1)
    frames[0]?.(0)
    expect(onFrame).toHaveBeenCalledOnce()
    expect(onFrame).toHaveBeenCalledWith({ top: 300, view: HEIGHT })
    expect(result.current.read().top).toBe(300)
    expect(renders).toBe(rendered)
  })

  it('scrolls a drawing height to the middle of the view, never above the top', () => {
    const { result } = renderHook(() => useMapScroller())
    const element = scrollBox()
    act(() => result.current.ref(element))

    result.current.scrollTo(1000, true)
    expect(element.scrollTo).toHaveBeenLastCalledWith({ top: 1000 - HEIGHT / 2, behavior: 'smooth' })
    result.current.scrollTo(100, false, 0.5)
    expect(element.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' })
  })
})
