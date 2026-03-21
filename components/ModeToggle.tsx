'use client'

export type Mode = 'stats' | 'activity' | 'players' | 'insights'

interface ModeToggleProps {
  mode: Mode
  onModeChange: (mode: Mode) => void
}

// Pixel art icons as SVG - 16x16 grid, rendered at 20x20
const PixelIcon = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-label={label}
    className="pixel-icon"
  >
    {children}
  </svg>
)

// Stats: Bar chart (3 bars)
const StatsIcon = () => (
  <PixelIcon label="Stats">
    <rect x="2" y="10" width="3" height="4" />
    <rect x="6" y="6" width="3" height="8" />
    <rect x="10" y="3" width="3" height="11" />
  </PixelIcon>
)

// Activity: List/feed lines
const ActivityIcon = () => (
  <PixelIcon label="Activity">
    <rect x="2" y="3" width="2" height="2" />
    <rect x="5" y="3" width="9" height="2" />
    <rect x="2" y="7" width="2" height="2" />
    <rect x="5" y="7" width="9" height="2" />
    <rect x="2" y="11" width="2" height="2" />
    <rect x="5" y="11" width="9" height="2" />
  </PixelIcon>
)

// Players: Simple figure
const PlayersIcon = () => (
  <PixelIcon label="Players">
    {/* Head */}
    <rect x="6" y="2" width="4" height="4" />
    {/* Body */}
    <rect x="5" y="7" width="6" height="4" />
    {/* Legs */}
    <rect x="5" y="11" width="2" height="3" />
    <rect x="9" y="11" width="2" height="3" />
  </PixelIcon>
)

// Insights: Magic wand
const InsightsIcon = () => (
  <PixelIcon label="Insights">
    {/* Wand handle (diagonal) */}
    <rect x="2" y="12" width="2" height="2" />
    <rect x="4" y="10" width="2" height="2" />
    <rect x="6" y="8" width="2" height="2" />
    <rect x="8" y="6" width="2" height="2" />
    {/* Wand tip / star burst */}
    <rect x="10" y="4" width="2" height="2" />
    <rect x="12" y="2" width="2" height="2" />
    {/* Sparkles around tip */}
    <rect x="10" y="1" width="1" height="1" />
    <rect x="14" y="3" width="1" height="1" />
    <rect x="13" y="6" width="1" height="1" />
  </PixelIcon>
)

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle mode-toggle-icons">
      <button
        className={`mode-toggle-icon-btn ${mode === 'stats' ? 'selected' : ''}`}
        onClick={() => onModeChange('stats')}
        title="Stats"
      >
        <StatsIcon />
      </button>
      <button
        className={`mode-toggle-icon-btn ${mode === 'activity' ? 'selected' : ''}`}
        onClick={() => onModeChange('activity')}
        title="Activity"
      >
        <ActivityIcon />
      </button>
      <button
        className={`mode-toggle-icon-btn ${mode === 'players' ? 'selected' : ''}`}
        onClick={() => onModeChange('players')}
        title="Players"
      >
        <PlayersIcon />
      </button>
      <button
        className={`mode-toggle-icon-btn ${mode === 'insights' ? 'selected' : ''}`}
        onClick={() => onModeChange('insights')}
        title="Insights"
      >
        <InsightsIcon />
      </button>
    </div>
  )
}
