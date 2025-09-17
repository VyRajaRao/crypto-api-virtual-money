import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings2, User, Palette, Bell, LogOut, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

interface UserPreferences {
  theme: string;
  currency: string;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'dark',
    currency: 'usd'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching preferences:', error);
          toast.error('Failed to load preferences');
        } else if (data) {
          setPreferences({
            theme: data.theme || 'dark',
            currency: data.currency || 'usd'
          });
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  const handleSavePreferences = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('preferences')
        .upsert({
          user_id: user.id,
          theme: preferences.theme,
          currency: preferences.currency
        });

      if (error) throw error;

      toast.success('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Toast is handled in the signOut function
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out. Please try again.');
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-4xl px-4 sm:px-6 pb-4 sm:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base pr-2">
            Manage your account and app preferences
          </p>
        </div>
      </motion.div>

      {/* Account Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ''}
                disabled
                className="bg-background/50 border-border/50 text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if you need to update it.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-sm sm:text-base">User ID</Label>
              <Input
                id="userId"
                value={user.id}
                disabled
                className="bg-background/50 border-border/50 font-mono text-xs sm:text-sm"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* App Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              App Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="theme" className="text-sm sm:text-base">Theme</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, theme: value }))}
                >
                  <SelectTrigger className="bg-background border-border/50 touch-manipulation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm sm:text-base">Default Currency</Label>
                <Select
                  value={preferences.currency}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger className="bg-background border-border/50 touch-manipulation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD - US Dollar</SelectItem>
                    <SelectItem value="eur">EUR - Euro</SelectItem>
                    <SelectItem value="btc">BTC - Bitcoin</SelectItem>
                    <SelectItem value="eth">ETH - Ethereum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 border-t border-border/20">
              <Button
                onClick={handleSavePreferences}
                disabled={isSaving}
                className="bg-gradient-primary hover:shadow-glow transition-all duration-300 touch-manipulation w-full sm:w-auto"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Preferences
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Price Alerts</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Get notified when your assets reach target prices
                </p>
              </div>
              <Switch defaultChecked className="shrink-0" />
            </div>
            
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Portfolio Updates</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Daily summary of your portfolio performance
                </p>
              </div>
              <Switch defaultChecked className="shrink-0" />
            </div>
            
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Market News</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Important market updates and news
                </p>
              </div>
              <Switch className="shrink-0" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Account Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Sign Out</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Sign out of your account on this device
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="flex items-center gap-2 touch-manipulation w-full sm:w-auto shrink-0"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}