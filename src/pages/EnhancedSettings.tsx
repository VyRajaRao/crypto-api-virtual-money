import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RefreshCw, Palette, DollarSign, Clock, Shield, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Database } from '@/types/database';

type Preferences = Database['public']['Tables']['preferences']['Row'];
type PreferencesInsert = Database['public']['Tables']['preferences']['Insert'];

interface EnhancedSettings extends Preferences {
  email_notifications: boolean;
  price_alerts_enabled: boolean;
  auto_refresh: boolean;
}

export default function EnhancedSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<Partial<EnhancedSettings>>({
    theme: 'dark',
    currency: 'usd',
    refresh_rate: 60,
    email_notifications: false,
    price_alerts_enabled: true,
    auto_refresh: true
  });

  const currencyOptions = [
    { value: 'usd', label: 'USD ($)', symbol: '$' },
    { value: 'eur', label: 'EUR (€)', symbol: '€' },
    { value: 'gbp', label: 'GBP (£)', symbol: '£' },
    { value: 'btc', label: 'Bitcoin (₿)', symbol: '₿' },
    { value: 'eth', label: 'Ethereum (Ξ)', symbol: 'Ξ' }
  ];

  const refreshRateOptions = [
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' },
    { value: 600, label: '10 minutes' }
  ];

  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ];

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setPreferences({
          ...data,
          email_notifications: false, // These would be stored elsewhere in a real app
          price_alerts_enabled: true,
          auto_refresh: true
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) {
      toast.error('Please sign in to save preferences');
      return;
    }

    try {
      setIsSaving(true);
      
      const prefsToSave: PreferencesInsert = {
        user_id: user.id,
        theme: preferences.theme || 'dark',
        currency: preferences.currency || 'usd',
        refresh_rate: preferences.refresh_rate || 60
      };

      const { error } = await supabase
        .from('preferences')
        .upsert(prefsToSave, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success('Preferences saved successfully');
      
      // Apply theme immediately if changed
      if (preferences.theme) {
        document.documentElement.className = preferences.theme;
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setPreferences({
      theme: 'dark',
      currency: 'usd',
      refresh_rate: 60,
      email_notifications: false,
      price_alerts_enabled: true,
      auto_refresh: true
    });
    toast.success('Settings reset to defaults');
  };

  const handlePreferenceChange = (key: keyof EnhancedSettings, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
        <p className="text-muted-foreground">Please sign in to access settings.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize your dashboard experience and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetToDefaults} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={savePreferences} disabled={isSaving} className="bg-gradient-primary">
            {isSaving ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appearance Settings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value) => handlePreferenceChange('theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {themeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Select
                  value={preferences.currency}
                  onValueChange={(value) => handlePreferenceChange('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <span>{option.symbol}</span>
                          <span>{option.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data & Refresh Settings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Data & Refresh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="refresh-rate">Auto Refresh Rate</Label>
                <Select
                  value={preferences.refresh_rate?.toString()}
                  onValueChange={(value) => handlePreferenceChange('refresh_rate', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select refresh rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {refreshRateOptions.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-refresh">Auto Refresh</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically refresh data at set intervals
                  </p>
                </div>
                <Switch
                  id="auto-refresh"
                  checked={preferences.auto_refresh}
                  onCheckedChange={(checked) => handlePreferenceChange('auto_refresh', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications Settings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="price-alerts">Price Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when price targets are hit
                  </p>
                </div>
                <Switch
                  id="price-alerts"
                  checked={preferences.price_alerts_enabled}
                  onCheckedChange={(checked) => handlePreferenceChange('price_alerts_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send alerts and updates to your email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) => handlePreferenceChange('email_notifications', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account & Security */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Account & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed here. Contact support if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label>User ID</Label>
                <Input
                  type="text"
                  value={user.id}
                  disabled
                  className="bg-muted font-mono text-xs"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Data Management</h4>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Export Portfolio Data
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Export Trading History
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => toast.error('This would delete all your data. Feature disabled in demo.')}
                  >
                    Delete All Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Save Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-muted/50 border border-border rounded-lg p-4"
      >
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Settings Information</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your preferences are automatically saved to your account and will be preserved across devices. 
              Changes to theme and currency will take effect immediately, while refresh rate changes apply 
              to new data requests. Some settings may require a page refresh to fully apply.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
