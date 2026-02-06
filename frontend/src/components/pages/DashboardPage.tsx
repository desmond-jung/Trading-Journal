import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { DailyPnL } from '../../App';

interface DashboardPageProps {
  data: DailyPnL[];
  theme: 'light' | 'dark';
}

export function DashboardPage({ data, theme }: DashboardPageProps) {
  const textClass = theme === 'dark' ? 'text-[#E6EDF3]' : 'text-gray-900';
  const textSecondaryClass = theme === 'dark' ? 'text-[#9BA4B5]' : 'text-gray-600';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${textClass} mb-2`}>Analytics Dashboard</h1>
        <p className={`text-lg ${textSecondaryClass}`}>
          Comprehensive insights into your trading performance
        </p>
      </div>

      {/* Analytics */}
      <AnalyticsDashboard data={data} theme={theme} />
    </div>
  );
}