import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { DailyPnL, Trade } from '../App';
import { TradeJournalModal } from './TradeJournalModal';

interface TradeDetailModalProps {
  dailyData: DailyPnL;
  onClose: () => void;
  onUpdateTrades: (trades: Trade[]) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  theme: 'light' | 'dark';
}

type TabType = 'overview' | 'trades';

export function TradeDetailModal({ dailyData, onClose, onUpdateTrades, onNavigate, theme }: TradeDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [journalTrade, setJournalTrade] = useState<Trade | null>(null);

  const trades = dailyData.trades;
  const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const losingTrades = trades.filter(t => t.pnl < 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
  
  // Get unique strategies
  const strategies = Array.from(new Set(trades.flatMap(t => t.tags)));
  
  // Calculate average win/loss
  const avgWin = winningTrades > 0 
    ? trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades 
    : 0;
  const avgLoss = losingTrades > 0
    ? trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / losingTrades
    : 0;

  const handleUpdateTrade = (tradeId: string, updates: Partial<Trade>) => {
    const updatedTrades = trades.map(trade => {
      if (trade.id === tradeId) {
        return { ...trade, ...updates };
      }
      return trade;
    });
    onUpdateTrades(updatedTrades);
  };

  const bgClass = theme === 'dark' ? 'bg-[#161B22]' : 'bg-white';
  const textClass = theme === 'dark' ? 'text-[#E6EDF3]' : 'text-gray-900';
  const textSecondaryClass = theme === 'dark' ? 'text-[#9BA4B5]' : 'text-gray-600';
  const borderClass = theme === 'dark' ? 'border-[#2A2F3A]' : 'border-gray-200';
  const cardBgClass = theme === 'dark' ? 'bg-[#1F2633]' : 'bg-gray-50';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className={`${bgClass} rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col`}>
          {/* Header */}
          <div className="bg-[#1E3A8A] text-white px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left Arrow */}
              <button
                onClick={() => onNavigate?.('prev')}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                disabled={!onNavigate}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Centered Date */}
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  {new Date(dailyData.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h2>
              </div>

              {/* Right Arrow and Close */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate?.('next')}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  disabled={!onNavigate}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mt-4 border-b border-white border-opacity-20">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-white text-white'
                    : 'text-white text-opacity-70 hover:text-opacity-100'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('trades')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'trades'
                    ? 'border-b-2 border-white text-white'
                    : 'text-white text-opacity-70 hover:text-opacity-100'
                }`}
              >
                Trades
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'overview' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* P&L Card */}
                <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4`}>
                  <p className={`text-sm ${textSecondaryClass} mb-2`}>Total P&L</p>
                  <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                  </p>
                </div>

                {/* Number of Trades */}
                <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4`}>
                  <p className={`text-sm ${textSecondaryClass} mb-2`}>Total Trades</p>
                  <p className={`text-2xl font-bold ${textClass}`}>{trades.length}</p>
                  <p className={`text-xs ${textSecondaryClass} mt-1`}>
                    {winningTrades}W / {losingTrades}L
                  </p>
                </div>

                {/* Win Rate */}
                <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4`}>
                  <p className={`text-sm ${textSecondaryClass} mb-2`}>Win Rate</p>
                  <p className={`text-2xl font-bold ${textClass}`}>{winRate.toFixed(1)}%</p>
                </div>

                {/* Average Win */}
                <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4`}>
                  <p className={`text-sm ${textSecondaryClass} mb-2`}>Avg Win</p>
                  <p className={`text-2xl font-bold text-[#22C55E]`}>
                    +${avgWin.toFixed(2)}
                  </p>
                </div>

                {/* Average Loss */}
                <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4`}>
                  <p className={`text-sm ${textSecondaryClass} mb-2`}>Avg Loss</p>
                  <p className={`text-2xl font-bold text-[#EF4444]`}>
                    ${avgLoss.toFixed(2)}
                  </p>
                </div>

                {/* Profit Factor */}
                <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4`}>
                  <p className={`text-sm ${textSecondaryClass} mb-2`}>Profit Factor</p>
                  <p className={`text-2xl font-bold ${textClass}`}>
                    {avgLoss !== 0 ? (Math.abs(avgWin * winningTrades) / Math.abs(avgLoss * losingTrades)).toFixed(2) : 'N/A'}
                  </p>
                </div>

                {/* Largest Win */}
                <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4`}>
                  <p className={`text-sm ${textSecondaryClass} mb-2`}>Largest Win</p>
                  <p className={`text-2xl font-bold text-[#22C55E]`}>
                    +${Math.max(...trades.map(t => t.pnl), 0).toFixed(2)}
                  </p>
                </div>

                {/* Largest Loss */}
                <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4`}>
                  <p className={`text-sm ${textSecondaryClass} mb-2`}>Largest Loss</p>
                  <p className={`text-2xl font-bold text-[#EF4444]`}>
                    ${Math.min(...trades.map(t => t.pnl), 0).toFixed(2)}
                  </p>
                </div>

                {/* Strategies Used - Full Width */}
                <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4 col-span-2 md:col-span-4`}>
                  <p className={`text-sm ${textSecondaryClass} mb-3`}>Strategies Used</p>
                  <div className="flex flex-wrap gap-2">
                    {strategies.length > 0 ? (
                      strategies.map((strategy, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
                        >
                          {strategy}
                        </span>
                      ))
                    ) : (
                      <span className={textSecondaryClass}>No strategies tagged</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Trades Tab - Table View */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${borderClass}`}>
                      <th className={`text-left py-3 px-4 text-sm font-semibold ${textSecondaryClass}`}>Date/Time</th>
                      <th className={`text-left py-3 px-4 text-sm font-semibold ${textSecondaryClass}`}>Symbol</th>
                      <th className={`text-left py-3 px-4 text-sm font-semibold ${textSecondaryClass}`}>Direction</th>
                      <th className={`text-left py-3 px-4 text-sm font-semibold ${textSecondaryClass}`}>Account</th>
                      <th className={`text-right py-3 px-4 text-sm font-semibold ${textSecondaryClass}`}>Qty</th>
                      <th className={`text-right py-3 px-4 text-sm font-semibold ${textSecondaryClass}`}>Entry</th>
                      <th className={`text-right py-3 px-4 text-sm font-semibold ${textSecondaryClass}`}>Exit</th>
                      <th className={`text-right py-3 px-4 text-sm font-semibold ${textSecondaryClass}`}>P&L</th>
                      <th className={`text-right py-3 px-4 text-sm font-semibold ${textSecondaryClass}`}>Duration</th>
                      <th className={`text-center py-3 px-4 text-sm font-semibold ${textSecondaryClass}`}>Status</th>
                      <th className={`text-center py-3 px-4 text-sm font-semibold ${textSecondaryClass}`}>Journal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id} className={`border-b ${borderClass} hover:${cardBgClass} transition-colors`}>
                        <td className={`py-3 px-4 text-sm ${textClass}`}>
                          {trade.date} {trade.time}
                        </td>
                        <td className={`py-3 px-4 text-sm font-semibold ${textClass}`}>
                          {trade.symbol}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${
                            trade.side === 'long' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {trade.side}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-sm ${textSecondaryClass}`}>
                          {trade.account || 'N/A'}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right ${textClass}`}>
                          {trade.quantity}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right ${textClass}`}>
                          ${trade.entryPrice.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right ${textClass}`}>
                          ${trade.exitPrice.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right font-semibold ${
                          trade.pnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                        }`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right ${textSecondaryClass}`}>
                          {trade.duration ? `${trade.duration}m` : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            trade.pnl >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {trade.pnl >= 0 ? 'Win' : 'Loss'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setJournalTrade(trade)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1e40af] transition-colors text-xs font-medium"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Journal
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`border-t ${borderClass} px-6 py-4 ${cardBgClass}`}>
            <button
              onClick={onClose}
              className="w-full bg-[#1E3A8A] text-white py-2.5 rounded-lg hover:bg-[#1e40af] transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Journal Modal */}
      {journalTrade && (
        <TradeJournalModal
          trade={journalTrade}
          onClose={() => setJournalTrade(null)}
          onUpdate={(updates) => {
            handleUpdateTrade(journalTrade.id, updates);
            setJournalTrade(null);
          }}
          theme={theme}
        />
      )}
    </>
  );
}
