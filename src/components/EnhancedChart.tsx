import { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import 'chartjs-chart-financial';
import { coinGeckoApi } from '@/services/coinGeckoApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, BarChart3, Zap } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface EnhancedChartProps {
  coinId: string;
  coinName: string;
  selectedTimeframe?: string;
  type?: 'sparkline' | 'full' | 'candlestick';
  height?: number;
  showControls?: boolean;
}

interface HistoricalData {
  prices: Array<[number, number]>;
  market_caps: Array<[number, number]>;
  total_volumes: Array<[number, number]>;
}

interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function EnhancedChart({ 
  coinId, 
  coinName, 
  selectedTimeframe = '7d',
  type = 'full',
  height = 400,
  showControls = true
}: EnhancedChartProps) {
  const chartRef = useRef<ChartJS<"line"> | null>(null);
  const [data, setData] = useState<HistoricalData | null>(null);
  const [ohlcData, setOhlcData] = useState<OHLCData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');
  const [timeframe, setTimeframe] = useState(selectedTimeframe);

  const timeframes = [
    { label: '24h', value: '1', days: 1 },
    { label: '7d', value: '7', days: 7 },
    { label: '30d', value: '30', days: 30 },
    { label: '90d', value: '90', days: 90 },
    { label: '1y', value: '365', days: 365 },
  ];

  useEffect(() => {
    fetchChartData();
  }, [coinId, timeframe]);

  const fetchChartData = async () => {
    setIsLoading(true);
    try {
      const days = timeframes.find(tf => tf.value === timeframe)?.days || 7;
      
      // Fetch historical price data
      const historicalData = await coinGeckoApi.getCoinHistory(coinId, days);
      setData(historicalData);

      // For candlestick charts, try to fetch OHLC data
      if (chartType === 'candlestick' && days <= 90) {
        try {
          const ohlcResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`,
            {
              headers: {
                'X-CG-Demo-API-Key': import.meta.env.VITE_COINGECKO_KEY || ''
              }
            }
          );
          
          if (ohlcResponse.ok) {
            const ohlcRawData = await ohlcResponse.json();
            const formattedOHLC: OHLCData[] = ohlcRawData.map((item: number[]) => ({
              timestamp: item[0],
              open: item[1],
              high: item[2],
              low: item[3],
              close: item[4]
            }));
            setOhlcData(formattedOHLC);
          }
        } catch (error) {
          console.warn('OHLC data not available, falling back to line chart');
          setChartType('line');
        }
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getChartData = () => {
    if (!data || !data.prices.length) return null;

    const prices = data.prices.map(price => ({
      x: new Date(price[0]).toISOString(),
      y: price[1]
    }));

    // Determine colors based on price trend
    const firstPrice = data.prices[0][1];
    const lastPrice = data.prices[data.prices.length - 1][1];
    const isPositive = lastPrice >= firstPrice;
    const lineColor = isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
    const fillColor = isPositive 
      ? 'linear-gradient(180deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.01) 100%)'
      : 'linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.01) 100%)';

    return {
      datasets: [
        {
          label: `${coinName} Price (USD)`,
          data: prices,
          borderColor: lineColor,
          backgroundColor: fillColor,
          borderWidth: type === 'sparkline' ? 1 : 2,
          fill: true,
          tension: 0.1,
          pointRadius: type === 'sparkline' ? 0 : 2,
          pointHoverRadius: type === 'sparkline' ? 0 : 6,
          pointBackgroundColor: lineColor,
          pointBorderColor: lineColor,
        },
      ],
    };
  };

  const getChartOptions = (): ChartOptions<'line'> => {
    const baseOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          display: type !== 'sparkline',
          labels: {
            color: 'hsl(var(--muted-foreground))',
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          enabled: type !== 'sparkline',
          backgroundColor: 'hsl(var(--popover))',
          titleColor: 'hsl(var(--popover-foreground))',
          bodyColor: 'hsl(var(--popover-foreground))',
          borderColor: 'hsl(var(--border))',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `Price: $${context.parsed.y.toLocaleString()}`;
            },
            labelTextColor: function() {
              return 'hsl(var(--popover-foreground))';
            }
          }
        },
      },
      scales: {
        x: {
          type: 'time',
          display: type !== 'sparkline',
          grid: {
            display: type !== 'sparkline',
            color: 'hsl(var(--border))',
          },
          ticks: {
            color: 'hsl(var(--muted-foreground))',
            font: {
              size: 11,
            },
          },
        },
        y: {
          display: type !== 'sparkline',
          grid: {
            display: type !== 'sparkline',
            color: 'hsl(var(--border))',
          },
          ticks: {
            color: 'hsl(var(--muted-foreground))',
            font: {
              size: 11,
            },
            callback: function(value) {
              return `$${Number(value).toLocaleString()}`;
            },
          },
        },
      },
      elements: {
        point: {
          hoverBackgroundColor: 'hsl(var(--primary))',
          hoverBorderColor: 'hsl(var(--primary))',
        },
      },
    };

    return baseOptions;
  };

  const chartData = getChartData();

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center bg-muted/30 rounded-lg"
        style={{ height: `${height}px` }}
      >
        <div className="animate-pulse text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  if (!chartData || !data) {
    return (
      <div 
        className="flex items-center justify-center bg-muted/30 rounded-lg"
        style={{ height: `${height}px` }}
      >
        <div className="text-muted-foreground">No data available</div>
      </div>
    );
  }

  // Sparkline version (minimal)
  if (type === 'sparkline') {
    return (
      <div style={{ height: `${height}px`, width: '100%' }}>
        <Line
          ref={chartRef}
          data={chartData}
          options={getChartOptions()}
        />
      </div>
    );
  }

  // Full version with controls
  return (
    <div className="space-y-4">
      {showControls && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(tf.value)}
                className={timeframe === tf.value ? "bg-gradient-primary" : ""}
              >
                {tf.label}
              </Button>
            ))}
          </div>
          
          <Tabs value={chartType} onValueChange={(value) => setChartType(value as 'line' | 'candlestick')}>
            <TabsList className="grid w-48 grid-cols-2">
              <TabsTrigger value="line" className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Line
              </TabsTrigger>
              <TabsTrigger value="candlestick" className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                Candlestick
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div style={{ height: `${height}px`, width: '100%' }}>
        {chartType === 'line' ? (
          <Line
            ref={chartRef}
            data={chartData}
            options={getChartOptions()}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Candlestick charts coming soon
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                OHLC data is limited for free API tier
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chart Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="space-y-1">
          <p className="text-muted-foreground">High</p>
          <p className="font-medium">
            ${Math.max(...data.prices.map(p => p[1])).toLocaleString()}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Low</p>
          <p className="font-medium">
            ${Math.min(...data.prices.map(p => p[1])).toLocaleString()}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Volume</p>
          <p className="font-medium">
            ${(data.total_volumes[data.total_volumes.length - 1][1] / 1e6).toFixed(2)}M
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Change</p>
          <p className={`font-medium ${
            data.prices[data.prices.length - 1][1] >= data.prices[0][1] 
              ? 'text-crypto-gain' : 'text-crypto-loss'
          }`}>
            {((data.prices[data.prices.length - 1][1] / data.prices[0][1] - 1) * 100).toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}
