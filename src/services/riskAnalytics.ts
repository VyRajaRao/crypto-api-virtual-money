import { supabase } from '@/lib/supabase';

export interface RiskMetrics {
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  betaCoefficient: number;
  valueAtRisk: number; // 95% VaR
  expectedShortfall: number; // Expected Shortfall (CVaR)
  diversificationRatio: number;
  informationRatio: number;
  calmarRatio: number;
  sortinoRatio: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  recoveryFactor: number;
}

export interface PortfolioAnalytics {
  totalValue: number;
  totalInvested: number;
  totalPnL: number;
  dailyPnL: number;
  riskMetrics: RiskMetrics;
  performanceMetrics: PerformanceMetrics;
  assetAllocation: Array<{
    symbol: string;
    name: string;
    percentage: number;
    value: number;
    risk: 'low' | 'medium' | 'high';
  }>;
  correlationMatrix: Array<{
    asset1: string;
    asset2: string;
    correlation: number;
  }>;
  recommendations: Array<{
    type: 'rebalance' | 'diversify' | 'reduce_risk' | 'increase_exposure';
    message: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

export interface HistoricalData {
  date: string;
  portfolioValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
  drawdown: number;
  volatility: number;
}

class RiskAnalyticsService {
  private readonly RISK_FREE_RATE = 0.02; // 2% annual risk-free rate
  private readonly TRADING_DAYS_PER_YEAR = 365;
  private readonly VaR_CONFIDENCE_LEVEL = 0.05; // 95% confidence level

  /**
   * Calculate comprehensive portfolio analytics
   */
  async calculatePortfolioAnalytics(userId: string): Promise<PortfolioAnalytics | null> {
    try {
      // Get user's portfolio and trading data
      const [portfolioData, historicalData, tradesData] = await Promise.all([
        this.getPortfolioData(userId),
        this.getHistoricalPortfolioData(userId),
        this.getTradesData(userId)
      ]);

      if (!portfolioData || portfolioData.length === 0) {
        return null;
      }

      // Calculate basic portfolio metrics
      const totalValue = portfolioData.reduce((sum, position) => sum + position.total_value, 0);
      const totalInvested = portfolioData.reduce((sum, position) => sum + position.total_invested, 0);
      const totalPnL = totalValue - totalInvested;
      
      // Calculate risk metrics
      const riskMetrics = await this.calculateRiskMetrics(historicalData, portfolioData);
      
      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(tradesData, historicalData);
      
      // Calculate asset allocation
      const assetAllocation = this.calculateAssetAllocation(portfolioData, totalValue);
      
      // Calculate correlation matrix
      const correlationMatrix = await this.calculateCorrelationMatrix(portfolioData);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        portfolioData, 
        riskMetrics, 
        assetAllocation
      );

      return {
        totalValue,
        totalInvested,
        totalPnL,
        dailyPnL: historicalData.length > 0 ? historicalData[historicalData.length - 1].dailyReturn * totalValue : 0,
        riskMetrics,
        performanceMetrics,
        assetAllocation,
        correlationMatrix,
        recommendations
      };

    } catch (error) {
      console.error('Error calculating portfolio analytics:', error);
      return null;
    }
  }

  /**
   * Calculate risk metrics for the portfolio
   */
  private async calculateRiskMetrics(
    historicalData: HistoricalData[], 
    portfolioData: any[]
  ): Promise<RiskMetrics> {
    const returns = historicalData.map(d => d.dailyReturn);
    const portfolioValues = historicalData.map(d => d.portfolioValue);

    // Basic statistical measures
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = this.calculateVolatility(returns);
    const maxDrawdown = this.calculateMaxDrawdown(portfolioValues);
    
    // Risk-adjusted measures
    const sharpeRatio = this.calculateSharpeRatio(returns, volatility);
    const sortinoRatio = this.calculateSortinoRatio(returns);
    const calmarRatio = this.calculateCalmarRatio(meanReturn, maxDrawdown);
    
    // Risk measures
    const valueAtRisk = this.calculateVaR(returns);
    const expectedShortfall = this.calculateExpectedShortfall(returns);
    
    // Portfolio-specific metrics
    const diversificationRatio = this.calculateDiversificationRatio(portfolioData);
    const betaCoefficient = await this.calculateBetaCoefficient(historicalData);
    const informationRatio = this.calculateInformationRatio(returns);

    return {
      sharpeRatio,
      volatility,
      maxDrawdown,
      betaCoefficient,
      valueAtRisk,
      expectedShortfall,
      diversificationRatio,
      informationRatio,
      calmarRatio,
      sortinoRatio
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(
    trades: any[], 
    historicalData: HistoricalData[]
  ): PerformanceMetrics {
    if (trades.length === 0 || historicalData.length === 0) {
      return this.getEmptyPerformanceMetrics();
    }

    // Calculate returns
    const totalReturn = historicalData.length > 0 
      ? historicalData[historicalData.length - 1].cumulativeReturn 
      : 0;
    
    const annualizedReturn = this.calculateAnnualizedReturn(
      historicalData.map(d => d.dailyReturn)
    );

    // Trade-based metrics
    const winningTrades = trades.filter(t => this.isWinningTrade(t));
    const losingTrades = trades.filter(t => this.isLosingTrade(t));
    
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    
    const totalWins = winningTrades.reduce((sum, t) => sum + this.getTradePnL(t), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + this.getTradePnL(t), 0));
    
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    
    const largestWin = winningTrades.length > 0 
      ? Math.max(...winningTrades.map(t => this.getTradePnL(t))) 
      : 0;
    const largestLoss = losingTrades.length > 0 
      ? Math.min(...losingTrades.map(t => this.getTradePnL(t))) 
      : 0;

    // Consecutive wins/losses
    const { consecutiveWins, consecutiveLosses } = this.calculateConsecutiveTrades(trades);
    
    // Recovery factor
    const maxDrawdown = this.calculateMaxDrawdown(historicalData.map(d => d.portfolioValue));
    const recoveryFactor = maxDrawdown !== 0 ? totalReturn / Math.abs(maxDrawdown) : 0;

    return {
      totalReturn,
      annualizedReturn,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      consecutiveWins,
      consecutiveLosses,
      recoveryFactor
    };
  }

  /**
   * Calculate asset allocation with risk assessment
   */
  private calculateAssetAllocation(
    portfolioData: any[], 
    totalValue: number
  ): Array<{ symbol: string; name: string; percentage: number; value: number; risk: 'low' | 'medium' | 'high' }> {
    return portfolioData.map(position => {
      const percentage = totalValue > 0 ? (position.total_value / totalValue) * 100 : 0;
      const risk = this.assessAssetRisk(position);
      
      return {
        symbol: position.symbol,
        name: position.name || position.symbol.toUpperCase(),
        percentage,
        value: position.total_value,
        risk
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * Calculate correlation matrix between assets
   */
  private async calculateCorrelationMatrix(
    portfolioData: any[]
  ): Promise<Array<{ asset1: string; asset2: string; correlation: number }>> {
    const correlations: Array<{ asset1: string; asset2: string; correlation: number }> = [];
    
    // For simplicity, we'll use a basic correlation calculation
    // In a real system, you'd fetch historical price data for each asset
    for (let i = 0; i < portfolioData.length; i++) {
      for (let j = i + 1; j < portfolioData.length; j++) {
        const asset1 = portfolioData[i];
        const asset2 = portfolioData[j];
        
        // Simulate correlation based on asset types
        const correlation = this.estimateAssetCorrelation(asset1.symbol, asset2.symbol);
        
        correlations.push({
          asset1: asset1.symbol,
          asset2: asset2.symbol,
          correlation
        });
      }
    }
    
    return correlations;
  }

  /**
   * Generate portfolio recommendations
   */
  private generateRecommendations(
    portfolioData: any[],
    riskMetrics: RiskMetrics,
    assetAllocation: any[]
  ): Array<{
    type: 'rebalance' | 'diversify' | 'reduce_risk' | 'increase_exposure';
    message: string;
    priority: 'low' | 'medium' | 'high';
  }> {
    const recommendations = [];

    // Diversification recommendations
    if (portfolioData.length < 5) {
      recommendations.push({
        type: 'diversify' as const,
        message: 'Consider adding more assets to improve diversification and reduce risk.',
        priority: 'high' as const
      });
    }

    // Concentration risk
    const maxAllocation = Math.max(...assetAllocation.map(a => a.percentage));
    if (maxAllocation > 40) {
      recommendations.push({
        type: 'rebalance' as const,
        message: `One asset represents ${maxAllocation.toFixed(1)}% of your portfolio. Consider reducing concentration risk.`,
        priority: 'high' as const
      });
    }

    // Volatility recommendations
    if (riskMetrics.volatility > 0.3) {
      recommendations.push({
        type: 'reduce_risk' as const,
        message: 'Your portfolio has high volatility. Consider adding more stable assets.',
        priority: 'medium' as const
      });
    }

    // Sharpe ratio recommendations
    if (riskMetrics.sharpeRatio < 0.5) {
      recommendations.push({
        type: 'rebalance' as const,
        message: 'Your risk-adjusted returns could be improved. Review your asset selection.',
        priority: 'medium' as const
      });
    }

    // Drawdown recommendations
    if (riskMetrics.maxDrawdown < -0.2) {
      recommendations.push({
        type: 'reduce_risk' as const,
        message: 'Your portfolio has experienced significant drawdowns. Consider risk management strategies.',
        priority: 'high' as const
      });
    }

    return recommendations;
  }

  /**
   * Helper methods for calculations
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    
    return Math.sqrt(variance * this.TRADING_DAYS_PER_YEAR);
  }

  private calculateMaxDrawdown(portfolioValues: number[]): number {
    if (portfolioValues.length < 2) return 0;

    let maxDrawdown = 0;
    let peak = portfolioValues[0];

    for (const value of portfolioValues) {
      if (value > peak) {
        peak = value;
      }
      
      const drawdown = (peak - value) / peak;
      maxDrawdown = Math.min(maxDrawdown, -drawdown);
    }

    return maxDrawdown;
  }

  private calculateSharpeRatio(returns: number[], volatility: number): number {
    if (volatility === 0 || returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const annualizedReturn = meanReturn * this.TRADING_DAYS_PER_YEAR;
    
    return (annualizedReturn - this.RISK_FREE_RATE) / volatility;
  }

  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const downwardReturns = returns.filter(r => r < 0);
    
    if (downwardReturns.length === 0) return 0;
    
    const downsideVariance = downwardReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downwardReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance * this.TRADING_DAYS_PER_YEAR);
    
    return downsideDeviation !== 0 
      ? (meanReturn * this.TRADING_DAYS_PER_YEAR - this.RISK_FREE_RATE) / downsideDeviation 
      : 0;
  }

  private calculateCalmarRatio(meanReturn: number, maxDrawdown: number): number {
    if (maxDrawdown === 0) return 0;
    const annualizedReturn = meanReturn * this.TRADING_DAYS_PER_YEAR;
    return annualizedReturn / Math.abs(maxDrawdown);
  }

  private calculateVaR(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * this.VaR_CONFIDENCE_LEVEL);
    
    return sortedReturns[index] || 0;
  }

  private calculateExpectedShortfall(returns: number[]): number {
    const var95 = this.calculateVaR(returns);
    const tailReturns = returns.filter(r => r <= var95);
    
    return tailReturns.length > 0 
      ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length 
      : 0;
  }

  private calculateDiversificationRatio(portfolioData: any[]): number {
    // Simplified diversification ratio based on number of assets and their weights
    if (portfolioData.length <= 1) return 0;
    
    const totalValue = portfolioData.reduce((sum, p) => sum + p.total_value, 0);
    const weights = portfolioData.map(p => p.total_value / totalValue);
    const herfindahlIndex = weights.reduce((sum, w) => sum + Math.pow(w, 2), 0);
    
    return (1 - herfindahlIndex) / (1 - 1 / portfolioData.length);
  }

  private async calculateBetaCoefficient(historicalData: HistoricalData[]): Promise<number> {
    // Simplified beta calculation - in reality you'd compare against market index
    if (historicalData.length < 2) return 1;
    
    const returns = historicalData.map(d => d.dailyReturn);
    const variance = this.calculateVolatility(returns) ** 2;
    
    // Assume market beta of 1.5 for crypto markets (higher volatility than traditional markets)
    return Math.min(2.5, 1 + variance * 2);
  }

  private calculateInformationRatio(returns: number[]): number {
    // Simplified information ratio
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const trackingError = this.calculateVolatility(returns);
    
    return trackingError !== 0 ? meanReturn / trackingError : 0;
  }

  private calculateAnnualizedReturn(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const totalReturn = returns.reduce((product, r) => product * (1 + r), 1) - 1;
    const periods = returns.length;
    const yearsEquivalent = periods / this.TRADING_DAYS_PER_YEAR;
    
    return yearsEquivalent > 0 ? Math.pow(1 + totalReturn, 1 / yearsEquivalent) - 1 : 0;
  }

  /**
   * Data fetching methods
   */
  private async getPortfolioData(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  private async getHistoricalPortfolioData(userId: string): Promise<HistoricalData[]> {
    // For now, we'll generate mock historical data
    // In a real system, you'd store daily portfolio snapshots
    return this.generateMockHistoricalData();
  }

  private async getTradesData(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'filled')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Helper methods
   */
  private assessAssetRisk(position: any): 'low' | 'medium' | 'high' {
    // Simplified risk assessment based on asset type
    const riskMap: Record<string, 'low' | 'medium' | 'high'> = {
      'btc': 'medium',
      'eth': 'medium',
      'usdt': 'low',
      'usdc': 'low',
      'bnb': 'high',
      'ada': 'high',
      'sol': 'high',
      'dot': 'high'
    };

    return riskMap[position.symbol] || 'high';
  }

  private estimateAssetCorrelation(symbol1: string, symbol2: string): number {
    // Simplified correlation estimation
    if (symbol1 === symbol2) return 1;
    
    const stableCoins = ['usdt', 'usdc', 'dai'];
    const majorCoins = ['btc', 'eth'];
    const altCoins = ['ada', 'sol', 'dot', 'bnb'];
    
    if (stableCoins.includes(symbol1) && stableCoins.includes(symbol2)) return 0.95;
    if (stableCoins.includes(symbol1) || stableCoins.includes(symbol2)) return 0.1;
    if (majorCoins.includes(symbol1) && majorCoins.includes(symbol2)) return 0.75;
    if (altCoins.includes(symbol1) && altCoins.includes(symbol2)) return 0.6;
    
    return 0.4; // Default correlation
  }

  private isWinningTrade(trade: any): boolean {
    return this.getTradePnL(trade) > 0;
  }

  private isLosingTrade(trade: any): boolean {
    return this.getTradePnL(trade) < 0;
  }

  private getTradePnL(trade: any): number {
    // Simplified P&L calculation
    if (trade.side === 'sell') {
      return trade.total_usd - (trade.amount * trade.price);
    }
    return 0; // For buy orders, P&L is realized on sell
  }

  private calculateConsecutiveTrades(trades: any[]): { consecutiveWins: number; consecutiveLosses: number } {
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    for (const trade of trades) {
      if (this.isWinningTrade(trade)) {
        currentWins++;
        currentLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
      } else if (this.isLosingTrade(trade)) {
        currentLosses++;
        currentWins = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
      }
    }

    return {
      consecutiveWins: maxConsecutiveWins,
      consecutiveLosses: maxConsecutiveLosses
    };
  }

  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      winRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      recoveryFactor: 0
    };
  }

  private generateMockHistoricalData(): HistoricalData[] {
    // Generate 30 days of mock data
    const data: HistoricalData[] = [];
    let portfolioValue = 100000;
    let cumulativeReturn = 0;

    for (let i = 0; i < 30; i++) {
      const dailyReturn = (Math.random() - 0.5) * 0.04; // ±2% daily variation
      portfolioValue *= (1 + dailyReturn);
      cumulativeReturn = (portfolioValue - 100000) / 100000;

      const drawdown = i > 0 ? Math.min(0, (portfolioValue - Math.max(...data.map(d => d.portfolioValue))) / Math.max(...data.map(d => d.portfolioValue))) : 0;

      data.push({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        portfolioValue,
        dailyReturn,
        cumulativeReturn,
        drawdown,
        volatility: this.calculateVolatility(data.slice(-10).map(d => d.dailyReturn))
      });
    }

    return data;
  }
}

export const riskAnalyticsService = new RiskAnalyticsService();
export default riskAnalyticsService;
