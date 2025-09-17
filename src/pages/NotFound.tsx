import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Home, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    
    // Log to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_not_found', {
        page_path: location.pathname,
        custom_parameter: location.search
      });
    }
  }, [location.pathname, location.search]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Wait a moment and try to reload the page
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.reload();
    } catch (error) {
      console.error('Retry failed:', error);
      setIsRetrying(false);
    }
  };

  const handleGoHome = () => {
    navigate(user ? '/dashboard' : '/', { replace: true });
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      handleGoHome();
    }
  };

  // Determine if this might be a temporary network issue
  const isLikelyNetworkIssue = location.pathname.includes('/api/') || 
    location.search.includes('error=network');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="mb-6">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-xl font-semibold mb-2">
              {isLikelyNetworkIssue ? 'Connection Issue' : 'Page Not Found'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isLikelyNetworkIssue 
                ? 'There seems to be a network connection problem. Please try again.'
                : `The page "${location.pathname}" could not be found.`
              }
            </p>
          </div>
          
          <div className="space-y-3">
            {isLikelyNetworkIssue && (
              <Button 
                onClick={handleRetry} 
                disabled={isRetrying}
                className="w-full"
              >
                {isRetrying ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </Button>
            )}
            
            <Button onClick={handleGoBack} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            
            <Button onClick={handleGoHome} variant="default" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              {user ? 'Go to Dashboard' : 'Go to Home'}
            </Button>
          </div>
          
          {!isLikelyNetworkIssue && (
            <p className="text-xs text-muted-foreground mt-4">
              If you believe this is an error, please contact support.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
