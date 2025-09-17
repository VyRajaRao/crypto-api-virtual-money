import { RSI, SMA, MACD, EMA } from 'technicalindicators';

export interface PriceData {
  timestamp: number;
  price: number;
}

export interface TechnicalIndicators {
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  macd: {
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  };
}

export interface IndicatorAnalysis {
  rsiAnalysis: 'overbought' | 'oversold' | 'neutral';
  trendAnalysis: 'bullish' | 'bearish' | 'neutral';
  macdAnalysis: 'bullish' | 'bearish' | 'neutral';
  overallSignal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
}

/**
 * Calculate RSI (Relative Strength Index)
 * RSI > 70: Overbought
 * RSI < 30: Oversold
 */
export function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;
  
  try {
    const rsiValues = RSI.calculate({
      values: prices,
      period: period
    });
    
    return rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
  } catch (error) {
    console.error('Error calculating RSI:', error);
    return null;
  }
}

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  
  try {
    const smaValues = SMA.calculate({
      values: prices,
      period: period
    });
    
    return smaValues.length > 0 ? smaValues[smaValues.length - 1] : null;
  } catch (error) {
    console.error('Error calculating SMA:', error);
    return null;
  }
}

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  
  try {
    const emaValues = EMA.calculate({
      values: prices,
      period: period
    });
    
    return emaValues.length > 0 ? emaValues[emaValues.length - 1] : null;
  } catch (error) {
    console.error('Error calculating EMA:', error);
    return null;
  }
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): { macd: number | null; signal: number | null; histogram: number | null } {
  if (prices.length < slowPeriod + signalPeriod) {
    return { macd: null, signal: null, histogram: null };
  }
  
  try {
    const macdValues = MACD.calculate({
      values: prices,
      fastPeriod: fastPeriod,
      slowPeriod: slowPeriod,
      signalPeriod: signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    
    if (macdValues.length === 0) {
      return { macd: null, signal: null, histogram: null };
    }
    
    const latest = macdValues[macdValues.length - 1];
    return {
      macd: latest.MACD || null,
      signal: latest.signal || null,
      histogram: latest.histogram || null
    };
  } catch (error) {
    console.error('Error calculating MACD:', error);
    return { macd: null, signal: null, histogram: null };
  }
}

/**
 * Calculate all technical indicators for a given price series
 */
export function calculateAllIndicators(priceData: PriceData[]): TechnicalIndicators {
  const prices = priceData.map(d => d.price);
  
  return {
    rsi: calculateRSI(prices, 14),
    sma20: calculateSMA(prices, 20),
    sma50: calculateSMA(prices, 50),
    sma200: calculateSMA(prices, 200),
    ema12: calculateEMA(prices, 12),
    ema26: calculateEMA(prices, 26),
    macd: calculateMACD(prices, 12, 26, 9)
  };
}

/**
 * Analyze technical indicators to provide trading signals
 */
export function analyzeTechnicalIndicators(
  indicators: TechnicalIndicators,
  currentPrice: number
): IndicatorAnalysis {
  // RSI Analysis
  let rsiAnalysis: 'overbought' | 'oversold' | 'neutral' = 'neutral';
  if (indicators.rsi !== null) {
    if (indicators.rsi > 70) rsiAnalysis = 'overbought';
    else if (indicators.rsi < 30) rsiAnalysis = 'oversold';
  }

  // Trend Analysis (using moving averages)
  let trendAnalysis: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (indicators.sma20 !== null && indicators.sma50 !== null) {
    if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
      trendAnalysis = 'bullish';
    } else if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
      trendAnalysis = 'bearish';
    }
  }

  // MACD Analysis
  let macdAnalysis: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (indicators.macd.macd !== null && indicators.macd.signal !== null) {
    if (indicators.macd.macd > indicators.macd.signal && indicators.macd.histogram && indicators.macd.histogram > 0) {
      macdAnalysis = 'bullish';
    } else if (indicators.macd.macd < indicators.macd.signal && indicators.macd.histogram && indicators.macd.histogram < 0) {
      macdAnalysis = 'bearish';
    }
  }

  // Overall Signal (weighted combination)
  let signalScore = 0;
  
  // RSI contributes ±1
  if (rsiAnalysis === 'oversold') signalScore += 1;
  else if (rsiAnalysis === 'overbought') signalScore -= 1;
  
  // Trend contributes ±2 (stronger weight)
  if (trendAnalysis === 'bullish') signalScore += 2;
  else if (trendAnalysis === 'bearish') signalScore -= 2;
  
  // MACD contributes ±1
  if (macdAnalysis === 'bullish') signalScore += 1;
  else if (macdAnalysis === 'bearish') signalScore -= 1;

  let overallSignal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  if (signalScore >= 3) overallSignal = 'strong_buy';
  else if (signalScore >= 1) overallSignal = 'buy';
  else if (signalScore <= -3) overallSignal = 'strong_sell';
  else if (signalScore <= -1) overallSignal = 'sell';
  else overallSignal = 'hold';

  return {
    rsiAnalysis,
    trendAnalysis,
    macdAnalysis,
    overallSignal
  };
}

/**
 * Get support and resistance levels using pivot points
 */
export function calculateSupportResistance(priceData: PriceData[]): {
  support: number[];
  resistance: number[];
} {
  if (priceData.length < 10) {
    return { support: [], resistance: [] };
  }

  const prices = priceData.map(d => d.price);
  const support: number[] = [];
  const resistance: number[] = [];

  // Simple pivot point calculation
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const close = prices[prices.length - 1];
  
  const pivot = (high + low + close) / 3;
  
  // Calculate support and resistance levels
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);

  resistance.push(r1, r2);
  support.push(s1, s2);

  return {
    support: support.filter(s => s > 0).sort((a, b) => b - a), // Descending
    resistance: resistance.sort((a, b) => a - b) // Ascending
  };
}

/**
 * Calculate volatility (standard deviation of returns)
 */
export function calculateVolatility(priceData: PriceData[], period: number = 30): number | null {
  if (priceData.length < period + 1) return null;

  const prices = priceData.slice(-period - 1).map(d => d.price);
  const returns: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * Math.sqrt(365); // Annualized volatility
}

/**
 * Detect chart patterns (basic implementation)
 */
export function detectPatterns(priceData: PriceData[]): {
  pattern: string | null;
  confidence: number;
  description: string;
} {
  if (priceData.length < 20) {
    return {
      pattern: null,
      confidence: 0,
      description: 'Insufficient data for pattern analysis'
    };
  }

  const prices = priceData.slice(-20).map(d => d.price);
  const recent = prices.slice(-5);
  const earlier = prices.slice(-10, -5);
  
  // Simple pattern detection
  const recentAvg = recent.reduce((sum, p) => sum + p, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, p) => sum + p, 0) / earlier.length;
  
  const trend = recentAvg > earlierAvg ? 'upward' : 'downward';
  const strength = Math.abs(recentAvg - earlierAvg) / earlierAvg;
  
  if (strength > 0.05) {
    return {
      pattern: trend === 'upward' ? 'ascending_triangle' : 'descending_triangle',
      confidence: Math.min(strength * 10, 1),
      description: `${trend} trend detected with ${(strength * 100).toFixed(1)}% price movement`
    };
  }
  
  return {
    pattern: 'consolidation',
    confidence: 0.5,
    description: 'Price consolidating in range'
  };
}
