import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string
const COINGECKO_KEY = process.env.COINGECKO_KEY || ''

const BASE_URL = 'https://api.coingecko.com/api/v3'

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: COINGECKO_KEY ? {
          'X-CG-Pro-API-Key': COINGECKO_KEY
        } : {}
      })
      if (response.status === 429 && i < retries - 1) {
        await new Promise(res => setTimeout(res, 1000 * (i + 1)))
        continue
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return response
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(res => setTimeout(res, 1000))
    }
  }
  throw new Error('Max retries exceeded')
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env for server function')
      return { statusCode: 500, body: 'Server misconfigured' }
    }

    // Optional: validate Supabase JWT from Authorization header
    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined

    if (!token || !SUPABASE_ANON_KEY) {
      return { statusCode: 401, body: 'Unauthorized' }
    }

    // Validate token using anon client
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token)
    if (userErr || !userData?.user) {
      return { statusCode: 401, body: 'Invalid token' }
    }

    // Fetch latest top market data
    const res = await fetchWithRetry(`${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&locale=en`)
    const coins = await res.json()

    const priceData = (coins as any[]).map((coin) => ({
      symbol: String(coin.symbol || '').toLowerCase(),
      coingecko_id: String(coin.id || ''),
      name: coin.name || '',
      image: coin.image || '',
      price_usd: Number(coin.current_price || 0),
      price_change_24h: Number(coin.price_change_24h || 0),
      price_change_percentage_24h: Number(coin.price_change_percentage_24h || 0),
      market_cap: Number(coin.market_cap || 0),
      volume_24h: Number(coin.total_volume || 0),
      updated_at: new Date().toISOString()
    }))

    // Upsert into Supabase using service role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error } = await supabaseAdmin
      .from('latest_prices')
      .upsert(priceData, { onConflict: 'symbol', ignoreDuplicates: false })

    if (error) {
      console.error('Supabase upsert error', error)
      return { statusCode: 500, body: 'Failed to update prices' }
    }

    return { statusCode: 200, body: JSON.stringify({ updated: priceData.length }) }
  } catch (err: any) {
    console.error('admin-refresh-prices error', err)
    return { statusCode: 500, body: 'Internal Server Error' }
  }
}
