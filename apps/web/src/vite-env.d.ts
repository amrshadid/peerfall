/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Microsoft Clarity's project id, set for production builds only. */
  readonly VITE_CLARITY_ID?: string
}

/** The app's version from its package.json, put in by the build (vite.config.ts). */
declare const __APP_VERSION__: string
