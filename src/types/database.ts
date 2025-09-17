export interface Database {
  public: {
    Tables: {
      portfolio: {
        Row: {
          id: string
          user_id: string
          coin_id: string
          amount: number
          avg_price: number
          asset_type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          coin_id: string
          amount: number
          avg_price: number
          asset_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          coin_id?: string
          amount?: number
          avg_price?: number
          asset_type?: string
          created_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          coin_id: string
          direction: 'above' | 'below'
          target_price: number
          active: boolean
          created_at: string
          triggered_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          coin_id: string
          direction: 'above' | 'below'
          target_price: number
          active?: boolean
          created_at?: string
          triggered_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          coin_id?: string
          direction?: 'above' | 'below'
          target_price?: number
          active?: boolean
          created_at?: string
          triggered_at?: string | null
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          coin_id: string
          type: 'buy' | 'sell'
          amount: number
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          coin_id: string
          type: 'buy' | 'sell'
          amount: number
          price: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          coin_id?: string
          type?: 'buy' | 'sell'
          amount?: number
          price?: number
          created_at?: string
        }
      }
      wallet: {
        Row: {
          id: string
          user_id: string
          balance: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          created_at?: string
        }
      }
      preferences: {
        Row: {
          id: string
          user_id: string
          theme: string
          currency: string
          refresh_rate: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: string
          currency?: string
          refresh_rate?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme?: string
          currency?: string
          refresh_rate?: number
          created_at?: string
        }
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
