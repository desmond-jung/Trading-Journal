import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { CalendarPage } from './components/pages/CalendarPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { HomePage } from './components/pages/HomePage';
import { ComingSoonPage } from './components/pages/ComingSoonPage';
import { ImportModal } from './components/ImportModal';
import { TradingRulesPanel } from './components/TradingRulesPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { AIInsights } from './components/AIInsights';
import { QueryAssistant } from './components/QueryAssistant';
import { MarketEvents } from './components/MarketEvents';

export interface Trade {
  id: string;
  date: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  riskReward: number;
  tags: string[];
  notes?: string;
  time: string;
  screenshots?: string[];
  account?: string;
  duration?: number; // in minutes
}

export interface DailyPnL {
  date: string;
  pnl: number;
  trades: Trade[];
}

export interface TradingRule {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  currency: string;
  timezone: string;
}

export type PageType = 'home' | 'calendar' | 'dashboard' | 'ai-insights' | 'query' | 'market-events' | 'trade-copier' | 'trading-bot' | 'accounts' | 'connections';

// Mock data for demonstration
const generateMockData = (year: number, month: number): DailyPnL[] => {
  const data: DailyPnL[] = [];
  const strategies = ['Breakout', 'Scalp', 'Reversal', 'Trend Following', 'Support/Resistance'];
  const symbols = ['/ES', '/NQ', '/MNQ', '/YM', '/RTY', '/MES', '/GC', '/MGC', '/CL', '/NKD'];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const numTrades = Math.floor(Math.random() * 5) + 1;
    const trades: Trade[] = [];
    let dailyPnL = 0;
    
    for (let i = 0; i < numTrades; i++) {
      const pnl = (Math.random() - 0.45) * 500;
      dailyPnL += pnl;
      
      trades.push({
        id: `trade-${year}-${month}-${day}-${i}`,
        date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        side: Math.random() > 0.5 ? 'long' : 'short',
        entryPrice: 100 + Math.random() * 400,
        exitPrice: 100 + Math.random() * 400,
        quantity: Math.floor(Math.random() * 100) + 10,
        pnl: pnl,
        riskReward: Math.random() * 4 + 0.5,
        tags: [strategies[Math.floor(Math.random() * strategies.length)]],
        time: `${Math.floor(Math.random() * 12) + 8}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        notes: Math.random() > 0.7 ? 'Good setup, followed my rules' : undefined,
        screenshots: [],
        account: 'Account1',
        duration: Math.floor(Math.random() * 60) + 10
      });
    }
    
    data.push({
      date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
      pnl: dailyPnL,
      trades: trades
    });
  }
  
  return data;
};

const defaultRules: TradingRule[] = [
  { id: '1', title: 'Wait for confirmation', description: 'Wait for price action to confirm the setup before entering', enabled: true },
  { id: '2', title: 'Check higher timeframe', description: 'Always check the higher timeframe trend before taking a trade', enabled: true },
  { id: '3', title: 'Risk management', description: 'Never risk more than 1% of account on a single trade', enabled: true },
  { id: '4', title: 'Take profit at target', description: 'Don\'t be greedy, take profit when target is reached', enabled: true },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(1);
  const [tradeData, setTradeData] = useState<DailyPnL[]>(() => {
    // Generate January 2026 data
    const jan2026 = generateMockData(2026, 1);
    // Generate December 2025 data (last 6 days)
    const dec2025 = generateMockData(2025, 12).filter(day => {
      const dayNum = parseInt(day.date.split('-')[2]);
      return dayNum >= 26; // Dec 26-31
    });
    return [...dec2025, ...jan2026];
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRulesPanel, setShowRulesPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [tradingRules, setTradingRules] = useState<TradingRule[]>(defaultRules);
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    currency: 'USD',
    timezone: 'America/New_York'
  });

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    // In production, this would fetch data from your API
    setTradeData(generateMockData(year, month));
  };

  const handleImportTrades = (trades: Trade[]) => {
    // Group trades by date
    const tradesByDate = new Map<string, Trade[]>();
    
    trades.forEach(trade => {
      const existing = tradesByDate.get(trade.date) || [];
      tradesByDate.set(trade.date, [...existing, trade]);
    });

    // Update trade data
    const newData = [...tradeData];
    tradesByDate.forEach((dayTrades, date) => {
      const existingDayIndex = newData.findIndex(d => d.date === date);
      const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
      
      if (existingDayIndex >= 0) {
        newData[existingDayIndex].trades.push(...dayTrades);
        newData[existingDayIndex].pnl += dayPnL;
      } else {
        newData.push({
          date,
          pnl: dayPnL,
          trades: dayTrades
        });
      }
    });

    setTradeData(newData.sort((a, b) => a.date.localeCompare(b.date)));
    setShowImportModal(false);
  };

  const handleUpdateTrades = (date: string, updatedTrades: Trade[]) => {
    const newData = tradeData.map(day => {
      if (day.date === date) {
        const newPnL = updatedTrades.reduce((sum, t) => sum + t.pnl, 0);
        return { ...day, trades: updatedTrades, pnl: newPnL };
      }
      return day;
    });
    setTradeData(newData);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage theme={settings.theme} onNavigate={setCurrentPage} />;
      case 'calendar':
        return (
          <CalendarPage
            tradeData={tradeData}
            currentYear={currentYear}
            currentMonth={currentMonth}
            onMonthChange={handleMonthChange}
            onUpdateTrades={handleUpdateTrades}
            theme={settings.theme}
          />
        );
      case 'dashboard':
        return <DashboardPage data={tradeData} theme={settings.theme} />;
      case 'ai-insights':
        return (
          <div className="p-8">
            <h1 className={`text-3xl font-bold mb-6 ${settings.theme === 'dark' ? 'text-[#E6EDF3]' : 'text-gray-900'}`}>
              AI Insights
            </h1>
            <AIInsights theme={settings.theme} />
          </div>
        );
      case 'query':
        return (
          <div className="p-8">
            <h1 className={`text-3xl font-bold mb-6 ${settings.theme === 'dark' ? 'text-[#E6EDF3]' : 'text-gray-900'}`}>
              Ask AI
            </h1>
            <QueryAssistant theme={settings.theme} />
          </div>
        );
      case 'market-events':
        return (
          <div className="p-8">
            <h1 className={`text-3xl font-bold mb-6 ${settings.theme === 'dark' ? 'text-[#E6EDF3]' : 'text-gray-900'}`}>
              Market Events
            </h1>
            <MarketEvents theme={settings.theme} />
          </div>
        );
      case 'trade-copier':
        return <ComingSoonPage title="Trade Copier" theme={settings.theme} />;
      case 'trading-bot':
        return <ComingSoonPage title="Trading Bot" theme={settings.theme} />;
      case 'accounts':
        return <ComingSoonPage title="Accounts" theme={settings.theme} />;
      case 'connections':
        return <ComingSoonPage title="Connections" theme={settings.theme} />;
      default:
        return <HomePage theme={settings.theme} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className={`flex h-screen ${settings.theme === 'dark' ? 'bg-[#0E1117]' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onShowImport={() => setShowImportModal(true)}
        onShowRules={() => setShowRulesPanel(true)}
        onShowSettings={() => setShowSettingsPanel(true)}
        theme={settings.theme}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderPage()}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportTrades}
          theme={settings.theme}
        />
      )}

      {/* Trading Rules Panel */}
      {showRulesPanel && (
        <TradingRulesPanel
          rules={tradingRules}
          onClose={() => setShowRulesPanel(false)}
          onUpdateRules={setTradingRules}
          theme={settings.theme}
        />
      )}

      {/* Settings Panel */}
      {showSettingsPanel && (
        <SettingsPanel
          settings={settings}
          onClose={() => setShowSettingsPanel(false)}
          onUpdateSettings={setSettings}
        />
      )}
    </div>
  );
}