export interface EventLike {
  readonly type: string
}

/** What the stream adds to an event when it is emitted. */
export interface EventStamp {
  /** Position in the stream. Strictly increasing, starts at 0. */
  readonly seq: number
  /** Nanoseconds since the Machine booted, on its monotonic clock. */
  readonly time: number
}

/** An event as observers see it: as emitted, plus its stamp. Distributes over unions. */
export type Stamped<TEvent extends EventLike> = TEvent extends EventLike ? TEvent & EventStamp : never
