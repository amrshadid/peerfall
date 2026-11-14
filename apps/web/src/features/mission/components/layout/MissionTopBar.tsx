import type { MissionTopBarData } from '@features/mission/types'
import { Button, ButtonLink, HintButton, Icon, StepRail } from '@shared/components/ui'
import './MissionTopBar.css'

export interface MissionTopBarProps {
  bar: MissionTopBarData
  onMenu: () => void
}

export function MissionTopBar({ bar, onMenu }: MissionTopBarProps) {
  return (
    <nav className="screen__topbar mission-topbar" aria-label="Mission">
      <ButtonLink href={bar.mapHref} variant="quiet">
        <Icon name="back" />
        Map
      </ButtonLink>
      <Button variant="quiet" aria-label="Replay this mission" title="Replay this mission" onClick={bar.onReplay}>
        <Icon name="replay" />
        <span className="mission-topbar__label">Replay</span>
      </Button>
      <div className="mission-topbar__name">
        {/* Long titles wrap and clamp on narrow screens; the tooltip keeps the whole name. */}
        <h1 tabIndex={-1} title={bar.heading}>
          {bar.heading}
        </h1>
        <span>{bar.subheading}</span>
      </div>
      <StepRail
        label="Mission steps"
        steps={bar.steps}
        currentIndex={bar.currentIndex}
        reviewing={bar.reviewing}
        onSelect={bar.onReview}
      />
      <HintButton
        left={bar.hintsLeft}
        offered={bar.hintOffered}
        disabled={!bar.hintEnabled}
        keyShortcut={bar.hintKeyShortcut}
        onReveal={bar.onHint}
      />
      <Button variant="quiet" aria-label="Shortcuts and menu" onClick={onMenu}>
        <Icon name="menu" />
      </Button>
    </nav>
  )
}
