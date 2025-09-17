import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Target, 
  AlertTriangle, 
  Calculator,
  Info,
  DollarSign
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Order, TradingPair } from '@/hooks/useAdvancedTrading';

interface AdvancedOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderData: any) => Promise<void>;
  tradingPair: TradingPair;
  walletBalance: number;
  editingOrder?: Order | null;
}

type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit' | 'stop_limit' | 'trailing_stop';
type OrderSide = 'buy' | 'sell';

interface OrderForm {
  type: OrderType;
  side: OrderSide;
  amount: string;
  price: string;
  stopPrice: string;
  trailingAmount: string;
  trailingPercent: string;
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'GTT';
  expiryTime?: string;
  reduceOnly: boolean;
  postOnly: boolean;
}

const ORDER_TYPES = [
  { value: 'market', label: 'Market', description: 'Execute immediately at current market price' },
  { value: 'limit', label: 'Limit', description: 'Execute only at specified price or better' },
  { value: 'stop_loss', label: 'Stop Loss', description: 'Trigger market order when price hits stop price' },
  { value: 'take_profit', label: 'Take Profit', description: 'Trigger market order to secure profits' },
  { value: 'stop_limit', label: 'Stop Limit', description: 'Trigger limit order when stop price is reached' },
  { value: 'trailing_stop', label: 'Trailing Stop', description: 'Dynamic stop that follows price movement' },
];

const TIME_IN_FORCE_OPTIONS = [
  { value: 'GTC', label: 'Good Till Cancelled', description: 'Order remains active until filled or cancelled' },
  { value: 'IOC', label: 'Immediate or Cancel', description: 'Fill immediately or cancel unfilled portion' },
  { value: 'FOK', label: 'Fill or Kill', description: 'Fill entire order immediately or cancel completely' },
  { value: 'GTT', label: 'Good Till Time', description: 'Active until specified expiry time' },
];

