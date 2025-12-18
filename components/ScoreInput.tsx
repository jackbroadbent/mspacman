'use client'

interface ScoreInputProps {
  value: string
  onChange: (value: string) => void
}

export function ScoreInput({ value, onChange }: ScoreInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric characters
    const rawValue = e.target.value.replace(/[^0-9]/g, '')

    // Format with commas
    const formatted = rawValue ? Number(rawValue).toLocaleString() : ''

    onChange(formatted)
  }

  return (
    <div className="section">
      <div className="section-title">Final Score</div>
      <input
        type="text"
        inputMode="numeric"
        className="score-input"
        placeholder="0"
        value={value}
        onChange={handleChange}
      />
    </div>
  )
}
