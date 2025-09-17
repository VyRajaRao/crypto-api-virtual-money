import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the token and type from URL parameters
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        if (!token || !type) {
          setStatus('error');
          setMessage('Invalid verification link. Please try signing up again.');
          return;
        }

        console.log('Processing email verification:', { type, hasToken: !!token });

        if (type === 'signup') {
          // Handle email confirmation
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email'
          });

          if (error) {
            console.error('Email verification error:', error);
            
            if (error.message.includes('expired')) {
              setStatus('expired');
              setMessage('This verification link has expired. Please request a new one.');
            } else if (error.message.includes('already confirmed')) {
              setStatus('success');
              setMessage('Your email is already verified! You can sign in now.');
            } else {
              setStatus('error');
              setMessage(error.message || 'Email verification failed. Please try again.');
            }
            return;
          }

          if (data.user) {
            setStatus('success');
            setMessage('Email verified successfully! You can now sign in to your account.');
            toast.success('Email verified successfully!');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 2000);
          } else {
            setStatus('error');
            setMessage('Email verification failed. Please try again.');
          }
        } else if (type === 'recovery') {
          // Handle password recovery
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });

          if (error) {
            console.error('Password recovery error:', error);
            setStatus('error');
            setMessage('Password recovery link is invalid or expired.');
            return;
          }

          setStatus('success');
          setMessage('Password recovery verified! You can now set a new password.');
          
          // Redirect to password reset form
          setTimeout(() => {
            navigate('/auth?mode=reset-password', { replace: true });
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Unknown verification type. Please try again.');
        }
      } catch (error) {
        console.error('Verification process error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred during verification.');
      }
    };

    handleEmailVerification();
  }, [searchParams, navigate]);

  const handleResendVerification = () => {
    navigate('/auth?action=resend');
  };

  const handleGoToLogin = () => {
    navigate('/auth');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'error':
      case 'expired':
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return <Mail className="w-16 h-16 text-muted-foreground" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying your email...';
      case 'success':
        return 'Email Verified!';
      case 'expired':
        return 'Link Expired';
      case 'error':
        return 'Verification Failed';
      default:
        return 'Email Verification';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
      case 'expired':
        return 'text-red-600';
      case 'loading':
        return 'text-blue-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="bg-gradient-card border-border/50 shadow-glow">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mb-4"
            >
              {getStatusIcon()}
            </motion.div>
            <CardTitle className={`text-2xl font-bold ${getStatusColor()}`}>
              {getStatusTitle()}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground">
                {message}
              </p>
            </div>

            <div className="space-y-3">
              {status === 'success' && (
                <Button 
                  onClick={handleGoToLogin}
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                >
                  Continue to Sign In
                </Button>
              )}

              {(status === 'error' || status === 'expired') && (
                <div className="space-y-2">
                  <Button 
                    onClick={handleResendVerification}
                    className="w-full"
                    variant="outline"
                  >
                    Request New Verification Email
                  </Button>
                  <Button 
                    onClick={handleGoToLogin}
                    className="w-full"
                    variant="ghost"
                  >
                    Back to Sign In
                  </Button>
                </div>
              )}

              {status === 'loading' && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Please wait while we verify your email address...
                  </p>
                </div>
              )}
            </div>

            {(status === 'error' || status === 'expired') && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  💡 <strong>Troubleshooting Tips:</strong>
                </p>
                <ul className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1 space-y-1 ml-4 list-disc">
                  <li>Make sure you clicked the latest email verification link</li>
                  <li>Check that the link hasn't expired (links expire after 24 hours)</li>
                  <li>Clear your browser cache and try again</li>
                  <li>Contact support if problems persist</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
