# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ms. Pac-Man Score Logger - a mobile-responsive web app for friends & family to log Ms. Pac-Man arcade game scores. Built with Next.js 16, targeting Vercel deployment with Supabase backend (not yet integrated).

## Commands

```bash
npm run dev    # Start development server at localhost:3000
npm run build  # Production build
npm run start  # Start production server
npm run lint   # Run ESLint
```

## Architecture

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript

**Key Directories:**
- `app/` - Next.js App Router pages and layouts
- `components/` - React components (all use 'use client' directive)
- `lib/` - Shared utilities, types, and constants

**Data Flow:**
- All game data (fruits, mazes, levels, features) defined in `lib/constants.ts`
- State managed in `app/page.tsx` using React hooks
- Components are controlled - receive state via props, emit changes via callbacks

## Domain Knowledge

**Ms. Pac-Man Level System:**
- Levels 1-7: Fixed fruits (Cherry→Strawberry→Peach→Pretzel→Apple→Pear→Banana)
- Levels 8+: Random fruit selection required from user
- Mazes: A (Pink, 1-2), B (Light Blue, 3-5), C (Orange, 6-9), D (Dark Blue, 10-13), then C/D alternate every 4 levels
- Use `getMaze(level)` in `lib/constants.ts` to calculate maze from level number

**Level Selector Tiers:**
- Tier 1: Levels 1-7 + "8+?" button (default view)
- Tier 2: Levels 8-20 + "21+?" button (expanded)
- Tier 3: Levels 21-136 (full expansion)

**Validation:** Submit requires player + score + level + fruit (if level >= 8)

## Design System

- Dark theme: Background #1a1a2e, Primary #FFD700 (yellow), Secondary #FF69B4 (pink)
- Maze colors: A=#FFB6C1, B=#87CEEB, C=#FFA500, D=#4169E1
- CSS custom properties defined in `app/globals.css`
- Selected elements have yellow glow effect

## Current Status

Phase 2-3 complete (static UI + interactivity). Next: GitHub setup, Vercel deployment, Supabase integration.
