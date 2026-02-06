import React, { useState } from 'react';
import { X, Upload, Code } from 'lucide-react';
import { Trade } from '../App';

interface ImportModalProps {
  onClose: () => void;
  onImport: (trades: Trade[]) => void;
  theme: 'light' | 'dark';
}

export function ImportModal({ onClose, onImport, theme }: ImportModalProps) {
  const API_URL = 'http://localhost:5001';
  const [importMethod, setImportMethod] = useState<'csv' | 'api'>('csv');
  const [csvData, setCsvData] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null >(null);

  const parseCsv = (csv: string): Trade[] => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const trades: Trade[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const trade: any = {};

      headers.forEach((header, index) => {
        trade[header] = values[index];
      });

      // Map CSV data to Trade object
      const mappedTrade: Trade = {
        id: `imported-${Date.now()}-${i}`,
        date: trade.date || new Date().toISOString().split('T')[0],
        symbol: trade.symbol || '',
        side: trade.side?.toLowerCase() === 'short' ? 'short' : 'long',
        entryPrice: parseFloat(trade.entry_price || trade.entryprice || trade.entry || 0),
        exitPrice: parseFloat(trade.exit_price || trade.exitprice || trade.exit || 0),
        quantity: parseInt(trade.quantity || trade.qty || trade.shares || 0),
        pnl: parseFloat(trade.pnl || trade.profit || trade.pl || 0),
        riskReward: parseFloat(trade.risk_reward || trade.rr || 1),
        tags: trade.tags ? trade.tags.split(';').filter(Boolean) : [],
        notes: trade.notes || '',
        time: trade.time || '09:30',
        screenshots: []
      };

      // If PnL not provided, calculate it
      if (!trade.pnl && mappedTrade.entryPrice && mappedTrade.exitPrice && mappedTrade.quantity) {
        if (mappedTrade.side === 'long') {
          mappedTrade.pnl = (mappedTrade.exitPrice - mappedTrade.entryPrice) * mappedTrade.quantity;
        } else {
          mappedTrade.pnl = (mappedTrade.entryPrice - mappedTrade.exitPrice) * mappedTrade.quantity;
        }
      }

      trades.push(mappedTrade);
    }

    return trades;
  };
  const transformBackendTradeToFrontend = (backendTrade: any): Trade => {
    const entryTime = new Date(backendTrade.entry_time);
    const date = entryTime.toISOString().split('T')[0];

    const hours = entryTime.getHours().toString().padStart(2, '0');
    const minutes = entryTime.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;

    const side = backendTrade.direction?.toLowerCase() === 'short' ? 'short' : 'long';

    return {
      id: backendTrade.id,
      date: date,
      symbol: backendTrade.symbol,
      side: side as 'long' | 'short',
      entryPrice: backendTrade.entry_price,
      exitPrice: backendTrade.exit_price,
      quantity: backendTrade.quantity,
      pnl: backendTrade.pnl,
      riskReward: 1, // Default value, not in backend model
      tags: backendTrade.strategy ? [backendTrade.strategy] : [],
      notes: '', // Not in backend model
      time: time,
      screenshots: [],
      account: backendTrade.acc_id,
      duration: undefined // Calculate if needed from entry_time and exit_time
    };
  };

  const handleCsvImport = async () => {
    // Validate CSV data exists
    if (!csvData.trim()) {
      setErrorMessage('Please provide CSV data');
      return;
    }

    // Show loading state
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Send CSV to backend API
      const response = await fetch(`${API_URL}/api/trades/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csv_text: csvData,
          default_acc_id: 'default' // You can make this configurable later
        }),
      });

      // Parse response
      const data = await response.json();

      // Check if request failed
      if (!response.ok) {
        const errorMsg = data.error || `Failed to import trades: ${response.statusText}`;
        setErrorMessage(errorMsg);
        if (data.errors && Array.isArray(data.errors)) {
          console.error('Import errors:', data.errors);
        }
        return;
      }

      // Transform backend trades to frontend format
      const importedTrades = data.trades || [];
      const frontendTrades = importedTrades.map(transformBackendTradeToFrontend);

      if (frontendTrades.length === 0) {
        setErrorMessage('No trades were imported. Check your CSV format.');
        return;
      }

      // Show success message
      alert(`Successfully imported ${data.imported_count || frontendTrades.length} trades!${data.skipped_count ? ` (${data.skipped_count} skipped)` : ''}`);

      // Pass trades to parent component (this updates the UI)
      onImport(frontendTrades);
      onClose(); // Close the modal
    } catch (error) {
      // Handle network errors or other exceptions
      console.error('Error importing CSV:', error);
      setErrorMessage(`Failed to connect to backend: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure your Flask server is running on ${API_URL}`);
    } finally {
      // Always hide loading state
      setIsLoading(false);
    }
  };

  const handleApiImport = async () => {
    try {
      // This is a placeholder for actual API integration
      // In production, you would make an actual API call to your Python backend
      alert('API Import functionality will connect to your Python backend. Replace this with actual API call.');
      
      // Example of what the API call would look like:
      // const response = await fetch(apiEndpoint, {
      //   headers: {
      //     'Authorization': `Bearer ${apiKey}`,
      //     'Content-Type': 'application/json'
      //   }
      // });
      // const data = await response.json();
      // onImport(data.trades);
      
      onClose();
    } catch (error) {
      alert('Error importing from API: ' + error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvData(text);
      };
      reader.readAsText(file);
    }
  };

  const exampleCsv = `date,symbol,side,entry_price,exit_price,quantity,pnl,tags,notes,time
2026-01-15,AAPL,long,150.50,155.00,100,450.00,Breakout;Morning,Good setup,09:30
2026-01-15,TSLA,short,250.00,245.00,50,250.00,Scalp,Quick trade,10:15`;

  const bgClass = theme === 'dark' ? 'bg-[#161B22]' : 'bg-white';
  const textClass = theme === 'dark' ? 'text-[#E6EDF3]' : 'text-gray-900';
  const textSecondaryClass = theme === 'dark' ? 'text-[#9BA4B5]' : 'text-gray-600';
  const borderClass = theme === 'dark' ? 'border-[#2A2F3A]' : 'border-gray-200';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className={`${bgClass} rounded-xl shadow-2xl w-full max-w-3xl`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
          <h2 className="text-2xl font-bold">Import Trades</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Import Method Selection */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setImportMethod('csv')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                importMethod === 'csv'
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Upload className="w-5 h-5 inline mr-2" />
              CSV File
            </button>
            <button
              onClick={() => setImportMethod('api')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                importMethod === 'api'
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Code className="w-5 h-5 inline mr-2" />
              Broker API
            </button>
          </div>

          {/* CSV Import */}
          {importMethod === 'csv' && (
            <div>
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className={`w-full px-3 py-2 border ${borderClass} rounded ${
                    theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
                  }`}
                />
              </div>

              <div className="mb-4">
                <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                  Or Paste CSV Data
                </label>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder={exampleCsv}
                  className={`w-full px-3 py-2 border ${borderClass} rounded font-mono text-sm ${
                    theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
                  }`}
                  rows={10}
                />
              </div>

              <div className={`p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-blue-50'} rounded-lg mb-4`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-blue-800'} font-medium mb-2`}>
                  CSV Format Requirements:
                </p>
                <ul className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-blue-700'} space-y-1 list-disc list-inside`}>
                  <li>First row must be headers</li>
                  <li>Required columns: date, symbol, side, entry_price, exit_price, quantity</li>
                  <li>Optional columns: pnl, tags (semicolon-separated), notes, time</li>
                  <li>Date format: YYYY-MM-DD</li>
                  <li>Side: "long" or "short"</li>
                </ul>
              </div>

              {/* Error Message Display */}
              {errorMessage && (
                <div className={`mb-4 p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-800'}`}>
                    {errorMessage}
                  </p>
                </div>
              )}

              <button
                onClick={handleCsvImport}
                disabled={!csvData || isLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </>
                ) : (
                  'Import from CSV'
                )}
              </button>
            </div>
          )}

          {/* API Import */}
          {importMethod === 'api' && (
            <div>
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                  API Endpoint
                </label>
                <input
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="https://your-python-backend.com/api/trades"
                  className={`w-full px-3 py-2 border ${borderClass} rounded ${
                    theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
                  }`}
                />
              </div>

              <div className="mb-4">
                <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                  API Key (Optional)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Your API key or authentication token"
                  className={`w-full px-3 py-2 border ${borderClass} rounded ${
                    theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
                  }`}
                />
              </div>

              <div className={`p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-yellow-50'} rounded-lg mb-4`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-yellow-800'} font-medium mb-2`}>
                  🔗 Connect to Your Python Backend
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-yellow-700'} mb-2`}>
                  This will connect to your Python API endpoint. Make sure your backend returns trade data in the following format:
                </p>
                <pre className={`text-xs ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-800'} p-2 rounded overflow-x-auto`}>
{`{
  "trades": [
    {
      "date": "2026-01-15",
      "symbol": "AAPL",
      "side": "long",
      "entryPrice": 150.50,
      "exitPrice": 155.00,
      "quantity": 100,
      "pnl": 450.00,
      "tags": ["Breakout"],
      "notes": "Good setup",
      "time": "09:30"
    }
  ]
}`}
                </pre>
              </div>

              <button
                onClick={handleApiImport}
                disabled={!apiEndpoint}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect & Import from API
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}