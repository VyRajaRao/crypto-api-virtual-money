import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, Shield, Zap, LogIn, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                CryptoTracker
              </h1>
            </div>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The ultimate crypto & stock tracking platform with real-time data, 
              portfolio management, and advanced analytics
            </p>
            
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
                <Link to={user ? "/dashboard" : "/auth"} className="flex items-center gap-2">
                  {user ? "Dashboard" : "Get Started"} <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              {!user && (
                <Button asChild variant="outline" size="lg">
                  <Link to="/auth" className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" /> Sign In
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-8"
          >
            <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Real-time charts, technical indicators, and market analysis tools
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Secure Portfolio</CardTitle>
                <CardDescription>
                  Track your investments with bank-level security and privacy
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Live Data</CardTitle>
                <CardDescription>
                  Real-time market data powered by CoinGecko API
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}