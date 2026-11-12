import type { WallClock } from '#types/definitions/config'

/** A wall clock that only moves when a test advances it. */
export class FakeClock implements WallClock {
  #now = 1_000

  now(): number {
    return this.#now
  }

  advance(ms: number): void {
    this.#now += ms
  }
}
