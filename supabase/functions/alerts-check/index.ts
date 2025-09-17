import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Alert {
  id: string;
  user_id: string;
  symbol: string;
  name?: string;
  direction: 'above' | 'below';
  target_price: number;
  condition_type: string;
  priority: string;
  active: boolean;
  recurring: boolean;
  recurring_interval?: string;
  notification_methods: string[];
  created_at: string;
  triggered_at?: string;
}

interface PriceData {
  symbol: string;
  price_usd: number;
  name: string;
  image?: string;
  price_change_percentage_24h: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🚨 Starting alerts check...')

    // Get all active alerts with current prices
    const { data: alertsWithPrices, error: fetchError } = await supabase
      .from('alerts')
      .select(`
        *,
        latest_prices!inner(
          price_usd,
          name,
          image,
          price_change_percentage_24h
        )
      `)
      .eq('active', true)
      .is('triggered_at', null)

    if (fetchError) {
      console.error('❌ Error fetching alerts:', fetchError)
      throw new Error(`Database error: ${fetchError.message}`)
    }

    if (!alertsWithPrices || alertsWithPrices.length === 0) {
      console.log('ℹ️ No active alerts to check')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active alerts to check',
          triggered_count: 0,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    console.log(`📋 Checking ${alertsWithPrices.length} active alerts`)

    const triggeredAlerts: any[] = []
    const notificationsToCreate: any[] = []

    // Check each alert
    for (const alert of alertsWithPrices) {
      const priceData = alert.latest_prices as PriceData
      const currentPrice = priceData.price_usd
      
      console.log(`🔍 Checking alert ${alert.id}: ${alert.symbol} ${alert.direction} $${alert.target_price}, current: $${currentPrice}`)

      let shouldTrigger = false

      // Check different condition types
      switch (alert.condition_type) {
        case 'price':
          if (alert.direction === 'above' && currentPrice >= alert.target_price) {
            shouldTrigger = true
          } else if (alert.direction === 'below' && currentPrice <= alert.target_price) {
            shouldTrigger = true
          }
          break
          
        case 'price_change':
          // For price change percentage alerts, target_price represents the percentage
          const currentChange = priceData.price_change_percentage_24h
          if (alert.direction === 'above' && currentChange >= alert.target_price) {
            shouldTrigger = true
          } else if (alert.direction === 'below' && currentChange <= alert.target_price) {
            shouldTrigger = true
          }
          break
          
        // Add more condition types as needed
        default:
          console.log(`⚠️ Unsupported condition type: ${alert.condition_type}`)
          continue
      }

      if (shouldTrigger) {
        console.log(`🚨 TRIGGERED: Alert ${alert.id} for ${alert.symbol}`)
        
        triggeredAlerts.push({
          id: alert.id,
          symbol: alert.symbol,
          name: alert.name || priceData.name,
          direction: alert.direction,
          target_price: alert.target_price,
          current_price: currentPrice,
          condition_type: alert.condition_type,
          user_id: alert.user_id,
          priority: alert.priority || 'medium'
        })

        // Prepare notification message based on condition type
        let notificationTitle = ''
        let notificationMessage = ''
        
        switch (alert.condition_type) {
          case 'price':
            notificationTitle = `${alert.name || alert.symbol.toUpperCase()} Price Alert`
            notificationMessage = `${alert.name || alert.symbol.toUpperCase()} has ${
              alert.direction === 'above' ? 'reached' : 'dropped to'
            } $${currentPrice.toLocaleString()} (target: $${alert.target_price.toLocaleString()})`
            break
            
          case 'price_change':
            notificationTitle = `${alert.name || alert.symbol.toUpperCase()} Price Change Alert`
            const changeText = priceData.price_change_percentage_24h >= 0 ? 'gained' : 'lost'
            notificationMessage = `${alert.name || alert.symbol.toUpperCase()} has ${changeText} ${Math.abs(priceData.price_change_percentage_24h).toFixed(2)}% in 24h (target: ${alert.target_price}%)`
            break
            
          default:
            notificationTitle = `${alert.name || alert.symbol.toUpperCase()} Alert Triggered`
            notificationMessage = `Your alert for ${alert.name || alert.symbol.toUpperCase()} has been triggered`
        }

        // Create notification record
        notificationsToCreate.push({
          user_id: alert.user_id,
          type: 'alert_triggered',
          title: notificationTitle,
          message: notificationMessage,
          payload: {
            alert_id: alert.id,
            symbol: alert.symbol,
            name: alert.name || priceData.name,
            current_price: currentPrice,
            target_price: alert.target_price,
            direction: alert.direction,
            condition_type: alert.condition_type,
            priority: alert.priority || 'medium',
            image: priceData.image
          },
          read: false,
          created_at: new Date().toISOString()
        })
      }
    }

    console.log(`🎯 Found ${triggeredAlerts.length} alerts to trigger`)

    if (triggeredAlerts.length > 0) {
      // Update triggered alerts in database
      const updatePromises = triggeredAlerts.map(alert => {
        const shouldDeactivate = !alertsWithPrices.find(a => a.id === alert.id)?.recurring
        
        return supabase
          .from('alerts')
          .update({
            active: shouldDeactivate ? false : true, // Keep active if recurring
            triggered_at: new Date().toISOString(),
            current_price: alert.current_price,
            updated_at: new Date().toISOString()
          })
          .eq('id', alert.id)
      })

      const updateResults = await Promise.allSettled(updatePromises)
      
      // Check for update errors
      updateResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ Failed to update alert ${triggeredAlerts[index].id}:`, result.reason)
        }
      })

      // Insert notifications
      if (notificationsToCreate.length > 0) {
        console.log(`📢 Creating ${notificationsToCreate.length} notifications`)
        
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationsToCreate)

        if (notificationError) {
          console.error('❌ Error creating notifications:', notificationError)
          // Don't throw here, alerts were still processed
        } else {
          console.log('✅ Notifications created successfully')
        }
      }

      // Log summary of triggered alerts by priority
      const prioritySummary = triggeredAlerts.reduce((acc, alert) => {
        acc[alert.priority] = (acc[alert.priority] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log('📊 Triggered alerts by priority:', prioritySummary)
    }

    // Return success response
    const result = {
      success: true,
      alerts_checked: alertsWithPrices.length,
      alerts_triggered: triggeredAlerts.length,
      notifications_created: notificationsToCreate.length,
      triggered_alerts: triggeredAlerts.map(alert => ({
        symbol: alert.symbol,
        name: alert.name,
        direction: alert.direction,
        target_price: alert.target_price,
        current_price: alert.current_price,
        condition_type: alert.condition_type,
        priority: alert.priority
      })),
      timestamp: new Date().toISOString()
    }

    console.log('🎉 Alerts check completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('💥 Alerts check error:', error)
    
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
