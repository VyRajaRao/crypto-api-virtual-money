import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, TrendingUp, TrendingDown, Medal, Award, Crown, Star, Target, Activity, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderboardEntry {
  user_id: string;
  email: string;
  display_name?: string;
  total_value: number;
  total_pnl: number;
  total_pnl_percentage: number;
  balance: number;
  portfolio_value: number;
  trades_count: number;
  win_rate: number;
  created_at: string;
  rank?: number;
  badge?: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requirement: (entry: LeaderboardEntry) => boolean;
  color: string;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'big_winner',
    name: 'Big Winner',
    description: 'Portfolio value over $150,000',
    icon: <Crown className="w-4 h-4" />,
    requirement: (entry) => entry.total_value > 150000,
    color: 'bg-yellow-500'
  },
  {
    id: 'profit_master',
    name: 'Profit Master',
    description: 'Over 100% total returns',
    icon: <Trophy className="w-4 h-4" />,
    requirement: (entry) => entry.total_pnl_percentage > 100,
    color: 'bg-green-500'
  },
  {
    id: 'active_trader',
    name: 'Active Trader',
    description: 'Executed over 50 trades',
    icon: <Activity className="w-4 h-4" />,
    requirement: (entry) => entry.trades_count > 50,
    color: 'bg-blue-500'
  },
  {
    id: 'consistent_winner',
    name: 'Consistent Winner',
    description: 'Win rate over 70%',
    icon: <Target className="w-4 h-4" />,
    requirement: (entry) => entry.win_rate > 0.7,
    color: 'bg-purple-500'
  },
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined in the first week',
    icon: <Star className="w-4 h-4" />,
    requirement: (entry) => new Date(entry.created_at) < new Date('2024-01-07'),
    color: 'bg-pink-500'
  }
];

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all_time');
  const [selectedMetric, setSelectedMetric] = useState('total_value');

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedPeriod, selectedMetric]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      // Fetch user wallet data with calculated metrics
      const { data: walletData, error } = await supabase
        .from('wallet')
        .select(`
          user_id,
          balance,
          total_value,
          total_pnl,
          portfolio_value,
          created_at
        `);

      if (error) throw error;

      // Get user emails (anonymized for privacy)
      const userIds = walletData?.map(w => w.user_id) || [];
      const { data: userData } = await supabase.auth.admin.listUsers();

      // Calculate additional metrics for each user
      const leaderboardData = await Promise.all(
        (walletData || []).map(async (wallet) => {
          // Get trade statistics
          const { data: tradesData } = await supabase
            .from('trades')
            .select('side, status, total_usd')
            .eq('user_id', wallet.user_id)
            .eq('status', 'filled');

          const trades = tradesData || [];
          const profitableTrades = trades.filter(trade => {
            // This is a simplified calculation - in reality, you'd need more complex logic
            return trade.side === 'sell' && trade.total_usd > 0;
          });

          const winRate = trades.length > 0 ? profitableTrades.length / trades.length : 0;
          const totalPnlPercentage = wallet.balance > 0 
            ? (wallet.total_pnl / (wallet.balance - wallet.total_pnl)) * 100 
            : 0;

          // Find user email (anonymized)
          const userData = await supabase.auth.admin.getUserById(wallet.user_id);
          const email = userData.data.user?.email || 'Unknown';
          const displayName = email.split('@')[0] + '***'; // Anonymize email

          return {
            user_id: wallet.user_id,
            email: displayName,
            total_value: wallet.total_value || 0,
            total_pnl: wallet.total_pnl || 0,
            total_pnl_percentage: totalPnlPercentage,
            balance: wallet.balance || 0,
            portfolio_value: wallet.portfolio_value || 0,
            trades_count: trades.length,
            win_rate: winRate,
            created_at: wallet.created_at
          };
        })
      );

      // Sort by selected metric
      const sortedData = leaderboardData.sort((a, b) => {
        switch (selectedMetric) {
          case 'total_value':
            return b.total_value - a.total_value;
          case 'total_pnl':
            return b.total_pnl - a.total_pnl;
          case 'total_pnl_percentage':
            return b.total_pnl_percentage - a.total_pnl_percentage;
          case 'win_rate':
            return b.win_rate - a.win_rate;
          default:
            return b.total_value - a.total_value;
        }
      });

      // Add ranks and achievements
      const rankedData = sortedData.map((entry, index) => ({
        ...entry,
        rank: index + 1,
        achievements: ACHIEVEMENTS.filter(achievement => achievement.requirement(entry))
      }));

      setLeaderboard(rankedData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentUserEntry = leaderboard.find(entry => entry.user_id === user?.id);
  const topPerformers = leaderboard.slice(0, 10);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-2xl font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-600';
      default:
        return 'bg-gradient-to-r from-slate-600 to-slate-700';
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">Please sign in to view the leaderboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Compete with other virtual traders
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total_value">Total Value</SelectItem>
              <SelectItem value="total_pnl">Total P&L</SelectItem>
              <SelectItem value="total_pnl_percentage">P&L Percentage</SelectItem>
              <SelectItem value="win_rate">Win Rate</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="weekly">This Week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Current User Rank */}
      {currentUserEntry && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getRankIcon(currentUserEntry.rank!)}
                    <div>
                      <p className="font-semibold">Your Rank</p>
                      <p className="text-sm text-muted-foreground">
                        #{currentUserEntry.rank} of {leaderboard.length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {selectedMetric === 'total_value' && `$${currentUserEntry.total_value.toLocaleString()}`}
                    {selectedMetric === 'total_pnl' && `$${currentUserEntry.total_pnl.toLocaleString()}`}
                    {selectedMetric === 'total_pnl_percentage' && `${currentUserEntry.total_pnl_percentage.toFixed(1)}%`}
                    {selectedMetric === 'win_rate' && `${(currentUserEntry.win_rate * 100).toFixed(1)}%`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentUserEntry.trades_count} trades
                  </p>
                </div>
              </div>

              {/* Progress to next rank */}
              {currentUserEntry.rank! > 1 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Progress to Rank #{currentUserEntry.rank! - 1}</span>
                    <span>
                      {((currentUserEntry.total_value / topPerformers[currentUserEntry.rank! - 2]?.total_value) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(currentUserEntry.total_value / topPerformers[currentUserEntry.rank! - 2]?.total_value) * 100}
                    className="h-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Leaderboard */}
      <Tabs defaultValue="leaderboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leaderboard">Top Traders</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          {/* Top 3 Podium */}
          {topPerformers.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="order-1"
              >
                <Card className="text-center p-4 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                  <Medal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm mb-1">2nd Place</h3>
                  <p className="text-xs text-muted-foreground mb-2">{topPerformers[1].email}</p>
                  <p className="text-lg font-bold">
                    ${topPerformers[1].total_value.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">
                    +{topPerformers[1].total_pnl_percentage.toFixed(1)}%
                  </p>
                </Card>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="order-2"
              >
                <Card className="text-center p-6 bg-gradient-to-b from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 transform scale-110">
                  <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <h3 className="font-bold mb-1">Champion</h3>
                  <p className="text-sm text-muted-foreground mb-3">{topPerformers[0].email}</p>
                  <p className="text-2xl font-bold">
                    ${topPerformers[0].total_value.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600">
                    +{topPerformers[0].total_pnl_percentage.toFixed(1)}%
                  </p>
                </Card>
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="order-3"
              >
                <Card className="text-center p-4 bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800">
                  <Award className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm mb-1">3rd Place</h3>
                  <p className="text-xs text-muted-foreground mb-2">{topPerformers[2].email}</p>
                  <p className="text-lg font-bold">
                    ${topPerformers[2].total_value.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">
                    +{topPerformers[2].total_pnl_percentage.toFixed(1)}%
                  </p>
                </Card>
              </motion.div>
            </div>
          )}

          {/* Full Leaderboard */}
          <div className="space-y-2">
            <AnimatePresence>
              {leaderboard.map((entry, index) => (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${entry.user_id === user?.id ? 'ring-2 ring-primary' : ''}`}
                >
                  <Card className={`p-4 ${getRankColor(entry.rank!)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 min-w-[60px]">
                          {getRankIcon(entry.rank!)}
                        </div>
                        
                        <div>
                          <p className="font-semibold text-white">
                            {entry.email}
                            {entry.user_id === user?.id && (
                              <Badge variant="secondary" className="ml-2">You</Badge>
                            )}
                          </p>
                          <div className="flex gap-2 mt-1">
                            {/* Show achievements */}
                            {(entry as any).achievements?.slice(0, 3).map((achievement: Achievement) => (
                              <Badge
                                key={achievement.id}
                                variant="secondary"
                                className={`${achievement.color} text-white text-xs`}
                              >
                                {achievement.icon}
                                <span className="ml-1">{achievement.name}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right text-white">
                        <p className="text-lg font-bold">
                          {selectedMetric === 'total_value' && `$${entry.total_value.toLocaleString()}`}
                          {selectedMetric === 'total_pnl' && `$${entry.total_pnl.toLocaleString()}`}
                          {selectedMetric === 'total_pnl_percentage' && `${entry.total_pnl_percentage.toFixed(1)}%`}
                          {selectedMetric === 'win_rate' && `${(entry.win_rate * 100).toFixed(1)}%`}
                        </p>
                        <div className="flex items-center gap-1 text-sm opacity-80">
                          <Activity className="w-3 h-3" />
                          {entry.trades_count} trades
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACHIEVEMENTS.map((achievement) => {
              const userHasAchievement = currentUserEntry && achievement.requirement(currentUserEntry);
              
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`${userHasAchievement ? 'opacity-100' : 'opacity-60'}`}
                >
                  <Card className={`p-4 ${userHasAchievement ? achievement.color : 'bg-muted'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${userHasAchievement ? 'bg-white/20' : 'bg-muted'}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${userHasAchievement ? 'text-white' : ''}`}>
                          {achievement.name}
                        </h3>
                        <p className={`text-sm ${userHasAchievement ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {achievement.description}
                        </p>
                      </div>
                      {userHasAchievement && (
                        <Badge variant="secondary" className="bg-white/20 text-white">
                          Earned
                        </Badge>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;
