// The host's page for an address that is no file of the site (404.html). It shares the game's
// stylesheet, so it prints like the in-app "No such page", in the theme the player chose.
import './index.css'
import '@shared/styles/theme.css'
import '@shared/components/layout/ManHead.css'
import '@shared/components/layout/Sheet.css'
import '@shared/components/ui/Button.css'
import '@features/content/components/errors/NotFound.css'
import { STORAGE_KEYS } from '@peerfall/core/types'
import { notFoundLine, savedThemeOf } from '@shared/utils/not-found'

let saved: string | null = null
try {
  saved = localStorage.getItem(STORAGE_KEYS.SETTINGS)
} catch {
  // A browser that blocks storage: the system's theme stays.
}
const theme = savedThemeOf(saved)
if (theme) {
  document.documentElement.dataset.theme = theme
}

const path = document.getElementById('not-found-path')
if (path) {
  path.textContent = notFoundLine(location.pathname)
  path.hidden = false
}
