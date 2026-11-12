import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { configureCore } from '@peerfall/core'
import { configureGame } from '@peerfall/game'
import { configureMachine } from '@peerfall/machine'
import { configureTheme } from '@peerfall/theme'
import { App } from './App'

// Every package is configured before the first render, so nothing reads a config that isn't set yet.
configureCore({ logEvents: import.meta.env.DEV ? {} : false })
configureMachine({ vmBaseUrl: `${import.meta.env.BASE_URL}vm/` })
configureTheme()
configureGame()

const root = document.getElementById('root')
if (!root) {
  throw new Error('index.html is missing the #root element')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
