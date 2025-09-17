import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Calendar, Shield, LogOut, Eye, EyeOff, Key, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/utils/statePersistence';
import { toast } from 'sonner';

export default function Account() {
  const { user, signOut, isDemo } = useAuth();
  const { preferences, updatePreferences } = useUserPreferences();
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsLoading(true);
    
    if (isDemo) {
      // Demo mode - simulate password update
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password updated successfully! (Demo Mode)');
      setIsEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      // Real password update would go here
      toast.info('Password update not implemented for real mode yet');
    }
    
    setIsLoading(false);
  };

  const handleAccountDeletion = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    
    if (!confirmed) return;

    if (isDemo) {
      // Demo mode - clear local storage and sign out
      localStorage.clear();
      toast.success('Demo account deleted successfully');
      await signOut();
    } else {
      toast.info('Account deletion not implemented for real mode yet');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your account</p>
      </div>
    );
  }

  const accountAge = user.created_at ? 
    Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Account Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Information */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDemo && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-4">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium flex items-center gap-2">
                    🎭 Demo Account
                  </p>
                  <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">
                    This is a demo account. All data is stored locally.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{user.email}</p>
                  <p className="text-sm text-muted-foreground">Email address</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Member for {accountAge} days
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.email_confirmed_at ? 'default' : 'destructive'}>
                      {user.email_confirmed_at ? 'Verified' : 'Unverified'}
                    </Badge>
                    {isDemo && (
                      <Badge variant="outline">Demo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Account status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditingPassword ? (
                <div>
                  <p className="font-medium mb-2">Password</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    ••••••••••••
                  </p>
                  <Button 
                    onClick={() => setIsEditingPassword(true)}
                    variant="outline"
                    size="sm"
                  >
                    Change Password
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showPasswords ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-10"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      size="sm"
                    >
                      {isLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingPassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              <Separator />

              <div>
                <p className="font-medium mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Two-Factor Authentication
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  {isDemo ? 'Not available in demo mode' : 'Add an extra layer of security'}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={isDemo}
                >
                  {isDemo ? 'Demo Mode' : 'Enable 2FA'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Account Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Account Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={signOut}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>

              <Button 
                onClick={handleAccountDeletion}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Delete Account
              </Button>
            </div>

            {isDemo && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Demo Account Deletion
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                  Deleting a demo account will clear all local data and cannot be undone.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
