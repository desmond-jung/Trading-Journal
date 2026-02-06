import { useState } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { Trade } from '../App';

interface TradeJournalModalProps {
  trade: Trade;
  onClose: () => void;
  onUpdate: (updates: Partial<Trade>) => void;
  theme: 'light' | 'dark';
}

export function TradeJournalModal({ trade, onClose, onUpdate, theme }: TradeJournalModalProps) {
  const [strategies, setStrategies] = useState<string[]>(trade.tags || []);
  const [signals, setSignals] = useState<string>(trade.notes || '');
  const [newStrategy, setNewStrategy] = useState('');

  const handleSave = () => {
    onUpdate({
      tags: strategies,
      notes: signals
    });
    onClose();
  };

  const handleAddStrategy = () => {
    if (newStrategy.trim()) {
      setStrategies([...strategies, newStrategy.trim()]);
      setNewStrategy('');
    }
  };

  const handleRemoveStrategy = (strategy: string) => {
    setStrategies(strategies.filter(s => s !== strategy));
  };

  const bgClass = theme === 'dark' ? 'bg-[#161B22]' : 'bg-white';
  const textClass = theme === 'dark' ? 'text-[#E6EDF3]' : 'text-gray-900';
  const textSecondaryClass = theme === 'dark' ? 'text-[#9BA4B5]' : 'text-gray-600';
  const borderClass = theme === 'dark' ? 'border-[#2A2F3A]' : 'border-gray-200';
  const cardBgClass = theme === 'dark' ? 'bg-[#1F2633]' : 'bg-gray-50';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className={`${bgClass} rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="bg-[#1E3A8A] text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Trade Journal</h2>
            <p className="text-sm opacity-80 mt-1">{trade.symbol} - {trade.time}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Strategies Section */}
          <div>
            <label className={`block text-sm font-semibold ${textClass} mb-3`}>
              Strategies & Tags
            </label>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {strategies.map((strategy, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
                >
                  {strategy}
                  <button
                    onClick={() => handleRemoveStrategy(strategy)}
                    className="hover:text-blue-900"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStrategy}
                onChange={(e) => setNewStrategy(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddStrategy()}
                placeholder="Add strategy (e.g., Breakout, Scalp, Reversal)"
                className={`flex-1 px-3 py-2 border ${borderClass} rounded-lg ${theme === 'dark' ? 'bg-[#0E1117] text-white' : 'bg-white'}`}
              />
              <button
                onClick={handleAddStrategy}
                className="px-4 py-2 bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1e40af] transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Signals & Notes Section */}
          <div>
            <label className={`block text-sm font-semibold ${textClass} mb-3`}>
              Entry Signals & Notes
            </label>
            <textarea
              value={signals}
              onChange={(e) => setSignals(e.target.value)}
              placeholder="Describe what you saw before entering this trade... Key levels, patterns, indicators, market conditions, etc."
              className={`w-full px-4 py-3 border ${borderClass} rounded-lg ${theme === 'dark' ? 'bg-[#0E1117] text-white' : 'bg-white'}`}
              rows={8}
            />
          </div>
        </div>

        {/* Footer */}
        <div className={`border-t ${borderClass} px-6 py-4 ${cardBgClass} flex gap-3`}>
          <button
            onClick={handleSave}
            className="flex-1 bg-[#1E3A8A] text-white py-2.5 rounded-lg hover:bg-[#1e40af] transition-colors font-medium"
          >
            Save Journal
          </button>
          <button
            onClick={onClose}
            className={`px-6 py-2.5 border ${borderClass} rounded-lg hover:${theme === 'dark' ? 'bg-[#1F2633]' : 'bg-gray-100'} transition-colors font-medium ${textClass}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
