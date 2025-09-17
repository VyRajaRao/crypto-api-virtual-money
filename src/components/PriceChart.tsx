import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { coinGeckoApi } from '@/services/coinGeckoApi'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface PriceChartProps {
  coinId: string
  coinName: string
  selectedTimeframe: string
}

const timeframes = [
  { label: '24h', value: '24h', days: 1 },
  { label: '7d', value: '7d', days: 7 },
  { label: '30d', value: '30d', days: 30 }
]

export function PriceChart({ coinId, coinName, selectedTimeframe }: PriceChartProps) {
  const [chartData, setChartData] = useState<Array<{ time: string; price: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChartData = async () => {
      if (!coinId) return
      
      setLoading(true)
      setError(null)

      try {
        const timeframe = timeframes.find(t => t.value === selectedTimeframe) || timeframes[0]
        const historyData = await coinGeckoApi.getCoinHistory(coinId, timeframe.days)
        
        const formattedData = historyData.prices.map(([timestamp, price]) => ({
          time: new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            ...(timeframe.days <= 1 ? { hour: '2-digit' } : {})
          }),
          price: parseFloat(price.toFixed(6))
        }))

        setChartData(formattedData)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load chart data')
        console.error('Chart data error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [coinId, selectedTimeframe])

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>{coinName} Price Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>{coinName} Price Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const firstPrice = chartData[0]?.price || 0
  const lastPrice = chartData[chartData.length - 1]?.price || 0
  const priceChange = lastPrice - firstPrice
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0
  const isPositive = priceChange >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {coinName} Price Chart
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-crypto-gain" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-crypto-loss" />
                )}
                <span className={`text-sm font-medium ${isPositive ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                  {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
                </span>
              </div>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - dataMin * 0.01', 'dataMax + dataMax * 0.01']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [
                    `$${value.toLocaleString()}`,
                    'Price'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={isPositive ? 'hsl(var(--crypto-gain))' : 'hsl(var(--crypto-loss))'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
