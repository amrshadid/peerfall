// The lab reads no import.meta.env itself, but type-checking the machine's sources reaches
// core's logger, whose default level does.
interface ImportMeta {
  readonly env: {
    readonly DEV: boolean
    readonly PROD: boolean
    readonly MODE: string
  }
}
