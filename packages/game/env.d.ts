// The game reads no import.meta.env itself, but type-checking core reaches the
// logger, whose default level does.
interface ImportMeta {
  readonly env: {
    readonly DEV: boolean
    readonly PROD: boolean
    readonly MODE: string
  }
}
