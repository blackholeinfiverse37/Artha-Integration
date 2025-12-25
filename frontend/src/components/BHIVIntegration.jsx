import { useState } from 'react';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import api from '../services/api';

export function BHIVIntegration() {
  const [status, setStatus] = useState(null);
  const [guidance, setGuidance] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const checkBHIVStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bhiv/status');
      setStatus(response.data.data);
    } catch (error) {
      console.error('BHIV status check failed:', error);
      setStatus({ enabled: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getAccountingGuidance = async () => {
    if (!query.trim()) return;
    
    try {
      setLoading(true);
      const response = await api.post('/bhiv/guidance', { query });
      setResult(response.data.data);
    } catch (error) {
      console.error('BHIV guidance failed:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6" title="BHIV AI Integration">
      <div className="flex items-center justify-between mb-4">
        <Button 
          onClick={checkBHIVStatus}
          disabled={loading}
          variant="outline"
          size="sm"
          loading={loading}
        >
          Check Status
        </Button>
      </div>

      {status && (
        <div className="mb-4 p-3 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              status.status === 'connected' ? 'bg-green-500' : 
              status.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="font-medium">
              BHIV: {status.status === 'connected' ? 'Connected' : 
                     status.status === 'partial' ? 'Partially Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* BHIV Core Status */}
          {status.services?.bhivCore && (
            <div className="mb-2">
              <p className="text-sm text-gray-600">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  status.services.bhivCore.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                }`}></span>
                BHIV Core: {status.services.bhivCore.status}
                {status.services.bhivCore.error && (
                  <span className="text-red-600 ml-2">- {status.services.bhivCore.error}</span>
                )}
              </p>
            </div>
          )}
          
          {/* BHIV Central Status */}
          {status.services?.bhivCentralDepository && (
            <div className="mb-2">
              <p className="text-sm text-gray-600">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  status.services.bhivCentralDepository.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                }`}></span>
                BHIV Central: {status.services.bhivCentralDepository.status}
                {status.services.bhivCentralDepository.errors?.mainApi && (
                  <span className="text-red-600 ml-2">- {status.services.bhivCentralDepository.errors.mainApi}</span>
                )}
              </p>
            </div>
          )}
          
          {status.troubleshooting && (
            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm font-medium text-blue-800">
                💡 {status.troubleshooting.message}
              </p>
              {status.troubleshooting.solution && (
                <p className="text-sm text-blue-700 mt-1">
                  Solution: {status.troubleshooting.solution}
                </p>
              )}
              {status.troubleshooting.details && (
                <div className="text-xs text-blue-600 mt-1">
                  Required: {status.troubleshooting.details.requiredServices?.join(', ')}
                </div>
              )}
            </div>
          )}
          
          {status.error && (
            <p className="text-sm text-red-600 mt-2">Error: {status.error}</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Ask for Accounting Guidance
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., How to record depreciation expense?"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && getAccountingGuidance()}
            />
            <Button 
              onClick={getAccountingGuidance}
              disabled={loading || !query.trim()}
              loading={loading}
            >
              Ask AI
            </Button>
          </div>
        </div>

        {result && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            {result.error ? (
              <p className="text-red-600">Error: {result.error}</p>
            ) : (
              <div>
                <h4 className="font-medium mb-2">AI Guidance:</h4>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {result.response || 'No response received'}
                </p>
                {result.sources && result.sources.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium">Sources:</p>
                    <ul className="text-sm text-gray-600">
                      {result.sources.map((source, index) => (
                        <li key={index}>• {source.source}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="font-medium mb-2">Available Features:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• AI-powered accounting guidance</li>
          <li>• Receipt processing and analysis</li>
          <li>• Document understanding</li>
          <li>• Financial insights and recommendations</li>
        </ul>
      </div>
    </Card>
  );
}