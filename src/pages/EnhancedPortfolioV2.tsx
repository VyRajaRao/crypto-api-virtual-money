import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Plus, Trash2, TrendingUp, TrendingDown, Wallet, PieChart, 
  Edit, Search, MoreHorizontal, Filter, Download, BarChart3,
  Target, Clock, Calendar, Award, AlertTriangle, RefreshCw,
  CheckSquare, Square, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { LineChart, Line, PieChart as RechartsPieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { usePortfolioAnalytics, PortfolioItem } from '@/hooks/usePortfolioAnalytics';
import { SearchBar } from '@/components/SearchBar';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import CryptoSelector, { CryptoAsset } from '@/components/CryptoSelector';
import NewsWidget from '@/components/Newsfeed';

interface BulkAction {
  type: 'delete' | 'export' | 'edit';
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'destructive';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const BULK_ACTIONS: BulkAction[] = [
  { type: 'edit', label: 'Edit Selected', icon: <Edit className="w-4 h-4" /> },
  { type: 'export', label: 'Export Selected', icon: <Download className="w-4 h-4" /> },
  { type: 'delete', label: 'Delete Selected', icon: <Trash2 className="w-4 h-4" />, variant: 'destructive' },
];

export default function EnhancedPortfolioV2() {
  const { user } = useAuth();
  const {
    portfolio,
    analytics,
    assetPerformance,
    historicalData,
    isLoading,
    error,
    lastUpdated,
    selectedTimeRange,
    setSelectedTimeRange,
    addAsset,
    updateAsset,
    removeAsset,
    removeMultipleAssets,
    reorderAssets,
    refreshPortfolio,
  } = usePortfolioAnalytics();

  // Local state
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'allocation' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [hideSmallBalances, setHideSmallBalances] = useState(false);

  // Add asset form
  const [newAsset, setNewAsset] = useState({
    coinId: '',
    symbol: '',
    amount: '',
    buyPrice: '',
  });

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Filter and sort portfolio
  const filteredAndSortedPortfolio = useMemo(() => {
    let filtered = portfolio.filter(item => {
      const matchesSearch = !debouncedSearchQuery || 
        item.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        item.symbol.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      
      const currentValue = (item.current_price || 0) * item.amount;
      const meetsMinimum = !hideSmallBalances || currentValue >= 1;
      
      return matchesSearch && meetsMinimum;
    });

    // Sort portfolio
    filtered.sort((a, b) => {
      let aVal: number, bVal: number;

      switch (sortBy) {
        case 'value':
          aVal = (a.current_price || 0) * a.amount;
          bVal = (b.current_price || 0) * b.amount;
          break;
        case 'pnl':
          aVal = ((a.current_price || 0) - a.avg_buy_price) * a.amount;
          bVal = ((b.current_price || 0) - b.avg_buy_price) * b.amount;
          break;
        case 'allocation':
          aVal = analytics.totalValue > 0 ? ((a.current_price || 0) * a.amount / analytics.totalValue) * 100 : 0;
          bVal = analytics.totalValue > 0 ? ((b.current_price || 0) * b.amount / analytics.totalValue) * 100 : 0;
          break;
        case 'name':
          return sortOrder === 'asc' ? 
            (a.name || a.symbol).localeCompare(b.name || b.symbol) :
            (b.name || b.symbol).localeCompare(a.name || a.symbol);
        default:
          aVal = bVal = 0;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [portfolio, debouncedSearchQuery, hideSmallBalances, sortBy, sortOrder, analytics.totalValue]);

  // Handle drag and drop
  const onDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const items = Array.from(portfolio);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    reorderAssets(items);
  }, [portfolio, reorderAssets]);

  // Selection handlers
  const toggleAssetSelection = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const selectAllAssets = () => {
    setSelectedAssets(new Set(filteredAndSortedPortfolio.map(item => item.id)));
  };

  const deselectAllAssets = () => {
    setSelectedAssets(new Set());
  };

  // Bulk actions
  const handleBulkAction = async (action: BulkAction['type']) => {
    const selectedIds = Array.from(selectedAssets);
    
    switch (action) {
      case 'delete':
        if (selectedIds.length === 0) return;
        
        const confirmed = window.confirm(
          `Are you sure you want to delete ${selectedIds.length} asset(s)?`
        );
        
        if (confirmed) {
          try {
            await removeMultipleAssets(selectedIds);
            setSelectedAssets(new Set());
            toast.success(`${selectedIds.length} asset(s) deleted successfully`);
          } catch (error) {
            toast.error('Failed to delete assets');
          }
        }
        break;
      
      case 'export':
        exportPortfolioData(selectedIds);
        break;
      
      case 'edit':
        setShowBulkEditDialog(true);
        break;
    }
  };

  // Export functionality
  const exportPortfolioData = (selectedIds?: string[]) => {
    const dataToExport = selectedIds?.length 
      ? portfolio.filter(item => selectedIds.includes(item.id))
      : portfolio;

    const csvContent = [
      ['Asset', 'Symbol', 'Amount', 'Avg Buy Price', 'Current Price', 'Current Value', 'P&L', 'P&L %'],
      ...dataToExport.map(item => {
        const currentValue = (item.current_price || 0) * item.amount;
        const investedValue = item.avg_buy_price * item.amount;
        const pnl = currentValue - investedValue;
        const pnlPercentage = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

        return [
          item.name || item.symbol,
          item.symbol.toUpperCase(),
          item.amount,
          item.avg_buy_price,
          item.current_price || 0,
          currentValue,
          pnl,
          pnlPercentage
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Portfolio exported successfully');
  };

  // Add asset handler
  const handleAddAsset = async (asset: CryptoAsset) => {
    setNewAsset(prev => ({
      ...prev,
      coinId: asset.id,
      symbol: asset.symbol
    }));
  };

  const submitAddAsset = async () => {
    if (!newAsset.coinId || !newAsset.amount || !newAsset.buyPrice) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await addAsset(
        newAsset.coinId,
        newAsset.symbol,
        parseFloat(newAsset.amount),
        parseFloat(newAsset.buyPrice)
      );
      
      setNewAsset({ coinId: '', symbol: '', amount: '', buyPrice: '' });
      setShowAddDialog(false);
      toast.success('Asset added successfully');
    } catch (error) {
      toast.error('Failed to add asset');
    }
  };

  // Render portfolio item card
  const renderPortfolioCard = (item: PortfolioItem, index: number) => {
    const currentValue = (item.current_price || 0) * item.amount;
    const investedValue = item.avg_buy_price * item.amount;
    const pnl = currentValue - investedValue;
    const pnlPercentage = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
    const isSelected = selectedAssets.has(item.id);
    const allocation = analytics.totalValue > 0 ? (currentValue / analytics.totalValue) * 100 : 0;

    return (
      <Draggable key={item.id} draggableId={item.id} index={index}>
        {(provided, snapshot) => (
          <motion.div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className={`
              relative rounded-lg border transition-all duration-200
              ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-border/50'}
              ${snapshot.isDragging ? 'shadow-xl scale-105 rotate-2' : ''}
              bg-gradient-card hover:border-primary/30
            `}
          >
            {/* Selection checkbox */}
            <div className="absolute top-3 left-3 z-10">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleAssetSelection(item.id)}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <CardContent className="p-4 sm:p-6 pt-12">
              {/* Asset header */}
              <div className="flex items-center gap-3 mb-4">
                {item.image && (
                  <img 
                    src={item.image} 
                    alt={item.symbol} 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" 
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base truncate">
                    {item.name || item.symbol.toUpperCase()}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    ${(item.current_price || 0).toLocaleString()}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {/* Handle edit */}}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => removeAsset(item.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Asset details */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Holdings</p>
                  <p className="font-medium text-sm">{item.amount.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Value</p>
                  <p className="font-semibold text-sm">${currentValue.toLocaleString()}</p>
                </div>
              </div>

              {/* Allocation bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Allocation</span>
                  <span>{allocation.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(allocation, 100)}%` }}
                  />
                </div>
              </div>

              {/* P&L */}
              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                <div className="text-xs text-muted-foreground">P&L</div>
                <div className="flex items-center gap-1">
                  {pnl >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-crypto-gain" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-crypto-loss" />
                  )}
                  <div className="text-right">
                    <p className={`font-medium text-xs ${pnl >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                      {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString()}
                    </p>
                    <p className={`text-xs ${pnl >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                      {pnl >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </Draggable>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Enhanced Portfolio
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Advanced portfolio management with analytics
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshPortfolio}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Search Cryptocurrency</Label>
                  <CryptoSelector 
                    onAssetSelect={handleAddAsset}
                    placeholder="Select cryptocurrency to add..."
                    showTrending={true}
                  />
                </div>
                {newAsset.coinId && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          step="any"
                          value={newAsset.amount}
                          onChange={(e) => setNewAsset(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Buy Price ($)</Label>
                        <Input
                          type="number"
                          step="any"
                          value={newAsset.buyPrice}
                          onChange={(e) => setNewAsset(prev => ({ ...prev, buyPrice: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <Button onClick={submitAddAsset} className="w-full">
                      Add Asset
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Analytics Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-gradient-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Total Value</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold mt-1">
                    ${analytics.totalValue.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Invested</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold mt-1">
                    ${analytics.totalInvested.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    {analytics.totalPnL >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-crypto-gain" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-crypto-loss" />
                    )}
                    <span className="text-xs text-muted-foreground">Total P&L</span>
                  </div>
                  <p className={`text-lg sm:text-xl font-bold mt-1 ${
                    analytics.totalPnL >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'
                  }`}>
                    {analytics.totalPnL >= 0 ? '+' : ''}${Math.abs(analytics.totalPnL).toLocaleString()}
                  </p>
                  <p className={`text-xs ${
                    analytics.totalPnL >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'
                  }`}>
                    {analytics.totalPnL >= 0 ? '+' : ''}{analytics.totalPnLPercentage.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">24h Change</span>
                  </div>
                  <p className={`text-lg sm:text-xl font-bold mt-1 ${
                    analytics.dailyChange >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'
                  }`}>
                    {analytics.dailyChange >= 0 ? '+' : ''}${Math.abs(analytics.dailyChange).toLocaleString()}
                  </p>
                  <p className={`text-xs ${
                    analytics.dailyChange >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'
                  }`}>
                    {analytics.dailyChange >= 0 ? '+' : ''}{analytics.dailyChangePercentage.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {/* Performance Chart */}
            <Card className="bg-gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Portfolio Performance</span>
                  <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7 Days</SelectItem>
                      <SelectItem value="30d">30 Days</SelectItem>
                      <SelectItem value="90d">90 Days</SelectItem>
                      <SelectItem value="1y">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="totalValue" 
                        stroke="#0088FE" 
                        strokeWidth={2}
                        name="Portfolio Value"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalPnL" 
                        stroke="#00C49F" 
                        strokeWidth={2}
                        name="P&L"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top/Bottom Performers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-crypto-gain" />
                    Top Performer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.topPerformer && (
                    <div className="flex items-center gap-3">
                      {analytics.topPerformer.image && (
                        <img 
                          src={analytics.topPerformer.image} 
                          alt={analytics.topPerformer.symbol}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">{analytics.topPerformer.name || analytics.topPerformer.symbol}</p>
                        <p className="text-sm text-crypto-gain">
                          +{((analytics.topPerformer.current_price || 0) - analytics.topPerformer.avg_buy_price) / analytics.topPerformer.avg_buy_price * 100}%
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-crypto-loss" />
                    Needs Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.worstPerformer && (
                    <div className="flex items-center gap-3">
                      {analytics.worstPerformer.image && (
                        <img 
                          src={analytics.worstPerformer.image} 
                          alt={analytics.worstPerformer.symbol}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">{analytics.worstPerformer.name || analytics.worstPerformer.symbol}</p>
                        <p className="text-sm text-crypto-loss">
                          {((analytics.worstPerformer.current_price || 0) - analytics.worstPerformer.avg_buy_price) / analytics.worstPerformer.avg_buy_price * 100}%
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="allocation" className="space-y-4">
            {/* Allocation Chart */}
            <Card className="bg-gradient-card">
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Tooltip />
                        <RechartsPieChart
                          data={analytics.assetAllocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="percentage"
                        >
                          {analytics.assetAllocation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </RechartsPieChart>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {analytics.assetAllocation.map((asset, index) => (
                      <div key={asset.symbol} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm">{asset.name}</span>
                        </div>
                        <div className="text-sm font-medium">
                          {asset.percentage.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gradient-card">
                <CardContent className="p-4">
                  <div className="text-center">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{analytics.diversificationScore.toFixed(0)}</p>
                    <p className="text-sm text-muted-foreground">Diversification Score</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card">
                <CardContent className="p-4">
                  <div className="text-center">
                    <PieChart className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{portfolio.length}</p>
                    <p className="text-sm text-muted-foreground">Assets Held</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card">
                <CardContent className="p-4">
                  <div className="text-center">
                    <Target className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">
                      ${(analytics.totalValue / Math.max(portfolio.length, 1)).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Avg Position Size</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="news" className="space-y-4">
            {/* Portfolio News Feed */}
            <NewsWidget 
              selectedAssets={portfolio.map(item => item.symbol)}
              maxItems={15}
              height="500px"
              showControls={true}
              className="w-full"
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Portfolio Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row justify-between gap-4"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="value">Value</SelectItem>
              <SelectItem value="pnl">P&L</SelectItem>
              <SelectItem value="allocation">Allocation</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={hideSmallBalances}
              onCheckedChange={setHideSmallBalances}
            />
            <span className="text-sm">Hide small balances</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Bulk Actions */}
      {selectedAssets.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/20 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedAssets.size} asset(s) selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAllAssets}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAllAssets}>
                  <Square className="w-4 h-4 mr-2" />
                  Deselect All
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              {BULK_ACTIONS.map((action) => (
                <Button
                  key={action.type}
                  size="sm"
                  variant={action.variant || 'outline'}
                  onClick={() => handleBulkAction(action.type)}
                >
                  {action.icon}
                  <span className="ml-2 hidden sm:inline">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Portfolio Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {filteredAndSortedPortfolio.length === 0 ? (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-8 sm:p-12 text-center">
              <PieChart className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">
                {portfolio.length === 0 ? 'Your portfolio is empty' : 'No assets match your filters'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {portfolio.length === 0 
                  ? 'Add your first cryptocurrency to start tracking your investments'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {portfolio.length === 0 && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Asset
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="portfolio">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
                >
                  {filteredAndSortedPortfolio.map((item, index) => 
                    renderPortfolioCard(item, index)
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </motion.div>
    </div>
  );
}
