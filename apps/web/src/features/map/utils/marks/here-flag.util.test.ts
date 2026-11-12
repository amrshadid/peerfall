import { describe, expect, it } from 'vitest'
import { HERE_FLAG, HERE_RING } from './here-flag.constants'
import { hereFlag, pathOf, roadOf } from './here-flag.util'

const bounds = { left: 0, right: 800, top: 0 }

describe('hereFlag', () => {
  it('stands over the stop, the pin stopping just short of its red ring', () => {
    const flag = hereFlag({ x: 400, y: 300 }, 22, bounds)
    const tip = 300 - (11 + HERE_RING + HERE_FLAG.gap)
    expect(flag.pin).toBe(`M400 ${tip} l-6 -8 h12 z`)
    expect(flag.box).toEqual({ x: 352, y: tip - 8 - 22, width: 96, height: 22 })
    expect(flag.label).toEqual({ x: 400, y: flag.box.y + HERE_FLAG.baseline })
  })

  it('keeps the flag inside the sides, the pin still on the stop', () => {
    const flag = hereFlag({ x: 10, y: 300 }, 22, bounds)
    expect(flag.box.x).toBe(HERE_FLAG.margin)
    expect(flag.pin.startsWith('M10 ')).toBe(true)
    expect(hereFlag({ x: 795, y: 300 }, 22, bounds).box.x + 96).toBe(800 - HERE_FLAG.margin)
  })

  it('hangs below a stop with no room above', () => {
    const flag = hereFlag({ x: 400, y: 20 }, 12, bounds)
    const tip = 20 + 6 + HERE_RING + HERE_FLAG.gap
    expect(flag.pin).toBe(`M400 ${tip} l-6 8 h12 z`)
    expect(flag.box.y).toBe(tip + HERE_FLAG.pinHeight)
  })
})

describe('roadOf', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ]

  it('inks the road up to the split and dashes the rest', () => {
    expect(roadOf(points, 1)).toEqual({ reached: 'M0 0 L10 0', ahead: 'M10 0 L10 10' })
  })

  it('has nothing inked before the first stop is reached', () => {
    expect(roadOf(points, 0)).toEqual({ reached: '', ahead: pathOf(points) })
  })
})