export default function AdvancedOrderModal({
  isOpen,
  onClose,
  onSubmit,
  tradingPair,
  walletBalance,
  editingOrder
}: AdvancedOrderModalProps) {
  const [form, setForm] = useState<OrderForm>({
    type: 'market',
    side: 'buy',
    amount: '',
    price: '',
    stopPrice: '',
    trailingAmount: '',
    trailingPercent: '5',
    timeInForce: 'GTC',
    reduceOnly: false,
    postOnly: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or editing order changes
  useEffect(() => {
    if (editingOrder) {
      setForm({
        type: editingOrder.type,
        side: editingOrder.side,
        amount: editingOrder.amount.toString(),
        price: editingOrder.price?.toString() || '',
        stopPrice: editingOrder.stop_price?.toString() || '',
        trailingAmount: '',
        trailingPercent: '5',
        timeInForce: 'GTC',
        reduceOnly: false,
        postOnly: false,
      });
    } else if (isOpen) {
      setForm(prev => ({
        ...prev,
        amount: '',
        price: tradingPair.currentPrice.toString(),
        stopPrice: '',
        trailingAmount: '',
      }));
    }
    setValidationErrors({});
  }, [isOpen, editingOrder, tradingPair.currentPrice]);

  // Calculate order details
  const orderDetails = React.useMemo(() => {
    const amount = parseFloat(form.amount) || 0;
    const price = form.type === 'market' ? tradingPair.currentPrice : parseFloat(form.price) || 0;
    const total = amount * price;
    const fee = total * 0.001; // 0.1% fee
    const totalWithFee = form.side === 'buy' ? total + fee : total - fee;

    return {
      amount,
      price,
      total,
      fee,
      totalWithFee,
      hasInsufficientBalance: form.side === 'buy' && totalWithFee > walletBalance
    };
  }, [form, tradingPair.currentPrice, walletBalance]);

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.amount || parseFloat(form.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }

    if (form.type !== 'market' && (!form.price || parseFloat(form.price) <= 0)) {
      errors.price = 'Price must be greater than 0';
    }

    if (['stop_loss', 'take_profit', 'stop_limit'].includes(form.type) && (!form.stopPrice || parseFloat(form.stopPrice) <= 0)) {
      errors.stopPrice = 'Stop price must be greater than 0';
    }

    if (form.type === 'trailing_stop') {
      if (form.trailingAmount && parseFloat(form.trailingAmount) <= 0) {
        errors.trailingAmount = 'Trailing amount must be greater than 0';
      }
      if (!form.trailingAmount && (!form.trailingPercent || parseFloat(form.trailingPercent) <= 0)) {
        errors.trailingPercent = 'Trailing percentage must be greater than 0';
      }
    }

    if (orderDetails.hasInsufficientBalance) {
      errors.balance = 'Insufficient balance';
    }

    if (form.timeInForce === 'GTT' && !form.expiryTime) {
      errors.expiryTime = 'Expiry time is required for GTT orders';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const orderData = {
        coinId: tradingPair.symbol.toLowerCase(),
        symbol: tradingPair.symbol,
        type: form.type,
        side: form.side,
        amount: parseFloat(form.amount),
        price: form.type === 'market' ? undefined : parseFloat(form.price),
        stopPrice: ['stop_loss', 'take_profit', 'stop_limit'].includes(form.type) ? parseFloat(form.stopPrice) : undefined,
        trailingAmount: form.type === 'trailing_stop' && form.trailingAmount ? parseFloat(form.trailingAmount) : undefined,
        trailingPercent: form.type === 'trailing_stop' && !form.trailingAmount ? parseFloat(form.trailingPercent) : undefined,
        timeInForce: form.timeInForce,
        expiryTime: form.timeInForce === 'GTT' ? form.expiryTime : undefined,
        reduceOnly: form.reduceOnly,
        postOnly: form.postOnly,
      };

      await onSubmit(orderData);
      onClose();
    } catch (error) {
      console.error('Error submitting order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOrderTypeIcon = (type: OrderType) => {
    switch (type) {
      case 'stop_loss':
        return <Shield className="w-4 h-4" />;
      case 'take_profit':
        return <Target className="w-4 h-4" />;
      case 'trailing_stop':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getCurrentOrderType = () => ORDER_TYPES.find(t => t.value === form.type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getOrderTypeIcon(form.type)}
            {editingOrder ? 'Edit Order' : 'Place Advanced Order'}
            <Badge variant="outline" className="ml-2">
              {tradingPair.symbol.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={form.side} onValueChange={(value) => setForm(prev => ({ ...prev, side: value as OrderSide }))}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger 
              value="buy" 
              className="text-crypto-gain data-[state=active]:bg-crypto-gain/20"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Buy {tradingPair.symbol.toUpperCase()}
            </TabsTrigger>
            <TabsTrigger 
              value="sell"
              className="text-crypto-loss data-[state=active]:bg-crypto-loss/20"
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Sell {tradingPair.symbol.toUpperCase()}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={form.side} className="space-y-6">
            {/* Order Type Selection */}
            <div className="space-y-3">
              <Label>Order Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm(prev => ({ ...prev, type: value as OrderType }))}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    {getOrderTypeIcon(form.type)}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {ORDER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {getOrderTypeIcon(type.value as OrderType)}
                        <div>
                          <p className="font-medium">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {getCurrentOrderType() && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {getCurrentOrderType()?.description}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount ({tradingPair.symbol.toUpperCase()})</Label>
                <div className="flex gap-2">
                  {[25, 50, 75, 100].map((percentage) => (
                    <Button
                      key={percentage}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const maxAmount = form.side === 'buy' 
                          ? walletBalance / (form.type === 'market' ? tradingPair.currentPrice : parseFloat(form.price) || tradingPair.currentPrice)
                          : 10; // This would be from position balance
                        const amount = (maxAmount * percentage / 100).toFixed(8);
                        setForm(prev => ({ ...prev, amount }));
                      }}
                      className="text-xs px-2 py-1"
                    >
                      {percentage}%
                    </Button>
                  ))}
                </div>
              </div>
              <Input
                id="amount"
                type="number"
                step="any"
                value={form.amount}
                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00000000"
                className={validationErrors.amount ? 'border-destructive' : ''}
              />
              {validationErrors.amount && (
                <p className="text-destructive text-sm">{validationErrors.amount}</p>
              )}
            </div>

            {/* Price (for limit orders) */}
            {form.type !== 'market' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price">
                    {form.type === 'trailing_stop' ? 'Limit Price (Optional)' : 'Price (USD)'}
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    Current: ${tradingPair.currentPrice.toLocaleString()}
                  </span>
                </div>
                <Input
                  id="price"
                  type="number"
                  step="any"
                  value={form.price}
                  onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder={tradingPair.currentPrice.toString()}
                  className={validationErrors.price ? 'border-destructive' : ''}
                />
                {validationErrors.price && (
                  <p className="text-destructive text-sm">{validationErrors.price}</p>
                )}
              </div>
            )}

            {/* Stop Price (for stop orders) */}
            {['stop_loss', 'take_profit', 'stop_limit'].includes(form.type) && (
              <div className="space-y-2">
                <Label htmlFor="stopPrice">Stop Price (USD)</Label>
                <Input
                  id="stopPrice"
                  type="number"
                  step="any"
                  value={form.stopPrice}
                  onChange={(e) => setForm(prev => ({ ...prev, stopPrice: e.target.value }))}
                  placeholder="0.00"
                  className={validationErrors.stopPrice ? 'border-destructive' : ''}
                />
                {validationErrors.stopPrice && (
                  <p className="text-destructive text-sm">{validationErrors.stopPrice}</p>
                )}
                
                {form.type === 'stop_loss' && form.side === 'sell' && form.stopPrice && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      Will trigger when price drops to ${parseFloat(form.stopPrice).toLocaleString()}
                    </p>
                    <p className={`font-medium ${
                      parseFloat(form.stopPrice) < tradingPair.currentPrice ? 'text-crypto-loss' : 'text-crypto-gain'
                    }`}>
                      {parseFloat(form.stopPrice) < tradingPair.currentPrice ? 'Below' : 'Above'} current price
                      ({((parseFloat(form.stopPrice) - tradingPair.currentPrice) / tradingPair.currentPrice * 100).toFixed(2)}%)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Trailing Stop Configuration */}
            {form.type === 'trailing_stop' && (
              <div className="space-y-4">
                <Label>Trailing Configuration</Label>
                <Tabs value={form.trailingAmount ? 'amount' : 'percent'} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="amount">Fixed Amount</TabsTrigger>
                    <TabsTrigger value="percent">Percentage</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="amount" className="space-y-2">
                    <Input
                      type="number"
                      step="any"
                      value={form.trailingAmount}
                      onChange={(e) => setForm(prev => ({ 
                        ...prev, 
                        trailingAmount: e.target.value,
                        trailingPercent: '' 
                      }))}
                      placeholder="Trail by fixed USD amount"
                    />
                  </TabsContent>
                  
                  <TabsContent value="percent" className="space-y-2">
                    <div className="space-y-2">
                      <Slider
                        value={[parseFloat(form.trailingPercent) || 5]}
                        onValueChange={(value) => setForm(prev => ({ 
                          ...prev, 
                          trailingPercent: value[0].toString(),
                          trailingAmount: ''
                        }))}
                        max={50}
                        min={0.1}
                        step={0.1}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>0.1%</span>
                        <span>{form.trailingPercent}%</span>
                        <span>50%</span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Advanced Options */}
            <div className="space-y-4">
              <Label>Advanced Options</Label>
              
              {/* Time in Force */}
              <div className="space-y-2">
                <Label>Time in Force</Label>
                <Select value={form.timeInForce} onValueChange={(value) => setForm(prev => ({ ...prev, timeInForce: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_IN_FORCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry Time for GTT */}
              {form.timeInForce === 'GTT' && (
                <div className="space-y-2">
                  <Label htmlFor="expiryTime">Expiry Time</Label>
                  <Input
                    id="expiryTime"
                    type="datetime-local"
                    value={form.expiryTime || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, expiryTime: e.target.value }))}
                    min={new Date().toISOString().slice(0, 16)}
                    className={validationErrors.expiryTime ? 'border-destructive' : ''}
                  />
                  {validationErrors.expiryTime && (
                    <p className="text-destructive text-sm">{validationErrors.expiryTime}</p>
                  )}
                </div>
              )}

              {/* Additional Flags */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Post Only</Label>
                    <p className="text-xs text-muted-foreground">Only add liquidity, never take</p>
                  </div>
                  <Switch
                    checked={form.postOnly}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, postOnly: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reduce Only</Label>
                    <p className="text-xs text-muted-foreground">Only reduce position size</p>
                  </div>
                  <Switch
                    checked={form.reduceOnly}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, reduceOnly: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                <Label>Order Summary</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">{orderDetails.amount.toFixed(8)} {tradingPair.symbol.toUpperCase()}</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">
                    {form.type === 'market' ? 'Est. Price' : 'Price'}
                  </p>
                  <p className="font-medium">${orderDetails.price.toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">${orderDetails.total.toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Est. Fee</p>
                  <p className="font-medium">${orderDetails.fee.toFixed(2)}</p>
                </div>
              </div>

              {orderDetails.hasInsufficientBalance && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Insufficient balance. Required: ${orderDetails.totalWithFee.toLocaleString()}, 
                    Available: ${walletBalance.toLocaleString()}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || orderDetails.hasInsufficientBalance}
                className={`flex-1 ${
                  form.side === 'buy' 
                    ? 'bg-crypto-gain hover:bg-crypto-gain/90' 
                    : 'bg-crypto-loss hover:bg-crypto-loss/90'
                }`}
              >
                {isSubmitting ? 'Placing Order...' : `${form.side.toUpperCase()} ${tradingPair.symbol.toUpperCase()}`}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
