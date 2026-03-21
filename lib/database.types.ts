import { FruitKey } from './constants'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Level fruits structure for JSONB column
// Keys are level numbers as strings, values are [fruit1, fruit2] tuples
export type LevelFruitsJson = Record<string, [FruitKey | null, FruitKey | null]>

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          id: string
          player_id: string
          score: number
          level: number
          level_fruits: LevelFruitsJson | null
          features: string[]
          logged_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          score: number
          level: number
          level_fruits?: LevelFruitsJson | null
          features?: string[]
          logged_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          score?: number
          level?: number
          level_fruits?: LevelFruitsJson | null
          features?: string[]
          logged_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'scores_player_id_fkey'
            columns: ['player_id']
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'scores_logged_by_fkey'
            columns: ['logged_by']
            referencedRelation: 'players'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
