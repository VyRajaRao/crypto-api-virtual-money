import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { securityUtils } from '@/lib/security';
import { toast } from 'sonner';

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: string | null;
  trustedDevices: string[];
  loginHistory: Array<{
    deviceId: string;
    timestamp: string;
    location?: string;
    ipAddress?: string;
    userAgent?: string;
  }>;
  securityScore: number;
}

interface SecuritySession {
  isValid: boolean;
  expiresAt: number;
  deviceId: string;
}

export const useSecurity = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    lastPasswordChange: null,
    trustedDevices: [],
    loginHistory: [],
    securityScore: 0
  });
  const [session, setSession] = useState<SecuritySession | null>(null);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);

  // Load security settings
  const loadSecuritySettings = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: settings, error } = await supabase
        .from('user_security_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (settings) {
        setSecuritySettings({
          twoFactorEnabled: settings.two_factor_enabled || false,
          lastPasswordChange: settings.last_password_change,
          trustedDevices: settings.trusted_devices || [],
          loginHistory: settings.login_history || [],
          securityScore: calculateSecurityScore(settings)
        });
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Calculate security score based on settings
  const calculateSecurityScore = (settings: any): number => {
    let score = 0;
    
    if (settings.two_factor_enabled) score += 40;
    if (settings.last_password_change) {
      const daysSinceChange = (Date.now() - new Date(settings.last_password_change).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceChange < 90) score += 30;
      else if (daysSinceChange < 180) score += 20;
      else score += 10;
    }
    if (settings.trusted_devices && settings.trusted_devices.length <= 3) score += 15;
    if (settings.security_questions_set) score += 15;
    
    return Math.min(100, score);
  };

  // Session management
  const checkSessionValidity = useCallback(() => {
    const sessionData = securityUtils.sessionManager.getSession();
    if (sessionData) {
      setSession({
        isValid: securityUtils.sessionManager.isSessionValid(),
        expiresAt: sessionData.expiresAt,
        deviceId: sessionData.deviceId
      });
    }
  }, []);

  const renewSession = useCallback(() => {
    securityUtils.sessionManager.renewSession();
    checkSessionValidity();
    toast.success('Session renewed successfully');
  }, [checkSessionValidity]);

  const clearSession = useCallback(() => {
    securityUtils.sessionManager.clearSession();
    setSession(null);
    toast.info('Session cleared');
  }, []);

  // Two-Factor Authentication
  const initiateTwoFactorSetup = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const secret = securityUtils.twoFA.generateSecret();
      const qrCodeUrl = securityUtils.twoFA.generateQRCodeUrl(secret, user.email || '');
      const backupCodes = securityUtils.twoFA.generateBackupCodes();

      // Store the secret temporarily in the database (encrypted)
      const { error } = await supabase
        .from('temp_2fa_setup')
        .insert([{
          user_id: user.id,
          secret: securityUtils.crypto.encrypt(secret, user.id),
          backup_codes: backupCodes.map(code => securityUtils.crypto.encrypt(code, user.id)),
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
        }]);

      if (error) throw error;

      setTwoFactorSetup({ secret, qrCodeUrl, backupCodes });
      
      await securityUtils.securityLogger.logSecurityEvent({
        type: '2fa_enabled',
        userId: user.id,
        details: { step: 'setup_initiated' }
      });

    } catch (error) {
      console.error('Failed to initiate 2FA setup:', error);
      toast.error('Failed to set up two-factor authentication');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const completeTwoFactorSetup = useCallback(async (verificationCode: string) => {
    if (!user || !twoFactorSetup) return false;

    try {
      const isValid = securityUtils.twoFA.verifyTOTP(verificationCode, twoFactorSetup.secret);
      
      if (!isValid) {
        toast.error('Invalid verification code');
        return false;
      }

      // Save 2FA settings to database
      const { error: updateError } = await supabase
        .from('user_security_settings')
        .upsert({
          user_id: user.id,
          two_factor_enabled: true,
          two_factor_secret: securityUtils.crypto.encrypt(twoFactorSetup.secret, user.id),
          backup_codes: twoFactorSetup.backupCodes.map(code => securityUtils.crypto.encrypt(code, user.id)),
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;

      // Clean up temporary setup data
      await supabase
        .from('temp_2fa_setup')
        .delete()
        .eq('user_id', user.id);

      setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: true }));
      setTwoFactorSetup(null);

      await securityUtils.securityLogger.logSecurityEvent({
        type: '2fa_enabled',
        userId: user.id,
        details: { step: 'setup_completed' }
      });

      toast.success('Two-factor authentication enabled successfully');
      return true;
    } catch (error) {
      console.error('Failed to complete 2FA setup:', error);
      toast.error('Failed to enable two-factor authentication');
      return false;
    }
  }, [user, twoFactorSetup]);

  const disableTwoFactor = useCallback(async (password: string, verificationCode?: string) => {
    if (!user) return false;

    try {
      // Verify password
      const { data: authData, error: authError } = await supabase.auth.verifyOtp({
        token: password,
        type: 'recovery'
      });

      if (authError) {
        toast.error('Invalid password');
        return false;
      }

      // If 2FA is currently enabled, require verification code
      if (securitySettings.twoFactorEnabled && !verificationCode) {
        toast.error('Verification code required');
        return false;
      }

      if (verificationCode) {
        // Get user's 2FA secret to verify the code
        const { data: settings } = await supabase
          .from('user_security_settings')
          .select('two_factor_secret')
          .eq('user_id', user.id)
          .single();

        if (settings?.two_factor_secret) {
          const secret = securityUtils.crypto.decrypt(settings.two_factor_secret, user.id);
          const isValid = securityUtils.twoFA.verifyTOTP(verificationCode, secret);
          
          if (!isValid) {
            toast.error('Invalid verification code');
            return false;
          }
        }
      }

      // Disable 2FA
      const { error } = await supabase
        .from('user_security_settings')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: false }));

      await securityUtils.securityLogger.logSecurityEvent({
        type: '2fa_disabled',
        userId: user.id
      });

      toast.success('Two-factor authentication disabled');
      return true;
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      toast.error('Failed to disable two-factor authentication');
      return false;
    }
  }, [user, securitySettings.twoFactorEnabled]);

  const verifyTwoFactorCode = useCallback(async (code: string) => {
    if (!user) return false;

    try {
      const { data: settings } = await supabase
        .from('user_security_settings')
        .select('two_factor_secret')
        .eq('user_id', user.id)
        .single();

      if (!settings?.two_factor_secret) return false;

      const secret = securityUtils.crypto.decrypt(settings.two_factor_secret, user.id);
      return securityUtils.twoFA.verifyTOTP(code, secret);
    } catch (error) {
      console.error('Failed to verify 2FA code:', error);
      return false;
    }
  }, [user]);

  // Password management
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) return false;

    try {
      const validation = securityUtils.inputValidator.validatePassword(newPassword);
      if (!validation.valid) {
        toast.error(validation.errors.join(', '));
        return false;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Update security settings
      await supabase
        .from('user_security_settings')
        .upsert({
          user_id: user.id,
          last_password_change: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      await securityUtils.securityLogger.logSecurityEvent({
        type: 'password_change',
        userId: user.id
      });

      toast.success('Password changed successfully');
      return true;
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Failed to change password');
      return false;
    }
  }, [user]);

  // Device management
  const addTrustedDevice = useCallback(async () => {
    if (!user) return;

    try {
      const deviceId = securityUtils.sessionManager.generateDeviceId();
      const { data: currentSettings } = await supabase
        .from('user_security_settings')
        .select('trusted_devices')
        .eq('user_id', user.id)
        .single();

      const trustedDevices = [...(currentSettings?.trusted_devices || []), deviceId];

      await supabase
        .from('user_security_settings')
        .upsert({
          user_id: user.id,
          trusted_devices: trustedDevices,
          updated_at: new Date().toISOString()
        });

      setSecuritySettings(prev => ({ ...prev, trustedDevices }));
      toast.success('Device added to trusted devices');
    } catch (error) {
      console.error('Failed to add trusted device:', error);
      toast.error('Failed to add trusted device');
    }
  }, [user]);

  const removeTrustedDevice = useCallback(async (deviceId: string) => {
    if (!user) return;

    try {
      const trustedDevices = securitySettings.trustedDevices.filter(id => id !== deviceId);

      await supabase
        .from('user_security_settings')
        .update({
          trusted_devices: trustedDevices,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      setSecuritySettings(prev => ({ ...prev, trustedDevices }));
      toast.success('Device removed from trusted devices');
    } catch (error) {
      console.error('Failed to remove trusted device:', error);
      toast.error('Failed to remove trusted device');
    }
  }, [user, securitySettings.trustedDevices]);

  // Load settings on user change
  useEffect(() => {
    if (user) {
      loadSecuritySettings();
      checkSessionValidity();
    }
  }, [user, loadSecuritySettings, checkSessionValidity]);

  // Session validity check interval
  useEffect(() => {
    const interval = setInterval(checkSessionValidity, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkSessionValidity]);

  return {
    // State
    loading,
    securitySettings,
    session,
    twoFactorSetup,

    // Actions
    loadSecuritySettings,
    
    // Session management
    checkSessionValidity,
    renewSession,
    clearSession,
    
    // 2FA
    initiateTwoFactorSetup,
    completeTwoFactorSetup,
    disableTwoFactor,
    verifyTwoFactorCode,
    
    // Password
    changePassword,
    
    // Device management
    addTrustedDevice,
    removeTrustedDevice,

    // Utilities
    securityUtils
  };
};
