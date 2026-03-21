'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ModeToggle, Mode } from '@/components/ModeToggle'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { ActivityDashboard } from '@/components/activity/ActivityDashboard'
import { PlayerCarousel } from '@/components/players/PlayerCarousel'
import { LogPopup, FloatingPlusButton, EditScoreData } from '@/components/LogPopup'
import { AdminMode } from '@/components/AdminMode'
import { useOverscrollDetection } from '@/lib/useOverscrollDetection'

function HomeContent() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('stats')

  // Read mode from URL on initial load
  useEffect(() => {
    const urlMode = searchParams.get('mode')
    if (urlMode && ['stats', 'activity', 'players', 'insights'].includes(urlMode)) {
      setMode(urlMode as Mode)
    }
  }, [searchParams])
  const [showLogPopup, setShowLogPopup] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showAdminMode, setShowAdminMode] = useState(false)
  const [editScore, setEditScore] = useState<EditScoreData | null>(null)

  // Hidden admin mode trigger via overscroll
  const { isTriggered: showAdminBanner, resetTrigger } = useOverscrollDetection({
    threshold: 75,
    holdDuration: 400,
  })

  // Track swipe-to-dismiss on banner
  const touchStartY = useRef<number>(0)

  const handleBannerTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleBannerTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    if (deltaY > 30) {
      // Swipe down - dismiss without opening admin mode
      resetTrigger()
    }
  }

  const handleBannerClick = () => {
    setShowAdminMode(true)
    resetTrigger()
  }

  const handleEditScore = (score: EditScoreData) => {
    setEditScore(score)
    setShowAdminMode(false)
    setShowLogPopup(true)
  }

  const handleCloseLogPopup = () => {
    setShowLogPopup(false)
    setEditScore(null)
  }

  const handleLogSuccessFromEdit = () => {
    handleLogSuccess()
    setEditScore(null)
  }

  const handleLogSuccess = useCallback(() => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
    // Trigger a refresh of the dashboards
    setRefreshKey(prev => prev + 1)
  }, [])

  return (
    <main className="container">
      <header className="header">
        <h1>PACKMUNDERMAN'S</h1>
        <div className="subtitle">Loggington Enhanced</div>
        <ModeToggle mode={mode} onModeChange={setMode} />
      </header>

      <div className="content-with-fab">
        {mode === 'stats' && (
          <Dashboard key={`stats-${refreshKey}`} />
        )}
        {mode === 'activity' && (
          <ActivityDashboard key={`activity-${refreshKey}`} />
        )}
        {mode === 'players' && (
          <div className="dashboard">
            <h2 className="page-title">Players</h2>
            <PlayerCarousel key={`players-${refreshKey}`} />
          </div>
        )}
        {mode === 'insights' && (
          <div className="dashboard insights-page">
            <div className="chatbot-container">
              {/* Obscured chat interface */}
              <div className="chat-messages">
                <div className="chat-message assistant">
                  <div className="chat-bubble">Hey! I can help you analyze your Ms. Pac-Man performance...</div>
                </div>
                <div className="chat-message user">
                  <div className="chat-bubble">What&apos;s my average score this month?</div>
                </div>
                <div className="chat-message assistant">
                  <div className="chat-bubble">Your average score this month is 847,320 across 12 games...</div>
                </div>
              </div>
              <div className="chat-input-area">
                <input type="text" placeholder="Ask about your stats..." disabled />
                <button disabled>Send</button>
              </div>
              {/* Coming soon overlay */}
              <div className="coming-soon-overlay">
                <div className="coming-soon-badge">Coming soon</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <FloatingPlusButton onClick={() => setShowLogPopup(true)} />

      <LogPopup
        isOpen={showLogPopup}
        onClose={handleCloseLogPopup}
        onSuccess={editScore ? handleLogSuccessFromEdit : handleLogSuccess}
        editScore={editScore}
      />

      <AdminMode
        isOpen={showAdminMode}
        onClose={() => setShowAdminMode(false)}
        onEdit={handleEditScore}
        onRefresh={() => setRefreshKey(prev => prev + 1)}
      />

      {showToast && (
        <div className="toast">
          Score logged!
        </div>
      )}

      {showAdminBanner && (
        <div
          className="admin-banner"
          onClick={handleBannerClick}
          onTouchStart={handleBannerTouchStart}
          onTouchEnd={handleBannerTouchEnd}
        >
          Admin mode
        </div>
      )}
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="container">
        <div className="player-carousel-loading">
          <div className="player-carousel-spinner" />
          <p>Loading...</p>
        </div>
      </main>
    }>
      <HomeContent />
    </Suspense>
  )
}
