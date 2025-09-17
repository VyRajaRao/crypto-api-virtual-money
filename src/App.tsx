import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Suspense, lazy, useEffect } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { appOrchestrator } from "@/services/appOrchestrator";
import { SimulatorProvider } from "@/contexts/SimulatorContext";
import { cleanupExpiredStorage, appRecoveryManager } from "@/utils/statePersistence";
import "@/styles/mobile-utils.css";

// Lazy load pages for better performance
const Index = lazy(() => import("@/pages/Index"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const FastPortfolio = lazy(() => import("@/pages/FastPortfolio"));
const ConnectedPortfolio = lazy(() => import("@/pages/ConnectedPortfolio"));
const ConnectedLiveTrading = lazy(() => import("@/pages/ConnectedLiveTrading"));
const ConnectedPriceAlerts = lazy(() => import("@/pages/ConnectedPriceAlerts"));
const IntegratedPortfolio = lazy(() => import("@/pages/IntegratedPortfolio"));
const WidgetDashboard = lazy(() => import("@/pages/WidgetDashboard"));
const Trends = lazy(() => import("@/pages/Trends"));
const TopCoinsAnalysis = lazy(() => import("@/pages/TopCoinsAnalysis"));
const FastSettings = lazy(() => import("@/pages/FastSettings"));
const Auth = lazy(() => import("@/pages/Auth"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const MarketScanner = lazy(() => import("@/pages/MarketScanner"));
const FastPriceAlerts = lazy(() => import("@/pages/FastPriceAlerts"));
const FastLiveTrading = lazy(() => import("@/pages/FastLiveTrading"));
const EnhancedPriceAlerts = lazy(() => import("@/pages/EnhancedPriceAlerts"));
const EnhancedLiveTrading = lazy(() => import("@/pages/EnhancedLiveTrading"));
const CoinDetail = lazy(() => import("@/pages/CoinDetail"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Component to initialize app store with user data
function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setUser } = useAppStore();

  useEffect(() => {
    setUser(user);
  }, [user, setUser]);

  // Initialize app orchestrator on mount
  useEffect(() => {
    appOrchestrator.initialize();
    
    // Setup auth state listener
    const handleAuthChange = (user: any) => {
      appOrchestrator.onAuthStateChange(user);
    };
    
    // Listen for auth changes
    handleAuthChange(user);
    
    // Cleanup on unmount
    return () => {
      // Don't shutdown completely as other users might be using the app
      // appOrchestrator.shutdown();
    };
  }, [user]);

  return <>{children}</>;
}

function App() {
  useEffect(() => {
    // Add mobile optimization class to body
    document.body.classList.add('mobile-optimized');
    
    // Add viewport meta tag if it doesn't exist
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
      document.head.appendChild(viewport);
    }
    
    // Prevent zoom on input focus for iOS
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        if (window.innerWidth < 768) {
          const viewport = document.querySelector('meta[name="viewport"]');
          if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
          }
        }
      });
      
      input.addEventListener('blur', () => {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
        }
      });
    });
    
    // Add error boundary for unhandled errors
    const handleUnhandledError = (event: ErrorEvent) => {
      console.error('Unhandled error:', event.error);
      // Don't show error boundary for network errors, let components handle them
      if (event.error && event.error.name !== 'NetworkError') {
        // Log to analytics if available
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'exception', {
            description: event.error.message,
            fatal: false
          });
        }
      }
    };
    
    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Prevent default behavior for network errors
      if (event.reason && (event.reason.name === 'NetworkError' || event.reason.message?.includes('fetch'))) {
        event.preventDefault();
      }
    });
    
    // Initialize state persistence utilities
    cleanupExpiredStorage();
    
    // Check for recovery state on app start
    const recoveryState = appRecoveryManager.getRecoveryState();
    if (recoveryState && appRecoveryManager.needsRecovery()) {
      console.log('Recovery state available:', recoveryState);
      // Recovery will be performed when user navigates or interacts with the app
    }
    
    // Save recovery state periodically
    const saveRecoveryState = () => {
      appRecoveryManager.saveRecoveryState({
        route: window.location.pathname + window.location.search,
        scrollPosition: window.scrollY
      });
    };
    
    // Save state on navigation and scroll
    window.addEventListener('beforeunload', saveRecoveryState);
    window.addEventListener('scroll', () => {
      // Throttle scroll events
      clearTimeout((window as any).scrollTimeout);
      (window as any).scrollTimeout = setTimeout(saveRecoveryState, 500);
    });
    
    return () => {
      document.body.classList.remove('mobile-optimized');
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('beforeunload', saveRecoveryState);
      clearTimeout((window as any).scrollTimeout);
    };
  }, []);
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SimulatorProvider>
          <AuthProvider>
            <AppStoreProvider>
            <Router>
              <Suspense fallback={<div className="min-h-screen error-state-mobile"><LoadingSpinner message="Loading application..." /></div>}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route
                    path="/*"
                    element={
                      <Layout>
                        <Suspense fallback={<div className="error-state-mobile"><LoadingSpinner message="Loading page..." /></div>}>
                          <Routes>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/portfolio" element={<ConnectedPortfolio />} />
                            <Route path="/portfolio/fast" element={<FastPortfolio />} />
                            <Route path="/dashboard/widgets" element={<WidgetDashboard />} />
                            <Route path="/trends" element={<Trends />} />
                            <Route path="/analysis" element={<TopCoinsAnalysis />} />
                            <Route path="/settings" element={<FastSettings />} />
                            <Route path="/scanner" element={<MarketScanner />} />
                            <Route path="/alerts" element={<ConnectedPriceAlerts />} />
                            <Route path="/trading" element={<ConnectedLiveTrading />} />
                            <Route path="/leaderboard" element={<Leaderboard />} />
                            <Route path="/coins/:id" element={<CoinDetail />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                      </Layout>
                    }
                  />
                </Routes>
              </Suspense>
              <Toaster />
            </Router>
            </AppStoreProvider>
          </AuthProvider>
        </SimulatorProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;