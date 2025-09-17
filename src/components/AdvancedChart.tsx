import React, { useEffect, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import {
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement,
} from 'chartjs-chart-financial'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCoinHistory, useCoinOHLC } from '@/hooks/useCryptoData'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement
)

interface AdvancedChartProps {
  coinId: string
  coinName: string
  isTop10: boolean
  className?: string
}

type TimeframeOption = {
  label: string
  value: string
  days: number
}

const timeframes: TimeframeOption[] = [
  { label: '24H', value: '24h', days: 1 },
  { label: '7D', value: '7d', days: 7 },
  { label: '30D', value: '30d', days: 30 },
  { label: '90D', value: '90d', days: 90 },
  { label: '1Y', value: '1y', days: 365 },
]

type ChartType = 'line' | 'candlestick'

export function AdvancedChart({ coinId, coinName, isTop10, className }: AdvancedChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>(timeframes[1]) // Default 7D
  const [chartType, setChartType] = useState<ChartType>('line')
  
  const { history, isLoading: historyLoading, error: historyError } = useCoinHistory(
    coinId,
    selectedTimeframe.days
  )
  
  const { ohlc, isLoading: ohlcLoading, error: ohlcError } = useCoinOHLC(
    isTop10 && chartType === 'candlestick' ? coinId : null,
    selectedTimeframe.days
  )

  // For non-top10 coins, show sparkline only
  if (!isTop10) {
    return (
      <Card className={`bg-gradient-card border-border/50 ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{coinName} Price</CardTitle>
            <Badge variant="outline" className="text-xs">
              Details Only
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              Advanced charts are available for Top 10 coins only.
            </p>
            <p className="text-xs mt-2">
              View market data and details instead.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show loading state
  if (historyLoading || (chartType === 'candlestick' && ohlcLoading)) {
    return (
      <Card className={`bg-gradient-card border-border/50 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {coinName} Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (historyError || (chartType === 'candlestick' && ohlcError)) {
    return (
      <Card className={`bg-gradient-card border-border/50 ${className}`}>
        <CardHeader>
          <CardTitle className="text-destructive">Chart Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load chart data. Please try again later.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Prepare line chart data
  const lineChartData = history ? {
    labels: history.prices.map(([timestamp]) => new Date(timestamp)),
    datasets: [
      {
        label: `${coinName} Price`,
        data: history.prices.map(([, price]) => price),
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsla(var(--primary), 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: 'hsl(var(--primary))',
        pointBorderColor: 'hsl(var(--background))',
        pointBorderWidth: 2,
      },
    ],
  } : null

  // Prepare candlestick data
  const candlestickData = ohlc ? {
    datasets: [
      {
        label: `${coinName} OHLC`,
        data: ohlc.map(([timestamp, open, high, low, close]) => ({
          x: timestamp,
          o: open,
          h: high,
          l: low,
          c: close,
        })),
        borderColor: {
          up: 'hsl(var(--crypto-gain))',
          down: 'hsl(var(--crypto-loss))',
          unchanged: 'hsl(var(--muted-foreground))',
        },
        backgroundColor: {
          up: 'hsla(var(--crypto-gain), 0.8)',
          down: 'hsla(var(--crypto-loss), 0.8)',
          unchanged: 'hsla(var(--muted-foreground), 0.8)',
        },
        borderWidth: 1,
      },
    ],
  } : null

  const chartOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'hsl(var(--popover))',
        titleColor: 'hsl(var(--popover-foreground))',
        bodyColor: 'hsl(var(--popover-foreground))',
        borderColor: 'hsl(var(--border))',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context: TooltipItem<any>[]) {
            if (context[0]) {
              const date = new Date(context[0].parsed.x)
              return date.toLocaleString()
            }
            return ''
          },
          label: function(context: TooltipItem<any>) {
            if (chartType === 'candlestick') {
              const data = context.raw as any
              return [
                `Open: $${data.o?.toFixed(6) || 'N/A'}`,
                `High: $${data.h?.toFixed(6) || 'N/A'}`,
                `Low: $${data.l?.toFixed(6) || 'N/A'}`,
                `Close: $${data.c?.toFixed(6) || 'N/A'}`,
              ]
            } else {
              return `Price: $${context.parsed.y?.toFixed(6) || 'N/A'}`
            }
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: selectedTimeframe.days <= 1 ? 'hour' : selectedTimeframe.days <= 7 ? 'day' : 'week',
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM dd',
            week: 'MMM dd',
          },
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          font: {
            size: 11,
          },
        },
        grid: {
          color: 'hsla(var(--border), 0.3)',
        },
      },
      y: {
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          font: {
            size: 11,
          },
          callback: function(value: any) {
            return `$${Number(value).toFixed(2)}`
          },
        },
        grid: {
          color: 'hsla(var(--border), 0.3)',
        },
      },
    },
  }

  // Calculate price change
  const priceChange = history && history.prices.length > 1
    ? history.prices[history.prices.length - 1][1] - history.prices[0][1]
    : 0
  const priceChangePercent = history && history.prices.length > 1
    ? (priceChange / history.prices[0][1]) * 100
    : 0
  const isPositiveChange = priceChange >= 0

  return (
    <Card className={`bg-gradient-card border-border/50 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {coinName}
            </CardTitle>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Top 10
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {isPositiveChange ? (
              <TrendingUp className="w-4 h-4 text-crypto-gain" />
            ) : (
              <TrendingDown className="w-4 h-4 text-crypto-loss" />
            )}
            <span className={`text-sm font-medium ${isPositiveChange ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
              {priceChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {/* Chart Type Selector - Only for Top 10 */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={chartType === 'line' ? 'default' : 'outline'}
              onClick={() => setChartType('line')}
              className="h-8 px-3 text-xs"
            >
              Line
            </Button>
            <Button
              size="sm"
              variant={chartType === 'candlestick' ? 'default' : 'outline'}
              onClick={() => setChartType('candlestick')}
              className="h-8 px-3 text-xs"
            >
              Candles
            </Button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-1">
            {timeframes.map((timeframe) => (
              <Button
                key={timeframe.value}
                size="sm"
                variant={selectedTimeframe.value === timeframe.value ? 'default' : 'outline'}
                onClick={() => setSelectedTimeframe(timeframe)}
                className="h-8 px-3 text-xs"
              >
                {timeframe.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-64 w-full">
          {chartType === 'line' && lineChartData ? (
            <Line data={lineChartData} options={chartOptions} />
          ) : chartType === 'candlestick' && candlestickData ? (
            <Line data={candlestickData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>No chart data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Lightweight sparkline component for use in cards
interface SparklineProps {
  data: number[]
  className?: string
  color?: string
}

export function Sparkline({ data, className, color = 'hsl(var(--primary))' }: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = width * 2 // For retina displays
    canvas.height = height * 2
    ctx.scale(2, 2)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Find min/max for scaling
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    // Draw sparkline
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    data.forEach((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * height
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Add subtle fill
    ctx.globalAlpha = 0.1
    ctx.fillStyle = color
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()
  }, [data, color])

  if (data.length === 0) return null

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
