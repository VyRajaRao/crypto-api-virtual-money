import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SearchBar } from "@/components/SearchBar";
import { motion } from "framer-motion";
import { Bell, User, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { ARIA_LABELS, prefersReducedMotion } from "../utils/accessibility";
import { useState, useEffect } from 'react';
import { useAlerts } from '@/hooks/useSupabase';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, loading, signOut } = useAuth();
  const { alerts } = useAlerts();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Get real notification count from alerts
  const notificationCount = alerts?.filter(alert => !alert.read).length || 0;

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show loading state with accessibility
  if (loading) {
    return (
      <div 
        className="min-h-screen error-state-mobile bg-background"
        role="status"
        aria-live="polite"
        aria-label={ARIA_LABELS.loading}
      >
        <div className="animate-pulse text-lg text-muted-foreground">
          <span className="sr-only">{ARIA_LABELS.loading}</span>
          Loading...
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
  };

  // Motion settings based on user preferences
  const motionSettings = reducedMotion ? 
    { initial: {}, animate: {}, transition: { duration: 0 } } :
    { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

  return (
    <>
      {/* Skip link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-link focus:ring-accessible"
      >
        Skip to main content
      </a>
      
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background touch-optimized">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col mobile-safe-area">
            {/* Header */}
            <motion.header
              {...motionSettings}
              className="h-14 sm:h-16 flex items-center justify-between container-mobile border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50 mobile-safe-area landscape:h-12"
              role="banner"
            >
              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <SidebarTrigger 
                  className="hover:bg-secondary/50 transition-colors duration-200 focus:ring-accessible min-h-[44px] min-w-[44px] shrink-0 touch-target"
                  aria-label={ARIA_LABELS.sidebarToggle}
                />
                <div className="flex-1 max-w-sm sm:max-w-md min-w-0">
                  <SearchBar />
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-3">
                {/* Notification bell - only show when there are notifications */}
                {notificationCount > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative hover:bg-secondary/50 transition-colors duration-200 focus:ring-accessible min-h-[44px] min-w-[44px] touch-target"
                    aria-label={`Notifications (${notificationCount} unread)`}
                    aria-describedby="notification-count"
                  >
                    <Bell className="w-5 h-5" aria-hidden="true" />
                    <span 
                      className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                      id="notification-count"
                      aria-label={`${notificationCount} unread notifications`}
                    >
                      <span className="text-xs text-destructive-foreground font-bold">
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </span>
                    </span>
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-secondary/50 transition-colors duration-200 focus:ring-accessible min-h-[44px] min-w-[44px] touch-target"
                      aria-label="User menu"
                    >
                      <User className="w-5 h-5" aria-hidden="true" />
                      <span className="sr-only">Open user menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-56"
                    role="menu"
                    aria-label="User account options"
                  >
                    <DropdownMenuItem 
                      disabled 
                      className="flex flex-col items-start"
                      role="menuitem"
                    >
                      <div className="font-medium">{user.email}</div>
                      <div className="text-xs text-muted-foreground">Signed in as</div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleSignOut} 
                      className="text-red-600 focus:ring-accessible"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.header>

            {/* Main Content */}
            <main 
              id="main-content"
              className="flex-1 overflow-auto mobile-scrollable overscroll-contain landscape:overflow-y-auto"
              role="main"
              tabIndex={-1}
            >
              <motion.div
                {...(reducedMotion ? 
                  { initial: {}, animate: {}, transition: { duration: 0 } } :
                  { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: 0.1 } }
                )}
                className="mobile-safe-area portrait:py-2 landscape:py-1"
              >
                {children}
              </motion.div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}