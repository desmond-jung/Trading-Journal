import { useState } from 'react';
import { TradeCalendar } from '../TradeCalendar';
import { TradeDetailModal } from '../TradeDetailModal';
import { DailyPnL, Trade } from '../../App';

interface CalendarPageProps {
  tradeData: DailyPnL[];
  currentYear: number;
  currentMonth: number;
  onMonthChange: (year: number, month: number) => void;
  onUpdateTrades: (date: string, trades: Trade[]) => void;
  theme: 'light' | 'dark';
}

export function CalendarPage({
  tradeData,
  currentYear,
  currentMonth,
  onMonthChange,
  onUpdateTrades,
  theme
}: CalendarPageProps) {
  const [selectedDate, setSelectedDate] = useState<DailyPnL | null>(null);

  const textClass = theme === 'dark' ? 'text-[#E6EDF3]' : 'text-gray-900';
  const textSecondaryClass = theme === 'dark' ? 'text-[#9BA4B5]' : 'text-gray-600';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${textClass} mb-2`}>Trading Calendar</h1>
        <p className={`text-lg ${textSecondaryClass}`}>
          View your daily performance and manage trades
        </p>
      </div>

      {/* Calendar */}
      <TradeCalendar
        data={tradeData}
        currentYear={currentYear}
        currentMonth={currentMonth}
        onDateClick={setSelectedDate}
        onMonthChange={onMonthChange}
        theme={theme}
      />

      {/* Trade Detail Modal */}
      {selectedDate && (
        <TradeDetailModal
          dailyData={selectedDate}
          onClose={() => setSelectedDate(null)}
          onUpdateTrades={(updatedTrades) => onUpdateTrades(selectedDate.date, updatedTrades)}
          theme={theme}
        />
      )}
    </div>
  );
}