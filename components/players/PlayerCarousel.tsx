'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PlayerStats } from '@/lib/analytics.types'
import { PlayerCard } from './PlayerCard'

export function PlayerCarousel() {
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const response = await fetch('/api/analytics/player-stats')
        if (!response.ok) {
          throw new Error('Failed to fetch player stats')
        }
        const data = await response.json()
        setPlayers(data.players || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  // Handle scroll to update active index
  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft
      const cardWidth = carousel.offsetWidth * 0.85 // Card takes 85% of viewport
      const gap = 16 // Gap between cards
      const newIndex = Math.round(scrollLeft / (cardWidth + gap))
      setActiveIndex(Math.min(newIndex, players.length - 1))
    }

    carousel.addEventListener('scroll', handleScroll)
    return () => carousel.removeEventListener('scroll', handleScroll)
  }, [players.length])

  const handleCardClick = (playerId: string) => {
    router.push(`/players/${playerId}`)
  }

  if (loading) {
    return (
      <div className="player-carousel-loading">
        <div className="player-carousel-spinner" />
        <p>Loading players...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="player-carousel-error">
        <p>Error: {error}</p>
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="player-carousel-empty">
        <p>No players with games yet</p>
      </div>
    )
  }

  return (
    <div className="player-carousel-wrapper">
      <div className="player-carousel" ref={carouselRef}>
        {players.map((player, index) => (
          <div
            key={player.playerId}
            className={`player-carousel-item ${index === activeIndex ? 'active' : ''}`}
          >
            <PlayerCard
              player={player}
              onClick={() => handleCardClick(player.playerId)}
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="player-carousel-dots">
        {players.map((_, index) => (
          <button
            key={index}
            className={`player-carousel-dot ${index === activeIndex ? 'active' : ''}`}
            onClick={() => {
              const carousel = carouselRef.current
              if (carousel) {
                const cardWidth = carousel.offsetWidth * 0.85
                const gap = 16
                carousel.scrollTo({
                  left: index * (cardWidth + gap),
                  behavior: 'smooth',
                })
              }
            }}
            aria-label={`Go to player ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
