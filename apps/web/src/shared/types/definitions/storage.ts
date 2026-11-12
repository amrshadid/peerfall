/** The synchronous key-value store that saves and settings sit on (localStorage or memory). */
export type TextStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
