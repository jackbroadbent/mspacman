'use client'

import { useState, useEffect, useCallback } from 'react'
import { MOCK_PLAYERS } from '@/lib/constants'
import { EditScoreData } from './LogPopup'
import { LevelFruitsJson } from '@/lib/database.types'

interface ScoreEntry {
  id: string
  player_id: string
  player_name: string
  score: number
  level: number
  level_fruits: LevelFruitsJson | null
  features: string[]
  created_at: string
}

interface AdminModeProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (score: EditScoreData) => void
  onRefresh: () => void
}

export function AdminMode({ isOpen, onClose, onEdit, onRefresh }: AdminModeProps) {
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<ScoreEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchScores = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/scores?limit=20')
      if (!response.ok) throw new Error('Failed to fetch scores')
      const data = await response.json()
      setScores(data.scores as ScoreEntry[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchScores()
    }
  }, [isOpen, fetchScores])

  const handleEdit = (score: ScoreEntry) => {
    onEdit({
      id: score.id,
      playerId: score.player_id,
      score: score.score,
      level: score.level,
      levelFruits: score.level_fruits,
      features: score.features,
    })
  }

  const handleDeleteClick = (score: ScoreEntry) => {
    setDeleteConfirm(score)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/scores/${deleteConfirm.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete score')
      }

      // Remove from local state
      setScores(prev => prev.filter(s => s.id !== deleteConfirm.id))
      setDeleteConfirm(null)
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm(null)
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="popup-overlay" onClick={onClose} />
      <div className="popup-container admin-mode-container">
        <div className="popup-header">
          <h2>Admin Mode</h2>
          <button className="popup-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="popup-content">
          {loading ? (
            <div className="admin-loading">
              <div className="player-carousel-spinner" />
              <p>Loading scores...</p>
            </div>
          ) : error ? (
            <div className="admin-error">
              <p>{error}</p>
              <button className="btn" onClick={fetchScores}>Retry</button>
            </div>
          ) : scores.length === 0 ? (
            <div className="admin-empty">
              <p>No scores found</p>
            </div>
          ) : (
            <div className="admin-scores-list">
              {scores.map((score) => (
                <div key={score.id} className="admin-score-item">
                  <div className="admin-score-info">
                    <div className="admin-score-main">
                      <span className="admin-score-player">{score.player_name}</span>
                      <span className="admin-score-value">{score.score.toLocaleString()}</span>
                    </div>
                    <div className="admin-score-meta">
                      <span>Level {score.level}</span>
                      <span className="admin-score-time">{formatTimeAgo(score.created_at)}</span>
                    </div>
                  </div>
                  <div className="admin-score-actions">
                    <button
                      className="admin-btn admin-btn-edit"
                      onClick={() => handleEdit(score)}
                    >
                      Edit
                    </button>
                    <button
                      className="admin-btn admin-btn-delete"
                      onClick={() => handleDeleteClick(score)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <>
          <div className="delete-confirm-overlay" onClick={handleDeleteCancel} />
          <div className="delete-confirm-modal">
            <h3>Delete Score?</h3>
            <p>
              Are you sure you want to delete this score?
            </p>
            <div className="delete-confirm-score">
              <span className="delete-confirm-player">{deleteConfirm.player_name}</span>
              <span className="delete-confirm-value">{deleteConfirm.score.toLocaleString()}</span>
            </div>
            <p className="delete-confirm-warning">This action cannot be undone.</p>
            <div className="delete-confirm-actions">
              <button
                className="btn delete-confirm-cancel"
                onClick={handleDeleteCancel}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn delete-confirm-delete"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
