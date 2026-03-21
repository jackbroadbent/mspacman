'use client'

import React from 'react'
import { FruitKey } from '@/lib/constants'

// Pixel art fruit icons - designed to match Ms. Pac-Man arcade game
interface PixelFruitProps {
  children: React.ReactNode
  label: string
  size?: number
}

const PixelFruit = ({ children, label, size = 24 }: PixelFruitProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-label={label}
    className="pixel-fruit"
  >
    {children}
  </svg>
)

// Cherry: Two red cherries with green stem
export const CherryIcon = ({ size }: { size?: number }) => (
  <PixelFruit label="Cherry" size={size}>
    {/* Stem */}
    <rect x="7" y="1" width="2" height="1" fill="#228B22" />
    <rect x="6" y="2" width="1" height="2" fill="#228B22" />
    <rect x="9" y="2" width="1" height="3" fill="#228B22" />
    <rect x="5" y="4" width="1" height="2" fill="#228B22" />
    <rect x="10" y="5" width="1" height="1" fill="#228B22" />
    {/* Left cherry */}
    <rect x="3" y="6" width="4" height="4" fill="#DC143C" />
    <rect x="4" y="5" width="2" height="1" fill="#DC143C" />
    <rect x="4" y="10" width="2" height="1" fill="#DC143C" />
    <rect x="4" y="6" width="1" height="1" fill="#FF6B6B" />
    {/* Right cherry */}
    <rect x="9" y="7" width="4" height="4" fill="#DC143C" />
    <rect x="10" y="6" width="2" height="1" fill="#DC143C" />
    <rect x="10" y="11" width="2" height="1" fill="#DC143C" />
    <rect x="10" y="7" width="1" height="1" fill="#FF6B6B" />
  </PixelFruit>
)

// Strawberry: Red with green leaf top
export const StrawberryIcon = ({ size }: { size?: number }) => (
  <PixelFruit label="Strawberry" size={size}>
    {/* Green leaf */}
    <rect x="6" y="1" width="4" height="2" fill="#228B22" />
    <rect x="5" y="2" width="1" height="1" fill="#228B22" />
    <rect x="10" y="2" width="1" height="1" fill="#228B22" />
    {/* Red body */}
    <rect x="5" y="3" width="6" height="2" fill="#DC143C" />
    <rect x="4" y="5" width="8" height="3" fill="#DC143C" />
    <rect x="5" y="8" width="6" height="2" fill="#DC143C" />
    <rect x="6" y="10" width="4" height="2" fill="#DC143C" />
    <rect x="7" y="12" width="2" height="1" fill="#DC143C" />
    {/* Seeds (yellow dots) */}
    <rect x="6" y="5" width="1" height="1" fill="#FFD700" />
    <rect x="9" y="5" width="1" height="1" fill="#FFD700" />
    <rect x="5" y="7" width="1" height="1" fill="#FFD700" />
    <rect x="7" y="7" width="1" height="1" fill="#FFD700" />
    <rect x="10" y="7" width="1" height="1" fill="#FFD700" />
    <rect x="6" y="9" width="1" height="1" fill="#FFD700" />
    <rect x="9" y="9" width="1" height="1" fill="#FFD700" />
  </PixelFruit>
)

// Orange/Peach: Orange circle
export const PeachIcon = ({ size }: { size?: number }) => (
  <PixelFruit label="Orange" size={size}>
    {/* Stem */}
    <rect x="7" y="1" width="2" height="2" fill="#228B22" />
    {/* Orange body */}
    <rect x="5" y="3" width="6" height="2" fill="#FFA500" />
    <rect x="4" y="5" width="8" height="4" fill="#FFA500" />
    <rect x="5" y="9" width="6" height="2" fill="#FFA500" />
    <rect x="6" y="11" width="4" height="1" fill="#FFA500" />
    {/* Highlight */}
    <rect x="5" y="5" width="2" height="2" fill="#FFB84D" />
  </PixelFruit>
)

