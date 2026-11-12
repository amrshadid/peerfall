const pad = (value: number) => String(value).padStart(2, '0')

/** `peerfall-save-2026-10-29.json`, in the player's local date. */
export function saveFileName(date: Date): string {
  // getMonth() counts from 0.
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `peerfall-save-${day}.json`
}
