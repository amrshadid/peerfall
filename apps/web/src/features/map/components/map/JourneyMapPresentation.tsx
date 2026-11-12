import type { MapDetail } from '@features/map/types'
import { ManHead, ScreenFrame } from '@shared/components/layout'
import { ButtonLink, Icon } from '@shared/components/ui'
import { APP_MANUAL } from '@shared/constants/app'
import type { ScreenChrome } from '@shared/types'
import './JourneyMap.css'
import { MapDetailPanel } from './MapDetailPanel'
import { MapSection, type MapSectionProps } from './MapSection'

export interface JourneyMapPresentationProps {
  chrome: ScreenChrome
  titleHref: string
  /** Where Continue goes; null when every mission that is open is completed. */
  recommended: { readonly label: string; readonly href: string } | null
  section: MapSectionProps
  detail: MapDetail
  /** "Stage 4, Recover from failure: 0 of 1 missions passed · 10 stages planned". */
  summary: string
  version: string
  onShortcuts: () => void
}

/** The map of the journey: its stages top to bottom, with a detail panel for the selected mission. */
export function JourneyMapPresentation({
  chrome,
  titleHref,
  recommended,
  section,
  detail,
  summary,
  version,
  onShortcuts,
}: JourneyMapPresentationProps) {
  return (
    <ScreenFrame
      page="Peerfall-map(7)"
      volume={`${APP_MANUAL} · General drawing of the journey`}
      chrome={chrome}
      topbar={
        <nav className="screen__topbar map-topbar" aria-label="Map">
          <ButtonLink href={titleHref} variant="quiet">
            <Icon name="back" />
            Title
          </ButtonLink>
          <h1 tabIndex={-1} className="map-topbar__title">
            Map
          </h1>
          {recommended && (
            <p className="map-topbar__next">
              Recommended next: <b title={recommended.label}>{recommended.label}</b>
              <ButtonLink variant="primary" href={recommended.href}>
                Continue
              </ButtonLink>
            </p>
          )}
        </nav>
      }
      foot={
        <ManHead
          kind="foot"
          left={summary}
          center={version}
          right={
            <button type="button" className="map-foot__shortcuts" onClick={onShortcuts}>
              Shortcuts <kbd>?</kbd>
            </button>
          }
        />
      }
    >
      <main className="map-board screen__sheet pf-sheet">
        <figure className="map-board__drawing">
          <MapSection {...section} />
          <figcaption>
            Fig. 2. The journey in section, one router down to an operated network. Arrow keys walk the road, Page Up
            and Page Down change stage, Enter plays.
          </figcaption>
        </figure>
        <MapDetailPanel detail={detail} />
      </main>
    </ScreenFrame>
  )
}
