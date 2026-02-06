import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DailyPnL } from '../App';

interface TradeCalendarProps {
  data: DailyPnL[];
  currentYear: number;
  currentMonth: number;
  onDateClick: (dailyData: DailyPnL) => void;
  onMonthChange: (year: number, month: number) => void;
  theme: 'light' | 'dark';
}

export function TradeCalendar({ data, currentYear, currentMonth, onDateClick, onMonthChange, theme }: TradeCalendarProps) {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calculate monthly PnL
  const monthlyPnL = data
    .filter(d => {
      const [year, month] = d.date.split('-').map(Number);
      return year === currentYear && month === currentMonth;
    })
    .reduce((sum, d) => sum + d.pnl, 0);

  // Calculate annual PnL
  const annualPnL = data
    .filter(d => {
      const [year] = d.date.split('-').map(Number);
      return year === currentYear;
    })
    .reduce((sum, d) => sum + d.pnl, 0);

  const getPnLColor = (pnl: number) => {
    if (theme === 'dark') {
      if (pnl >= 0) return 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/50';
      return 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50';
    }
    if (pnl >= 0) return 'bg-green-100 text-green-700 border-green-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onMonthChange(currentYear - 1, 12);
    } else {
      onMonthChange(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange(currentYear + 1, 1);
    } else {
      onMonthChange(currentYear, currentMonth + 1);
    }
  };

  return (
    <>
      {/* Statistics Section */}
      <div className="flex gap-4 mb-4">
        <div className={`flex-1 text-center p-4 rounded-lg border ${
          theme === 'dark' 
            ? 'bg-[#161B22] border-[#2A2F3A]' 
            : 'bg-white border-gray-200'
        }`}>
          <div className={`text-xs mb-1 ${theme === 'dark' ? 'text-[#9BA4B5]' : 'text-gray-600'}`}>
            Monthly P&L
          </div>
          <div className={`text-lg font-semibold ${
            monthlyPnL >= 0 
              ? theme === 'dark' ? 'text-[#22C55E]' : 'text-green-600'
              : theme === 'dark' ? 'text-[#EF4444]' : 'text-red-600'
          }`}>
            {monthlyPnL >= 0 ? '+' : ''}${monthlyPnL.toFixed(2)}
          </div>
        </div>
        <div className={`flex-1 text-center p-4 rounded-lg border ${
          theme === 'dark' 
            ? 'bg-[#161B22] border-[#2A2F3A]' 
            : 'bg-white border-gray-200'
        }`}>
          <div className={`text-xs mb-1 ${theme === 'dark' ? 'text-[#9BA4B5]' : 'text-gray-600'}`}>
            Annual Net Total
          </div>
          <div className={`text-lg font-semibold ${
            annualPnL >= 0 
              ? theme === 'dark' ? 'text-[#22C55E]' : 'text-green-600'
              : theme === 'dark' ? 'text-[#EF4444]' : 'text-red-600'
          }`}>
            {annualPnL >= 0 ? '+' : ''}${annualPnL.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Calendar Card */}
      <div className={`rounded-lg shadow-sm border p-4 ${
        theme === 'dark' 
          ? 'bg-[#161B22] border-[#2A2F3A]' 
          : 'bg-white border-gray-200'
      }`}>
        {/* Month Navigation - Centered */}
        <div className="flex justify-center items-center gap-4 mb-4">
          <button
            onClick={handlePrevMonth}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-[#1F2633] text-[#9BA4B5]'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className={`text-lg font-semibold min-w-[200px] text-center ${theme === 'dark' ? 'text-[#E6EDF3]' : 'text-gray-900'}`}>
            {monthNames[currentMonth - 1]} {currentYear}
          </h3>
          <button
            onClick={handleNextMonth}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-[#1F2633] text-[#9BA4B5]'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Day headers */}
          {daysOfWeek.map(day => (
            <div key={day} className={`text-center font-medium text-xs py-1.5 ${
              theme === 'dark' ? 'text-[#9BA4B5]' : 'text-gray-600'
            }`}>
              {day}
            </div>
          ))}
          
          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDay }).map((_, i) => {
            const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
            const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
            const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
            const prevMonthDay = daysInPrevMonth - (firstDay - 1 - i);
            const dateStr = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-${prevMonthDay.toString().padStart(2, '0')}`;
            const dailyData = data.find(d => d.date === dateStr);
            const pnl = dailyData?.pnl || 0;
            
            return (
              <button
                key={`empty-${i}`}
                onClick={() => dailyData && onDateClick(dailyData)}
                className={`aspect-square border-2 rounded-lg p-1.5 flex flex-col items-center justify-center transition-all ${getPnLColor(pnl)} hover:scale-110 hover:shadow-lg hover:brightness-125`}
              >
                <span className="font-semibold text-sm">{prevMonthDay}</span>
                <span className="text-[10px] font-medium mt-0.5">
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
                </span>
                <span className={`text-[9px] mt-0.5 ${theme === 'dark' ? 'text-[#9BA4B5]' : 'text-gray-500'}`}>
                  {dailyData?.trades.length || 0} trades
                </span>
              </button>
            );
          })}
          
          {/* Calendar days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dailyData = data.find(d => d.date === dateStr);
            const pnl = dailyData?.pnl || 0;
            
            return (
              <button
                key={day}
                onClick={() => dailyData && onDateClick(dailyData)}
                className={`aspect-square border-2 rounded-lg p-1.5 flex flex-col items-center justify-center transition-all ${getPnLColor(pnl)} hover:scale-110 hover:shadow-lg hover:brightness-125`}
              >
                <span className="font-semibold text-sm">{day}</span>
                <span className="text-[10px] font-medium mt-0.5">
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
                </span>
                <span className={`text-[9px] mt-0.5 ${theme === 'dark' ? 'text-[#9BA4B5]' : 'text-gray-500'}`}>
                  {dailyData?.trades.length || 0} trades
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}