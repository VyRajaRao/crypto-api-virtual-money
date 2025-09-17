import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, PieChart, Target, TrendingUp, TrendingDown, DollarSign, Percent, AlertTriangle, CheckCircle, Activity, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePortfolio } from "@/hooks/useSupabase";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

const COLORS = [
  'hsl(var(--primary))', 
  'hsl(var(--accent))', 
  'hsl(var(--crypto-gain))', 
  'hsl(var(--crypto-loss))', 
  '#8b5cf6', 
  '#06d6a0', 
  '#f72585', 
  '#4cc9f0'
];

interface Insight {
  type: 'warning' | 'success' | 'info';
  message: string;
  icon: React.ComponentType<any>;
}

export default function Analysis() {
  const { user } = useAuth();
  const { portfolio, isLoading } = usePortfolio();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeChart, setActiveChart] = useState<'pie' | 'bar'>('pie');

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Calculate portfolio metrics
  const totalValue = portfolio?.reduce((sum, item) => sum + ((item.amount || 0) * (item.current_price || 0)), 0) || 0;
  const totalInvested = portfolio?.reduce((sum, item) => sum + ((item.amount || 0) * (item.avg_buy_price || 0)), 0) || 0;
  const totalProfit = totalValue - totalInvested;
  const totalProfitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  // Prepare chart data
  const pieChartData = portfolio?.map(item => ({
    name: item.symbol?.toUpperCase() || 'Unknown',
    value: (item.amount || 0) * (item.current_price || 0),
    percentage: totalValue > 0 ? (((item.amount || 0) * (item.current_price || 0)) / totalValue) * 100 : 0
  })) || [];

  const barChartData = portfolio?.map(item => {
    const currentValue = (item.amount || 0) * (item.current_price || 0);
    const investedValue = (item.amount || 0) * (item.avg_buy_price || 0);
    const profit = currentValue - investedValue;
    return {
      name: item.symbol?.toUpperCase() || 'Unknown',
      profit: profit,
      profitPercentage: investedValue > 0 ? (profit / investedValue) * 100 : 0
    };
  }) || [];

  // Generate insights
  useEffect(() => {
    if (!portfolio || portfolio.length === 0) {
      setInsights([]);
      return;
    }

    const newInsights: Insight[] = [];

    // Performance insights
    const profitableAssets = portfolio.filter(item => {
      const currentValue = (item.amount || 0) * (item.current_price || 0);
      const investedValue = (item.amount || 0) * (item.avg_buy_price || 0);
      return currentValue > investedValue;
    });

    const lossyAssets = portfolio.filter(item => {
      const currentValue = (item.amount || 0) * (item.current_price || 0);
      const investedValue = (item.amount || 0) * (item.avg_buy_price || 0);
      return currentValue < investedValue;
    });

    // Overall portfolio insight
    if (totalProfit > 0) {
      newInsights.push({
        type: 'success',
        message: `Portfolio is profitable with ${totalProfitPercentage.toFixed(1)}% gains`,
        icon: CheckCircle
      });
    } else if (totalProfit < 0) {
      newInsights.push({
        type: 'warning',
        message: `Portfolio is down ${Math.abs(totalProfitPercentage).toFixed(1)}%`,
        icon: AlertTriangle
      });
    }

    // Asset distribution insight
    if (portfolio.length > 0) {
      const topAsset = pieChartData.reduce((max, item) => 
        item.percentage > max.percentage ? item : max, pieChartData[0]
      );
      
      if (topAsset && topAsset.percentage > 50) {
        newInsights.push({
          type: 'info',
          message: `${topAsset.name} dominates your portfolio (${topAsset.percentage.toFixed(1)}%)`,
          icon: Target
        });
      }
    }

    setInsights(newInsights);
  }, [portfolio, totalProfit, totalProfitPercentage, pieChartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          {activeChart === 'pie' ? (
            <>
              <p className="text-sm text-crypto-gain">
                Value: ${payload[0].value.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                {payload[0].payload.percentage.toFixed(1)}% of portfolio
              </p>
            </>
          ) : (
            <>
              <p className={`text-sm ${payload[0].value >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                P&L: ${Math.abs(payload[0].value).toLocaleString()}
              </p>
              <p className={`text-sm ${payload[0].payload.profitPercentage >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                {payload[0].payload.profitPercentage.toFixed(1)}%
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1 pr-2">
            <h1 className="responsive-title bg-gradient-primary bg-clip-text text-transparent">
              Portfolio Analysis
            </h1>
            <p className="responsive-small text-muted-foreground mt-1 pr-2">
              Loading your portfolio insights...
            </p>
          </div>
        </div>
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground text-sm sm:text-base">Analyzing your portfolio...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!portfolio || portfolio.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1 pr-2">
            <h1 className="responsive-title bg-gradient-primary bg-clip-text text-transparent">
              Portfolio Analysis
            </h1>
            <p className="responsive-small text-muted-foreground mt-1 pr-2">
              No portfolio data to analyze
            </p>
          </div>
        </div>
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-8 sm:p-12 text-center">
            <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="responsive-heading text-foreground mb-2">
              No Portfolio Data
            </h3>
            <p className="responsive-body text-muted-foreground mb-6">
              Add some assets to your portfolio to see detailed analysis and insights.
            </p>
            <Button
              onClick={() => window.location.href = '/portfolio'}
              className="bg-gradient-primary touch-manipulation"
            >
              Go to Portfolio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-mobile max-w-full space-y-3 sm:space-y-4 lg:space-y-6 pb-4 portrait:space-y-3 landscape:space-y-2">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <h1 className="responsive-title bg-gradient-primary bg-clip-text text-transparent">
            📊 Portfolio Analysis
          </h1>
          <p className="responsive-small text-muted-foreground mt-1">
            Deep insights into your investments
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Badge variant="secondary" className="bg-primary/10 text-primary responsive-caption">
            {portfolio.length} Assets
          </Badge>
        </div>
      </motion.div>

      {/* Portfolio Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="px-3 py-2 sm:px-4 sm:py-3">
            <CardTitle className="card-title-responsive flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              💰 Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-2">
                <p className="responsive-caption text-muted-foreground">Total Value</p>
                <p className="responsive-heading font-bold text-foreground">
                  ${totalValue.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-2">
                <p className="responsive-caption text-muted-foreground">Total Invested</p>
                <p className="responsive-heading font-bold text-foreground">
                  ${totalInvested.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-2">
                <p className="responsive-caption text-muted-foreground">Total P&L</p>
                <div className="flex items-center justify-center gap-2">
                  {totalProfit >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-crypto-gain" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-crypto-loss" />
                  )}
                  <div>
                    <p className={`responsive-subheading font-bold ${totalProfit >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                      {totalProfit >= 0 ? '+' : ''}${Math.abs(totalProfit).toLocaleString()}
                    </p>
                    <p className={`responsive-caption ${totalProfit >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                      {totalProfit >= 0 ? '+' : ''}{totalProfitPercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="px-3 py-2 sm:px-4 sm:py-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="card-title-responsive flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                📈 Visualization
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={activeChart === 'pie' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveChart('pie')}
                  className="touch-target responsive-caption"
                >
                  <PieChart className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Distribution</span>
                  <span className="sm:hidden">Dist</span>
                </Button>
                <Button
                  variant={activeChart === 'bar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveChart('bar')}
                  className="touch-target responsive-caption"
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Performance</span>
                  <span className="sm:hidden">P&L</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
            <div className="h-48 sm:h-64 lg:h-80 w-full touch-manipulation">
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'pie' ? (
                  <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RechartsPieChart>
                ) : (
                  <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="profit" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Insights */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="px-3 py-2 sm:px-4 sm:py-3">
              <CardTitle className="card-title-responsive flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                📊 Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
              <div className="space-y-2">
                {insights.map((insight, index) => {
                  const IconComponent = insight.icon;
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-2 sm:p-3 rounded-lg border ${
                        insight.type === 'success' 
                          ? 'bg-crypto-gain/10 border-crypto-gain/20 text-crypto-gain' 
                          : insight.type === 'warning'
                          ? 'bg-crypto-loss/10 border-crypto-loss/20 text-crypto-loss'
                          : 'bg-primary/10 border-primary/20 text-primary'
                      }`}
                    >
                      <IconComponent className="w-4 h-4 shrink-0" />
                      <p className="responsive-small font-medium">{insight.message}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
