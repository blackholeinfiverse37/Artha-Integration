import { useEffect, useState } from 'react';
import api from '../services/api';

export default function LedgerIntegrityStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    checkIntegrity();
    // Refresh every 5 minutes
    const interval = setInterval(checkIntegrity, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkIntegrity = async () => {
    try {
      const response = await api.get('/ledger/verify-chain');
      setStatus(response.data.data);
    } catch (error) {
      console.error('Integrity check failed:', error);
      setStatus({ isValid: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
    );
  }

  const isHealthy = status?.isValid;

  return (
    <div
      className={`border rounded-lg p-4 ${
        isHealthy
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isHealthy ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></div>
          <div>
            <p className={`font-semibold ${
              isHealthy ? 'text-green-900' : 'text-red-900'
            }`}>
              Ledger Integrity: {isHealthy ? 'OK ✓' : 'Issues Detected ⚠'}
            </p>
            <p className={`text-sm ${
              isHealthy ? 'text-green-700' : 'text-red-700'
            }`}>
              {status?.totalEntries || 0} entries verified
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium underline"
        >
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>
      {expanded && status && (
        <div className="mt-4 pt-4 border-t border-gray-300 space-y-2 text-sm">
          {status.errors && status.errors.length > 0 ? (
            <div>
              <p className="font-semibold text-red-900 mb-2">Issues Found:</p>
              {status.errors.map((error, idx) => (
                <div key={idx} className="bg-red-100 p-2 rounded mb-2">
                  <p className="font-mono text-xs text-red-800">
                    Position {error.position}: {error.issue}
                  </p>
                  {error.entryNumber && (
                    <p className="text-red-700">Entry: {error.entryNumber}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-700">
              ✓ All {status.totalEntries} entries verified successfully
            </p>
          )}
          <p className="text-gray-600 text-xs mt-2">
            Last verified: {new Date().toLocaleTimeString()}
          </p>
        </div>
      )}
      <button
        onClick={checkIntegrity}
        className="mt-3 text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Verify Now
      </button>
    </div>
  );
}