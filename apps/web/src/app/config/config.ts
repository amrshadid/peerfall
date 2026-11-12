export interface AppConfig {
  /** Microsoft Clarity's project id; null (local dev, forks, tests) means Clarity never loads or asks. */
  readonly clarityId: string | null
  /** Whether `#/dev/…` routes are served. Off in a build, so players never land on a fixture screen. */
  readonly devRoutes: boolean
}

const DEFAULT_APP_CONFIG: AppConfig = { clarityId: null, devRoutes: false }

let current: AppConfig = DEFAULT_APP_CONFIG

// Clarity ids are short and alphanumeric; anything else must never reach a script URL.
const CLARITY_ID = /^[a-z0-9]{1,32}$/i

export function clarityIdOf(raw: string | undefined): string | null {
  const id = raw?.trim() ?? ''
  return CLARITY_ID.test(id) ? id : null
}

/** Once at app startup. Options left out keep their defaults. */
export function configureApp(
  options: { readonly clarityId?: string | undefined; readonly devRoutes?: boolean } = {}
): void {
  current = { clarityId: clarityIdOf(options.clarityId), devRoutes: options.devRoutes ?? false }
}

export function appConfig(): AppConfig {
  return current
}

export function resetAppConfig(): void {
  current = DEFAULT_APP_CONFIG
}
