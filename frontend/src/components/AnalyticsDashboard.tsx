import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, BarChart3, Filter } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DailyPnL } from '../App';

interface AnalyticsDashboardProps {
  data: DailyPnL[];
  theme: 'light' | 'dark';
}

type TimeFrame = 'daily' | 'weekly' | 'monthly';

export function AnalyticsDashboard({ data, theme }: AnalyticsDashboardProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('monthly');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');
  const [selectedSide, setSelectedSide] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Extract all unique strategies, symbols from the data
  const { strategies, symbols } = useMemo(() => {
    const strategySet = new Set<string>();
    const symbolSet = new Set<string>();
    data.forEach(day => {
      day.trades.forEach(trade => {
        trade.tags.forEach(tag => strategySet.add(tag));
        symbolSet.add(trade.symbol);
      });
    });
    return {
      strategies: ['all', ...Array.from(strategySet)],
      symbols: ['all', ...Array.from(symbolSet)]
    };
  }, [data]);

  // Filter trades based on all filters
  const filteredTrades = useMemo(() => {
    return data.flatMap(day => {
      // Date range filter
      if (dateRange.start && day.date < dateRange.start) return [];
      if (dateRange.end && day.date > dateRange.end) return [];
      
      return day.trades.filter(trade => {
        if (selectedStrategy !== 'all' && !trade.tags.includes(selectedStrategy)) return false;
        if (selectedSymbol !== 'all' && trade.symbol !== selectedSymbol) return false;
        if (selectedSide !== 'all' && trade.side !== selectedSide) return false;
        return true;
      });
    });
  }, [data, selectedStrategy, selectedSymbol, selectedSide, dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredTrades.length === 0) {
      return {
        totalPnL: 0,
        winRate: 0,
        avgRR: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        avgWin: 0,
        avgLoss: 0,
        maxDrawdown: 0,
        profitFactor: 0,
      };
    }

    const totalPnL = filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winningTrades = filteredTrades.filter(t => t.pnl > 0);
    const losingTrades = filteredTrades.filter(t => t.pnl < 0);
    const winRate = (winningTrades.length / filteredTrades.length) * 100;
    const avgRR = filteredTrades.reduce((sum, t) => sum + t.riskReward, 0) / filteredTrades.length;
    
    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningTotal = 0;
    
    filteredTrades.forEach(trade => {
      runningTotal += trade.pnl;
      if (runningTotal > peak) peak = runningTotal;
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    return {
      totalPnL,
      winRate,
      avgRR,
      totalTrades: filteredTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgWin,
      avgLoss,
      maxDrawdown,
      profitFactor,
    };
  }, [filteredTrades]);

  // Equity Curve Data
  const equityCurveData = useMemo(() => {
    let cumulative = 0;
    const sortedTrades = [...filteredTrades].sort((a, b) => 
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
    );
    
    return sortedTrades.map((trade, index) => {
      cumulative += trade.pnl;
      return {
        index: index + 1,
        equity: cumulative,
        date: trade.date
      };
    });
  }, [filteredTrades]);

  // Win/Loss Distribution Data
  const winLossData = [
    { name: 'Wins', value: stats.winningTrades, color: '#10b981' },
    { name: 'Losses', value: stats.losingTrades, color: '#ef4444' }
  ];

  // Strategy Performance Data
  const strategyData = useMemo(() => {
    const strategyStats = new Map<string, { pnl: number; trades: number }>();
    
    filteredTrades.forEach(trade => {
      trade.tags.forEach(tag => {
        const existing = strategyStats.get(tag) || { pnl: 0, trades: 0 };
        strategyStats.set(tag, {
          pnl: existing.pnl + trade.pnl,
          trades: existing.trades + 1
        });
      });
    });

    return Array.from(strategyStats.entries()).map(([name, data]) => ({
      name,
      pnl: data.pnl,
      trades: data.trades
    })).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  // Time of Day Heatmap Data
  const timeHeatmapData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourStats = new Map<number, { pnl: number; trades: number }>();
    
    filteredTrades.forEach(trade => {
      const hour = parseInt(trade.time.split(':')[0]);
      const existing = hourStats.get(hour) || { pnl: 0, trades: 0 };
      hourStats.set(hour, {
        pnl: existing.pnl + trade.pnl,
        trades: existing.trades + 1
      });
    });

    return hours.map(hour => ({
      hour: `${hour}:00`,
      pnl: hourStats.get(hour)?.pnl || 0,
      trades: hourStats.get(hour)?.trades || 0,
      avgPnl: hourStats.get(hour) ? hourStats.get(hour)!.pnl / hourStats.get(hour)!.trades : 0
    }));
  }, [filteredTrades]);

  const textClass = theme === 'dark' ? 'text-[#E6EDF3]' : 'text-gray-900';
  const textSecondaryClass = theme === 'dark' ? 'text-[#9BA4B5]' : 'text-gray-600';
  const bgClass = theme === 'dark' ? 'bg-[#161B22]' : 'bg-white';
  const borderClass = theme === 'dark' ? 'border-[#2A2F3A]' : 'border-gray-200';
  const cardBgClass = theme === 'dark' ? 'bg-[#1F2633]' : 'bg-gray-50';

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Filter className={`w-5 h-5 ${textSecondaryClass}`} />
          <h3 className={`font-semibold ${textClass}`}>Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Time Frame Filter */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Time Frame</label>
            <select
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
              className={`w-full px-3 py-2 border ${borderClass} rounded text-sm ${
                theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
              }`}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Strategy Filter */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Strategy</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className={`w-full px-3 py-2 border ${borderClass} rounded text-sm ${
                theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
              }`}
            >
              {strategies.map(strategy => (
                <option key={strategy} value={strategy}>
                  {strategy === 'all' ? 'All Strategies' : strategy}
                </option>
              ))}
            </select>
          </div>

          {/* Symbol Filter */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Symbol</label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className={`w-full px-3 py-2 border ${borderClass} rounded text-sm ${
                theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
              }`}
            >
              {symbols.map(symbol => (
                <option key={symbol} value={symbol}>
                  {symbol === 'all' ? 'All Symbols' : symbol}
                </option>
              ))}
            </select>
          </div>

          {/* Side Filter */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Side</label>
            <select
              value={selectedSide}
              onChange={(e) => setSelectedSide(e.target.value)}
              className={`w-full px-3 py-2 border ${borderClass} rounded text-sm ${
                theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
              }`}
            >
              <option value="all">All Sides</option>
              <option value="long">Long Only</option>
              <option value="short">Short Only</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Date Range</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className={`w-full px-2 py-2 border ${borderClass} rounded text-xs ${
                  theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total P&L */}
        <div className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-6`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${textSecondaryClass}`}>Total P&L</span>
            {stats.totalPnL >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className={`text-3xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
          </div>
          <div className={`text-xs ${textSecondaryClass} mt-1`}>{stats.totalTrades} total trades</div>
        </div>

        {/* Win Rate */}
        <div className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-6`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${textSecondaryClass}`}>Win Rate</span>
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div className={`text-3xl font-bold ${textClass}`}>{stats.winRate.toFixed(1)}%</div>
          <div className={`text-xs ${textSecondaryClass} mt-1`}>
            {stats.winningTrades}W / {stats.losingTrades}L
          </div>
        </div>

        {/* Average R:R */}
        <div className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-6`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${textSecondaryClass}`}>Avg Risk:Reward</span>
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div className={`text-3xl font-bold ${textClass}`}>{stats.avgRR.toFixed(2)}</div>
          <div className={`text-xs ${textSecondaryClass} mt-1`}>
            Win: ${stats.avgWin.toFixed(0)} / Loss: ${stats.avgLoss.toFixed(0)}
          </div>
        </div>

        {/* Max Drawdown */}
        <div className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-6`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${textSecondaryClass}`}>Max Drawdown</span>
            <TrendingDown className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-orange-600">-${stats.maxDrawdown.toFixed(2)}</div>
          <div className={`text-xs ${textSecondaryClass} mt-1`}>
            Profit Factor: {stats.profitFactor.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Charts Row 1: Equity Curve & Win/Loss */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Equity Curve */}
        <div className={`lg:col-span-2 ${bgClass} rounded-lg shadow-sm border ${borderClass} p-6`}>
          <h3 className={`font-semibold ${textClass} mb-4`}>Equity Curve</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={equityCurveData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
              <XAxis 
                dataKey="index" 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
              />
              <YAxis 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                  border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '8px'
                }}
                labelStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="equity" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                name="Cumulative P&L"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss Pie Chart */}
        <div className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-6`}>
          <h3 className={`font-semibold ${textClass} mb-4`}>Win/Loss Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={winLossData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {winLossData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                  border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Strategy Performance & Time Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Strategy Performance */}
        <div className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-6`}>
          <h3 className={`font-semibold ${textClass} mb-4`}>Strategy Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={strategyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
              <XAxis 
                dataKey="name" 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                  border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '8px'
                }}
                labelStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
              />
              <Legend />
              <Bar dataKey="pnl" fill="#8b5cf6" name="P&L" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Time of Day Heatmap */}
        <div className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-6`}>
          <h3 className={`font-semibold ${textClass} mb-4`}>Performance by Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeHeatmapData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
              <XAxis 
                dataKey="hour" 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                  border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '8px'
                }}
                labelStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
              />
              <Legend />
              <Bar dataKey="avgPnl" fill="#14b8a6" name="Avg P&L" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}