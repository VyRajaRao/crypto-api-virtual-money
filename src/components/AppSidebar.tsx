import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Settings,
  Home,
  Search,
  Activity,
  Zap,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Trends", url: "/trends", icon: TrendingUp },
  { title: "Analysis", url: "/analysis", icon: BarChart3 },
  { title: "Portfolio", url: "/portfolio", icon: Wallet },
  { title: "Settings", url: "/settings", icon: Settings },
];

const quickActions = [
  { title: "Market Scanner", url: "/scanner", icon: Search },
  { title: "Price Alerts", url: "/alerts", icon: Zap },
  { title: "Live Trading", url: "/trading", icon: Activity },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isMobile, setIsMobile] = useState(false);

  const isActive = (path: string) => currentPath === path;
  const collapsed = state === "collapsed";

  // Check if mobile and close sidebar on route change
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-close mobile sidebar on navigation
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [currentPath, isMobile, setOpenMobile]);

  const handleNavClick = () => {
    // Additional mobile close trigger for immediate response
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar
      className="border-r border-sidebar-border bg-sidebar transition-all duration-300"
      collapsible="icon"
    >
      <SidebarContent className="p-4">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-neon">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                CryptoVault
              </h1>
            </motion.div>
          )}
        </motion.div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item, index) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <NavLink 
                        to={item.url} 
                        end 
                        onClick={handleNavClick}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200"
                      >
                        <item.icon className="w-5 h-5" />
                        {!collapsed && (
                          <span className="font-medium">
                            {item.title}
                          </span>
                        )}
                      </NavLink>
                    </motion.div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions */}
        {!collapsed && (
          <SidebarGroup className="mt-8">
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Quick Actions
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {quickActions.map((item, index) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                      >
                        <NavLink 
                          to={item.url} 
                          onClick={handleNavClick}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200"
                        >
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-sidebar-foreground">
                            {item.title}
                          </span>
                        </NavLink>
                      </motion.div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Market Status Indicator */}
        <motion.div
          className={`mt-auto ${collapsed ? "px-2" : "px-4"} py-3`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-crypto-gain rounded-full animate-glow-pulse"></div>
            {!collapsed && (
              <span className="text-xs text-muted-foreground">
                Market Live
              </span>
            )}
          </div>
        </motion.div>
      </SidebarContent>
    </Sidebar>
  );
}