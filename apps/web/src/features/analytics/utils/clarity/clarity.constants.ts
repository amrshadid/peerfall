/** Clarity's official tag: the project id is appended. */
export const CLARITY_TAG_URL = 'https://www.clarity.ms/tag/'

/** Marks the injected tag, so it is added once per page. */
export const CLARITY_SCRIPT_ID = 'pf-clarity'

// models Clarity's Consent API v2: analytics cookies once the player allows it, never ad storage.
export const CLARITY_GRANTED = { ad_Storage: 'denied', analytics_Storage: 'granted' } as const
export const CLARITY_DENIED = { ad_Storage: 'denied', analytics_Storage: 'denied' } as const
