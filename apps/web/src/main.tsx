import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@shared/styles/theme.css'
import { configureApp } from '@app/config'
import { registerServiceWorker } from '@app/offline'
import { configureCore } from '@peerfall/core'
import { configureGame } from '@peerfall/game'
import { configureMachine } from '@peerfall/machine'
import { appContent } from '@peerfall/missions/utils'
import { configureTheme } from '@peerfall/theme'
import { pageStorage, storageAdapter } from '@shared/utils/storage'
import { App } from './App'

// Every package is configured before the first render, so nothing reads a config that isn't set yet.
configureCore({ logEvents: import.meta.env.DEV ? {} : false })
configureMachine({ vmBaseUrl: `${import.meta.env.BASE_URL}vm/` })
configureTheme()
configureApp({ clarityId: import.meta.env.VITE_CLARITY_ID, devRoutes: import.meta.env.DEV })
const content = appContent()
// Invalid content never reaches the game: the router shows its errors instead.
if (content.ok) {
  configureGame({ storage: storageAdapter(pageStorage().text), content: content.value.game })
}

const root = document.getElementById('root')
if (!root) {
  throw new Error('index.html is missing the #root element')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Only a build has the worker; after the page has loaded, so it never competes with the first paint.
if (import.meta.env.PROD) {
  window.addEventListener('load', () => void registerServiceWorker(import.meta.env.BASE_URL))
}
