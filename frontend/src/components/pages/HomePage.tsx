import { Calendar, BarChart3, Copy, Bot, Users, Link, TrendingUp } from 'lucide-react';
import { PageType } from '../../App';

interface HomePageProps {
  theme: 'light' | 'dark';
  onNavigate: (page: PageType) => void;
}

export function HomePage({ theme, onNavigate }: HomePageProps) {
  const textClass = theme === 'dark' ? 'text-[#E6EDF3]' : 'text-gray-900';
  const textSecondaryClass = theme === 'dark' ? 'text-[#9BA4B5]' : 'text-gray-600';
  const bgClass = theme === 'dark' ? 'bg-[#161B22]' : 'bg-white';
  const borderClass = theme === 'dark' ? 'border-[#2A2F3A]' : 'border-gray-200';

  const quickLinks = [
    { id: 'calendar' as PageType, title: 'Calendar', description: 'View and manage your trades by date', icon: Calendar, color: 'blue' },
    { id: 'dashboard' as PageType, title: 'Dashboard', description: 'Analyze your trading performance', icon: BarChart3, color: 'purple' },
    { id: 'trade-copier' as PageType, title: 'Trade Copier', description: 'Copy trades across accounts', icon: Copy, color: 'green' },
    { id: 'trading-bot' as PageType, title: 'Trading Bot', description: 'Automated trading strategies', icon: Bot, color: 'orange' },
    { id: 'accounts' as PageType, title: 'Accounts', description: 'Manage your trading accounts', icon: Users, color: 'pink' },
    { id: 'connections' as PageType, title: 'Connections', description: 'Connect to brokers and APIs', icon: Link, color: 'teal' },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      green: 'bg-green-100 text-green-600',
      orange: 'bg-orange-100 text-orange-600',
      pink: 'bg-pink-100 text-pink-600',
      teal: 'bg-teal-100 text-teal-600',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-4xl font-bold ${textClass} mb-2`}>Welcome to Trading Hub</h1>
        <p className={`text-lg ${textSecondaryClass}`}>
          Your comprehensive platform for tracking, analyzing, and optimizing your trading performance
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-6`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${textSecondaryClass}`}>Total P&L</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600">+$12,450.00</div>
          <div className={`text-xs ${textSecondaryClass} mt-1`}>This month</div>
        </div>

        <div className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-6`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${textSecondaryClass}`}>Win Rate</span>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div className={`text-3xl font-bold ${textClass}`}>67.5%</div>
          <div className={`text-xs ${textSecondaryClass} mt-1`}>Last 30 days</div>
        </div>

        <div className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-6`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${textSecondaryClass}`}>Total Trades</span>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div className={`text-3xl font-bold ${textClass}`}>142</div>
          <div className={`text-xs ${textSecondaryClass} mt-1`}>This month</div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className={`text-2xl font-bold ${textClass} mb-4`}>Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-6 hover:shadow-md transition-all text-left group`}
              >
                <div className={`w-12 h-12 rounded-lg ${getColorClasses(link.color)} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className={`text-lg font-semibold ${textClass} mb-1`}>{link.title}</h3>
                <p className={`text-sm ${textSecondaryClass}`}>{link.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className={`text-2xl font-bold ${textClass} mb-4`}>Recent Activity</h2>
        <div className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-6`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className={`font-medium ${textClass}`}>Trade added: AAPL Long</p>
                  <p className={`text-sm ${textSecondaryClass}`}>2 hours ago</p>
                </div>
              </div>
              <span className="text-green-600 font-semibold">+$450.00</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div>
                  <p className={`font-medium ${textClass}`}>Trade added: TSLA Short</p>
                  <p className={`text-sm ${textSecondaryClass}`}>5 hours ago</p>
                </div>
              </div>
              <span className="text-red-600 font-semibold">-$120.00</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className={`font-medium ${textClass}`}>Imported 15 trades from CSV</p>
                  <p className={`text-sm ${textSecondaryClass}`}>Yesterday</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}