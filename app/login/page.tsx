'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Incorrect password')
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>PACKMUNDERMAN'S</h1>
        <div className="subtitle">Loggington Enhanced</div>
        <p>Enter password to continue</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1a2e;
        }
        .login-box {
          background: #16213e;
          padding: 2rem;
          border-radius: 12px;
          text-align: center;
          border: 2px solid #FFD700;
        }
        h1 {
          color: #FFD700;
          margin: 0;
          font-size: 1.8rem;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .subtitle {
          color: #FF69B4;
          font-size: 1.2rem;
          margin-bottom: 1rem;
          font-style: italic;
        }
        p {
          color: #ccc;
          margin: 0 0 1.5rem 0;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        input {
          padding: 0.75rem 1rem;
          border: 2px solid #333;
          border-radius: 8px;
          background: #1a1a2e;
          color: white;
          font-size: 1rem;
          outline: none;
        }
        input:focus {
          border-color: #FFD700;
        }
        button {
          padding: 0.75rem 1rem;
          background: #FFD700;
          color: #1a1a2e;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
        }
        button:hover {
          background: #ffec8b;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error {
          color: #ff6b6b;
          margin: 1rem 0 0 0;
        }
      `}</style>
    </div>
  )
}
