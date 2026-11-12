// The app uses configureCore(), /types, /utils and /hooks; /services (the event
// bus, the error handler) is for packages.

export { configureCore, getCoreConfig, resetCoreConfig } from '#config'
export * from '#hooks/index'
export * from '#services/index'
export * from '#types/index'
export * from '#utils/index'
