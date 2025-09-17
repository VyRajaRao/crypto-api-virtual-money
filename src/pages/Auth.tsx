import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, UserPlus, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationHelper, setShowVerificationHelper] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const { signIn, signUp, user, loading, isDemo, resendVerificationEmail, resetPassword } = useAuth();

  // Demo account suggestions for easy testing
  const demoAccounts = [
    { email: 'demo@example.com', password: 'demo123' },
    { email: 'test@cryptotracker.com', password: 'test123' }
  ];

  const handleDemoFill = (demoAccount: { email: string; password: string }) => {
    setEmail(demoAccount.email);
    setPassword(demoAccount.password);
    toast.info('Demo credentials filled! Click Sign In to continue.');
  };

  // Redirect if already authenticated
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    // Basic validation
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const result = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (!result.success && result.error) {
        toast.error(result.error);
        
        // Show verification helper if it's an unconfirmed email error
        if (result.error.includes('Email not confirmed') || result.error.includes('not confirmed')) {
          setVerificationEmail(email);
          setShowVerificationHelper(true);
        }
      } else if (result.success && !isLogin) {
        // Handle successful signup
        if (result.needsVerification && !isDemo) {
          // Show verification helper for real mode
          setVerificationEmail(email);
          setShowVerificationHelper(true);
        }
        // Success message is already handled in useAuth
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResending(true);
    try {
      const result = await resendVerificationEmail(verificationEmail);
      if (!result.success && result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast.error('Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(email);
      if (!result.success && result.error) {
        toast.error(result.error);
      } else {
        setShowPasswordReset(false);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Failed to send password reset email');
    } finally {
      setIsLoading(false);
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
              className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4"
            >
              <TrendingUp className="w-8 h-8 text-white" />
            </motion.div>
            {isDemo && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                  🎭 Demo Mode Active
                </p>
                <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">
                  No real authentication required - create any account to test the app
                </p>
              </div>
            )}
            <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {isLogin ? "Welcome Back" : "Join CryptoTracker"}
            </CardTitle>
            <p className="text-muted-foreground">
              {isLogin ? "Sign in to your account" : "Create your account"}
              {isDemo && (
                <span className="block text-xs mt-1 text-yellow-600 dark:text-yellow-400">
                  (Demo mode - all data is local)
                </span>
              )}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-border/50 focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background border-border/50 focus:border-primary pr-10"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {!isLogin && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                    {!isDemo && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        ℹ️ Email verification is optional - you can use the app immediately after signup
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {isLogin ? "Sign In" : "Sign Up"}
                  </div>
                )}
              </Button>
            </form>

            {/* Demo mode quick access */}
            {isDemo && isLogin && (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">Quick Demo Access:</p>
                  <div className="space-y-2">
                    {demoAccounts.map((account, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleDemoFill(account)}
                        className="w-full text-xs font-mono"
                      >
                        {account.email} / {account.password}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Or create any new account with email and password
                  </p>
                </div>
              </div>
            )}

            {/* Email Verification Helper */}
            {showVerificationHelper && !isDemo && (
              <div className="space-y-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h3 className="font-semibold text-blue-600 dark:text-blue-400">
                  📧 Email Verification (Optional)
                </h3>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
                  We've attempted to send a verification email to <strong>{verificationEmail}</strong>.
                  You can use the app immediately, but verifying your email adds extra security.
                </p>
                
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleResendVerification}
                      disabled={isResending}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      {isResending ? 'Sending...' : 'Resend Email'}
                    </Button>
                    <Button
                      onClick={() => setShowVerificationHelper(false)}
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                    >
                      Continue without verification
                    </Button>
                  </div>
                  
                  <p className="text-xs text-blue-600/60 dark:text-blue-400/60">
                    ✨ Tip: Check your spam folder if you don't see the email
                  </p>
                </div>
              </div>
            )}

            {/* Password Reset Helper */}
            {showPasswordReset && !isDemo && (
              <div className="space-y-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <h3 className="font-semibold text-amber-600 dark:text-amber-400">
                  🔑 Reset Your Password
                </h3>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                  Enter your email address to receive password reset instructions.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handlePasswordReset}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Email'}
                  </Button>
                  <Button
                    onClick={() => setShowPasswordReset(false)}
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center space-y-2">
              {/* Forgot Password Link */}
              {isLogin && !isDemo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordReset(!showPasswordReset)}
                  className="text-muted-foreground hover:text-primary text-sm"
                >
                  Forgot your password?
                </Button>
              )}
              
              {/* Sign In/Up Toggle */}
              <Button
                variant="ghost"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setShowPasswordReset(false);
                  setShowVerificationHelper(false);
                }}
                className="text-muted-foreground hover:text-primary"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}