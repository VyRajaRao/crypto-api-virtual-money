import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Palette, Bell, Shield, Database as DatabaseIcon, Sun, Moon, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { CardSkeleton } from '@/components/LoadingSpinner';
import type { Database } from '@/types/database';

type PreferencesRow = Database['public']['Tables']['preferences']['Row'];

interface UserPreferences extends Partial<PreferencesRow> {
  theme?: 'light' | 'dark' | 'system';
  currency?: string;
  notifications_enabled?: boolean;
  price_alerts?: boolean;
  portfolio_alerts?: boolean;
  language?: string;
  timezone?: string;
}

const currencies = [
  { value: 'usd', label: 'USD ($)', symbol: '$' },
  { value: 'eur', label: 'EUR (€)', symbol: '€' },
  { value: 'gbp', label: 'GBP (£)', symbol: '£' },
  { value: 'jpy', label: 'JPY (¥)', symbol: '¥' },
  { value: 'btc', label: 'BTC (₿)', symbol: '₿' },
  { value: 'eth', label: 'ETH (Ξ)', symbol: 'Ξ' }
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' }
];

const timezones = [
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: 'Eastern Time (GMT-5)' },
  { value: 'America/Chicago', label: 'Central Time (GMT-6)' },
  { value: 'America/Denver', label: 'Mountain Time (GMT-7)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (GMT-8)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (GMT+8)' }
];

export default function FastSettings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  
  // Immediate UI state - loads instantly
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: theme,
    currency: 'usd',
    notifications_enabled: true,
    price_alerts: true,
    portfolio_alerts: true,
    language: 'en',
    timezone: 'UTC'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load settings immediately on mount
  useEffect(() => {
    if (user) {
      loadSettingsFast();
    }
  }, [user]);

  const loadSettingsFast = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Show default preferences immediately
      setIsInitialLoad(false);
      
      // Load actual preferences in background
      const { data: userPreferences, error } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error loading preferences:', error);
        // Keep default preferences
      } else if (userPreferences) {
        // Update with actual preferences
        setPreferences(prev => ({
          ...prev,
          ...userPreferences,
          theme: userPreferences.theme as 'light' | 'dark' | 'system' || theme
        }));
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      setIsLoading(false);
      // Keep default preferences on error
    }
  };

  const updatePreference = async (key: keyof UserPreferences, value: any) => {
    if (!user) return;

    // Update UI immediately
    const oldPreferences = { ...preferences };
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);

    // Handle theme change immediately
    if (key === 'theme') {
      setTheme(value);
    }

    try {
      // Save to database in background
      const { error } = await supabase
        .from('preferences')
        .upsert({
          user_id: user.id,
          [key]: value,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Show success without interrupting UX
      setTimeout(() => {
        setHasUnsavedChanges(false);
      }, 1000);
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
      // Revert on error
      setPreferences(oldPreferences);
      if (key === 'theme') {
        setTheme(oldPreferences.theme || 'system');
      }
      toast.error(`Failed to update ${key.replace('_', ' ')}`);
      setHasUnsavedChanges(false);
    }
  };

  const handleBulkSave = async () => {
    if (!user || !hasUnsavedChanges) return;

    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Settings saved successfully');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
        <p className="text-muted-foreground">Please sign in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header - loads immediately */}
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
            Customize your trading experience
          </p>
        </div>
        {hasUnsavedChanges && (
          <Badge variant="secondary" className="animate-pulse">
            Saving changes...
          </Badge>
        )}
      </motion.div>

      {isInitialLoad ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* User Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Profile Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={user.email || ''}
                      disabled
                      className="bg-muted/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-id">User ID</Label>
                    <Input
                      id="user-id"
                      value={user.id}
                      disabled
                      className="bg-muted/50 font-mono text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Appearance Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/20">
                    <Palette className="w-5 h-5 text-secondary" />
                  </div>
                  <CardTitle>Appearance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {preferences.theme === 'dark' ? (
                      <Moon className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Sun className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <Label>Theme</Label>
                      <p className="text-sm text-muted-foreground">
                        Choose your preferred color theme
                      </p>
                    </div>
                  </div>
                  <Select
                    value={preferences.theme || 'system'}
                    onValueChange={(value) => updatePreference('theme', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>Language</Label>
                      <p className="text-sm text-muted-foreground">
                        Select your preferred language
                      </p>
                    </div>
                  </div>
                  <Select
                    value={preferences.language || 'en'}
                    onValueChange={(value) => updatePreference('language', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Trading Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-3/20">
                    <DatabaseIcon className="w-5 h-5 text-chart-3" />
                  </div>
                  <CardTitle>Trading Preferences</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Default Currency</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred currency for prices and calculations
                    </p>
                  </div>
                  <Select
                    value={preferences.currency || 'usd'}
                    onValueChange={(value) => updatePreference('currency', value)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(currency => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Timezone</Label>
                    <p className="text-sm text-muted-foreground">
                      Set your timezone for accurate timestamps
                    </p>
                  </div>
                  <Select
                    value={preferences.timezone || 'UTC'}
                    onValueChange={(value) => updatePreference('timezone', value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map(timezone => (
                        <SelectItem key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-4/20">
                    <Bell className="w-5 h-5 text-chart-4" />
                  </div>
                  <CardTitle>Notifications</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive browser notifications for important updates
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifications_enabled || false}
                    onCheckedChange={(checked) => updatePreference('notifications_enabled', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Price Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when coins reach your target prices
                    </p>
                  </div>
                  <Switch
                    checked={preferences.price_alerts || false}
                    onCheckedChange={(checked) => updatePreference('price_alerts', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Portfolio Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about significant portfolio changes
                    </p>
                  </div>
                  <Switch
                    checked={preferences.portfolio_alerts || false}
                    onCheckedChange={(checked) => updatePreference('portfolio_alerts', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/20">
                    <Shield className="w-5 h-5 text-destructive" />
                  </div>
                  <CardTitle>Security</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Account Security</Label>
                    <p className="text-sm text-muted-foreground">
                      Manage your account security settings
                    </p>
                  </div>
                  <Button variant="outline">
                    Change Password
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Export</Label>
                    <p className="text-sm text-muted-foreground">
                      Download your portfolio and trading data
                    </p>
                  </div>
                  <Button variant="outline">
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
