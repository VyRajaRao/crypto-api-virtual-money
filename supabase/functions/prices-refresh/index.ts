import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: any;
  last_updated: string;
}

// Symbol to CoinGecko ID mapping
const SYMBOL_MAP: Record<string, string> = {
  'btc': 'bitcoin',
  'eth': 'ethereum',
  'sol': 'solana',
  'ada': 'cardano',
  'dot': 'polkadot',
  'matic': 'matic-network',
  'avax': 'avalanche-2',
  'atom': 'cosmos',
  'link': 'chainlink',
  'xrp': 'ripple',
  'ltc': 'litecoin',
  'bch': 'bitcoin-cash',
  'xlm': 'stellar',
  'algo': 'algorand',
  'vet': 'vechain',
  'theta': 'theta-token',
  'tfuel': 'theta-fuel',
  'eos': 'eos',
  'tron': 'tron',
  'ksm': 'kusama'
};

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

    console.log('🚀 Starting price refresh...')

    // Get symbols that are currently in use (from portfolios and alerts)
    const { data: portfolioSymbols } = await supabase
      .from('portfolios')
      .select('symbol')
      .gt('amount', 0)

    const { data: alertSymbols } = await supabase
      .from('alerts')
      .select('symbol')
      .eq('active', true)

    // Combine and deduplicate symbols
    const allSymbols = new Set<string>()
    portfolioSymbols?.forEach(p => p.symbol && allSymbols.add(p.symbol.toLowerCase()))
    alertSymbols?.forEach(a => a.symbol && allSymbols.add(a.symbol.toLowerCase()))
    
    // Add default symbols if none found
    if (allSymbols.size === 0) {
      ['btc', 'eth', 'sol', 'ada', 'dot'].forEach(symbol => allSymbols.add(symbol))
    }

    console.log(`📊 Fetching prices for symbols: ${Array.from(allSymbols).join(', ')}`)

    // Map symbols to CoinGecko IDs
    const coinGeckoIds = Array.from(allSymbols)
      .map(symbol => SYMBOL_MAP[symbol])
      .filter(id => id)
      .join(',')

    if (!coinGeckoIds) {
      throw new Error('No valid CoinGecko IDs found')
    }

    // Fetch prices from CoinGecko
    const coingeckoUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinGeckoIds}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`
    
    console.log(`🌐 Fetching from CoinGecko: ${coingeckoUrl}`)
    
    const response = await fetch(coingeckoUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CryptoVault/1.0'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ CoinGecko API error: ${response.status} - ${errorText}`)
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const pricesData: CoinGeckoPrice[] = await response.json()
    console.log(`✅ Fetched ${pricesData.length} price records`)

    if (pricesData.length === 0) {
      throw new Error('No price data received from CoinGecko')
    }

    // Prepare data for database insert
    const priceRecords = pricesData.map(coin => {
      // Find the symbol for this coin
      const symbol = Object.keys(SYMBOL_MAP).find(key => SYMBOL_MAP[key] === coin.id) || coin.symbol.toLowerCase()
      
      return {
        symbol: symbol,
        coingecko_id: coin.id,
        name: coin.name,
        image: coin.image,
        price_usd: coin.current_price,
        price_change_24h: coin.price_change_24h || 0,
        price_change_percentage_24h: coin.price_change_percentage_24h || 0,
        market_cap: coin.market_cap || 0,
        volume_24h: coin.total_volume || 0,
        updated_at: new Date().toISOString()
      }
    })

    console.log(`💾 Upserting ${priceRecords.length} price records to database`)

    // Upsert prices to database
    const { error: upsertError } = await supabase
      .from('latest_prices')
      .upsert(priceRecords, { 
        onConflict: 'symbol',
        ignoreDuplicates: false 
      })

    if (upsertError) {
      console.error('❌ Database upsert error:', upsertError)
      throw new Error(`Database error: ${upsertError.message}`)
    }

    console.log('✅ Price records upserted successfully')

    // Update portfolio values with new prices
    console.log('📈 Updating portfolio values...')
    const { error: updateError } = await supabase.rpc('update_portfolio_values')
    
    if (updateError) {
      console.error('⚠️ Portfolio update error:', updateError)
      // Don't throw here, as price updates were successful
    } else {
      console.log('✅ Portfolio values updated')
    }

    // Return success response
    const result = {
      success: true,
      updated_symbols: priceRecords.map(p => p.symbol),
      count: priceRecords.length,
      timestamp: new Date().toISOString()
    }

    console.log('🎉 Price refresh completed successfully:', result)

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
    console.error('💥 Price refresh error:', error)
    
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
