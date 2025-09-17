import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

// Portfolio hooks
export function usePortfolio() {
  const { user } = useAuth()
  
  const { data, error, isLoading } = useSWR(
    user ? `portfolio-${user.id}` : null,
    async () => {
      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 60000 // Refresh every minute
    }
  )

  const addToPortfolio = async (coinId: string, amount: number, avgPrice: number) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('portfolio')
      .insert({
        user_id: user.id,
        coin_id: coinId,
        amount,
        avg_price: avgPrice,
        asset_type: 'crypto'
      })

    if (error) {
      console.error('Portfolio add error:', error)
      toast.error('Failed to add to portfolio')
      throw error
    }

    toast.success('Added to portfolio')
    mutate(`portfolio-${user.id}`)
  }

  const updatePortfolioItem = async (id: string, updates: { amount?: number; avg_price?: number }) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('portfolio')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Portfolio update error:', error)
      toast.error('Failed to update portfolio')
      throw error
    }

    toast.success('Portfolio updated')
    mutate(`portfolio-${user.id}`)
  }

  const removeFromPortfolio = async (id: string) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('portfolio')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Portfolio remove error:', error)
      toast.error('Failed to remove from portfolio')
      throw error
    }

    toast.success('Removed from portfolio')
    mutate(`portfolio-${user.id}`)
  }

  return {
    portfolio: data || [],
    error,
    isLoading,
    addToPortfolio,
    updatePortfolioItem,
    removeFromPortfolio
  }
}

// Alerts hooks
export function useAlerts() {
  const { user } = useAuth()
  
  const { data, error, isLoading } = useSWR(
    user ? `alerts-${user.id}` : null,
    async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 120000 // Refresh every 2 minutes
    }
  )

  const createAlert = async (coinId: string, direction: 'above' | 'below', targetPrice: number) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('alerts')
      .insert({
        user_id: user.id,
        coin_id: coinId,
        direction,
        target_price: targetPrice,
        active: true
      })

    if (error) {
      console.error('Alert create error:', error)
      toast.error('Failed to create alert')
      throw error
    }

    toast.success('Alert created')
    mutate(`alerts-${user.id}`)
  }

  const toggleAlert = async (id: string, active: boolean) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('alerts')
      .update({ active })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Alert toggle error:', error)
      toast.error('Failed to update alert')
      throw error
    }

    toast.success(active ? 'Alert activated' : 'Alert deactivated')
    mutate(`alerts-${user.id}`)
  }

  const deleteAlert = async (id: string) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Alert delete error:', error)
      toast.error('Failed to delete alert')
      throw error
    }

    toast.success('Alert deleted')
    mutate(`alerts-${user.id}`)
  }

  return {
    alerts: data || [],
    error,
    isLoading,
    createAlert,
    toggleAlert,
    deleteAlert
  }
}

// Trading hooks
export function useWallet() {
  const { user } = useAuth()
  
  const { data, error, isLoading } = useSWR(
    user ? `wallet-${user.id}` : null,
    async () => {
      const { data, error } = await supabase
        .from('wallet')
        .select('*')
        .eq('user_id', user!.id)
        .single()
      
      if (error) {
        // Create wallet if it doesn't exist
        if (error.code === 'PGRST116') {
          const { data: newWallet, error: createError } = await supabase
            .from('wallet')
            .insert({
              user_id: user!.id,
              balance: 100000.00, // $100k starting balance
              currency: 'USD'
            })
            .select()
            .single()
          
          if (createError) throw createError
          return newWallet
        }
        throw error
      }
      return data
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 30000 // Refresh every 30 seconds
    }
  )

  return {
    wallet: data,
    error,
    isLoading,
    balance: data?.balance || 0
  }
}

export function useTrades() {
  const { user } = useAuth()
  
  const { data, error, isLoading } = useSWR(
    user ? `trades-${user.id}` : null,
    async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100) // Last 100 trades
      
      if (error) throw error
      return data
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 30000 // Refresh every 30 seconds
    }
  )

  const executeTrade = async (coinId: string, type: 'buy' | 'sell', amount: number, price: number) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        coin_id: coinId,
        type,
        amount,
        price
      })

    if (error) {
      console.error('Trade execution error:', error)
      toast.error('Failed to execute trade')
      throw error
    }

    toast.success(`${type.toUpperCase()} order executed`)
    mutate(`trades-${user.id}`)
    mutate(`wallet-${user.id}`)
  }

  return {
    trades: data || [],
    error,
    isLoading,
    executeTrade
  }
}

// Preferences hooks
export function usePreferences() {
  const { user } = useAuth()
  
  const { data, error, isLoading } = useSWR(
    user ? `preferences-${user.id}` : null,
    async () => {
      const { data, error } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user!.id)
        .single()
      
      if (error) {
        // Create preferences if they don't exist
        if (error.code === 'PGRST116') {
          const { data: newPrefs, error: createError } = await supabase
            .from('preferences')
            .insert({
              user_id: user!.id,
              theme: 'dark',
              currency: 'usd',
              refresh_rate: 60,
              notifications_enabled: true
            })
            .select()
            .single()
          
          if (createError) throw createError
          return newPrefs
        }
        throw error
      }
      return data
    },
    {
      revalidateOnFocus: false
    }
  )

  const updatePreferences = async (updates: {
    theme?: string
    currency?: string
    refresh_rate?: number
    notifications_enabled?: boolean
  }) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('preferences')
      .update(updates)
      .eq('user_id', user.id)

    if (error) {
      console.error('Preferences update error:', error)
      toast.error('Failed to update preferences')
      throw error
    }

    toast.success('Preferences updated')
    mutate(`preferences-${user.id}`)
  }

  return {
    preferences: data,
    error,
    isLoading,
    updatePreferences
  }
}

// Pending orders hooks
export function usePendingOrders() {
  const { user } = useAuth()
  
  const { data, error, isLoading } = useSWR(
    user ? `pending-orders-${user.id}` : null,
    async () => {
      const { data, error } = await supabase
        .from('pending_orders')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 30000 // Refresh every 30 seconds
    }
  )

  const createLimitOrder = async (coinId: string, type: 'buy' | 'sell', amount: number, price: number) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('pending_orders')
      .insert({
        user_id: user.id,
        coin_id: coinId,
        type,
        amount,
        price,
        status: 'pending'
      })

    if (error) {
      console.error('Limit order error:', error)
      toast.error('Failed to create limit order')
      throw error
    }

    toast.success('Limit order created')
    mutate(`pending-orders-${user.id}`)
  }

  const cancelOrder = async (id: string) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('pending_orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Cancel order error:', error)
      toast.error('Failed to cancel order')
      throw error
    }

    toast.success('Order cancelled')
    mutate(`pending-orders-${user.id}`)
  }

  return {
    pendingOrders: data || [],
    error,
    isLoading,
    createLimitOrder,
    cancelOrder
  }
}