// Pretzel: Brown twisted pretzel shape
export const PretzelIcon = ({ size }: { size?: number }) => (
  <PixelFruit label="Pretzel" size={size}>
    {/* Pretzel shape - brown */}
    <rect x="6" y="2" width="4" height="2" fill="#8B4513" />
    <rect x="4" y="4" width="2" height="2" fill="#8B4513" />
    <rect x="10" y="4" width="2" height="2" fill="#8B4513" />
    <rect x="3" y="6" width="2" height="3" fill="#8B4513" />
    <rect x="11" y="6" width="2" height="3" fill="#8B4513" />
    <rect x="4" y="9" width="2" height="2" fill="#8B4513" />
    <rect x="10" y="9" width="2" height="2" fill="#8B4513" />
    <rect x="5" y="11" width="2" height="2" fill="#8B4513" />
    <rect x="9" y="11" width="2" height="2" fill="#8B4513" />
    <rect x="7" y="6" width="2" height="2" fill="#8B4513" />
    {/* Salt highlights */}
    <rect x="5" y="4" width="1" height="1" fill="#F5DEB3" />
    <rect x="10" y="4" width="1" height="1" fill="#F5DEB3" />
    <rect x="7" y="3" width="1" height="1" fill="#F5DEB3" />
  </PixelFruit>
)

// Apple: Red apple with stem
export const AppleIcon = ({ size }: { size?: number }) => (
  <PixelFruit label="Apple" size={size}>
    {/* Stem */}
    <rect x="7" y="1" width="2" height="2" fill="#8B4513" />
    {/* Leaf */}
    <rect x="9" y="1" width="2" height="1" fill="#228B22" />
    <rect x="10" y="2" width="1" height="1" fill="#228B22" />
    {/* Apple body */}
    <rect x="5" y="3" width="6" height="2" fill="#DC143C" />
    <rect x="4" y="5" width="8" height="4" fill="#DC143C" />
    <rect x="5" y="9" width="6" height="2" fill="#DC143C" />
    <rect x="6" y="11" width="4" height="1" fill="#DC143C" />
    {/* Highlight */}
    <rect x="5" y="5" width="2" height="2" fill="#FF6B6B" />
  </PixelFruit>
)

// Pear: Green/yellow pear shape
export const PearIcon = ({ size }: { size?: number }) => (
  <PixelFruit label="Pear" size={size}>
    {/* Stem */}
    <rect x="7" y="1" width="2" height="2" fill="#8B4513" />
    {/* Pear body - narrow top */}
    <rect x="6" y="3" width="4" height="2" fill="#9ACD32" />
    <rect x="5" y="5" width="6" height="2" fill="#9ACD32" />
    <rect x="4" y="7" width="8" height="3" fill="#9ACD32" />
    <rect x="5" y="10" width="6" height="2" fill="#9ACD32" />
    <rect x="6" y="12" width="4" height="1" fill="#9ACD32" />
    {/* Highlight */}
    <rect x="5" y="7" width="2" height="2" fill="#ADFF2F" />
  </PixelFruit>
)

// Banana: Yellow curved banana
export const BananaIcon = ({ size }: { size?: number }) => (
  <PixelFruit label="Banana" size={size}>
    {/* Banana stem */}
    <rect x="10" y="2" width="2" height="2" fill="#8B4513" />
    {/* Banana body - curved */}
    <rect x="8" y="3" width="2" height="2" fill="#FFD700" />
    <rect x="6" y="4" width="3" height="2" fill="#FFD700" />
    <rect x="4" y="5" width="3" height="2" fill="#FFD700" />
    <rect x="3" y="6" width="3" height="2" fill="#FFD700" />
    <rect x="2" y="7" width="3" height="2" fill="#FFD700" />
    <rect x="2" y="9" width="2" height="2" fill="#FFD700" />
    <rect x="3" y="11" width="2" height="1" fill="#8B4513" />
    {/* Highlight */}
    <rect x="7" y="4" width="1" height="1" fill="#FFEC8B" />
    <rect x="5" y="5" width="1" height="1" fill="#FFEC8B" />
    <rect x="3" y="7" width="1" height="1" fill="#FFEC8B" />
  </PixelFruit>
)

// Map fruit keys to their pixel art icons
export const FRUIT_ICONS: Record<FruitKey, ({ size }: { size?: number }) => React.JSX.Element> = {
  cherry: CherryIcon,
  strawberry: StrawberryIcon,
  peach: PeachIcon,
  pretzel: PretzelIcon,
  apple: AppleIcon,
  pear: PearIcon,
  banana: BananaIcon,
}

// Helper component that renders the correct fruit by key
export function FruitIcon({ fruit, size = 24 }: { fruit: FruitKey; size?: number }) {
  const Icon = FRUIT_ICONS[fruit]
  return <Icon size={size} />
}
