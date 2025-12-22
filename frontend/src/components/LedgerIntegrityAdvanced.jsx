import { useEffect, useState } from 'react';
import api from '../services/api';
import { ledgerService } from '../services/ledgerService';

export default function LedgerIntegrityAdvanced() {
  const [status, setStatus] = useState(null);
  const [chainStats, setChainStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    checkIntegrity();
    // Refresh every 5 minutes
    const interval = setInterval(checkIntegrity, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkIntegrity = async () => {
    try {
      setLoading(true);
      
      // Run verification and get chain stats in parallel
      const [verificationResult, statsResult] = await Promise.all([
        verifyChainWithFallback(),
        getChainStatsWithFallback()
      ]);
      
      setStatus(verificationResult);
      setChainStats(statsResult);
    } catch (error) {
      console.error('Integrity check failed:', error);
      setStatus({ 
        isValid: false, 
        error: error.message,
        totalEntries: 0,
        errors: [{ issue: 'Failed to connect to verification service' }]
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyChainWithFallback = async () => {
    try {
      // Try new endpoint first
      const response = await api.get('/ledger/verify');
      return response.data.data;
    } catch (error) {
      try {
        // Fallback to legacy endpoint
        const response = await api.get('/ledger/verify-chain');
        return response.data.data;
      } catch (fallbackError) {
        throw new Error('Both verification endpoints failed');
      }
    }
  };

  const getChainStatsWithFallback = async () => {
    try {
      const response = await ledgerService.getChainStats();
      return response.data;
    } catch (error) {
      // Return null if stats not available
      return null;
    }
  };

  const manualVerify = async () => {
    setVerifying(true);
    try {
      await checkIntegrity();
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-16 rounded-lg"></div>
    );
  }

  const isHealthy = status?.isValid;
  const hasErrors = status?.errors && status.errors.length > 0;

  return (
    <div
      className={`border rounded-lg p-6 ${
        isHealthy
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-4 h-4 rounded-full ${
              isHealthy ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></div>
          <div>
            <h3 className={`text-lg font-semibold ${
              isHealthy ? 'text-green-900' : 'text-red-900'
            }`}>
              Ledger Integrity: {isHealthy ? 'Verified ✓' : 'Issues Detected ⚠'}
            </h3>
            <p className={`text-sm ${
              isHealthy ? 'text-green-700' : 'text-red-700'
            }`}>
              {status?.totalEntries || 0} entries verified
              {chainStats && ` • Chain length: ${chainStats.chainLength}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium underline hover:no-underline"
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
          <button
            onClick={manualVerify}
            disabled={verifying}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify Now'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {chainStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-600">Total Entries</p>
            <p className="text-lg font-bold text-gray-900">{chainStats.totalPostedEntries}</p>
          </div>
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-600">Chain Length</p>
            <p className="text-lg font-bold text-gray-900">{chainStats.chainLength}</p>
          </div>
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-600">Has Gaps</p>
            <p className={`text-lg font-bold ${chainStats.hasGaps ? 'text-red-600' : 'text-green-600'}`}>
              {chainStats.hasGaps ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-600">Status</p>
            <p className={`text-lg font-bold ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
              {isHealthy ? 'OK' : 'Issues'}
            </p>
          </div>
        </div>
      )}

      {/* Detailed Information */}
      {expanded && (
        <div className="mt-6 pt-6 border-t border-gray-300 space-y-4">
          {hasErrors ? (
            <div>
              <h4 className="font-semibold text-red-900 mb-3">Issues Found:</h4>
              <div className="space-y-2">
                {status.errors.map((error, idx) => (
                  <div key={idx} className="bg-red-100 p-3 rounded-lg">
                    <p className="font-mono text-sm text-red-800">
                      {error.position !== undefined ? `Position ${error.position}: ` : ''}{error.issue}
                    </p>
                    {error.entryNumber && (
                      <p className="text-red-700 text-sm mt-1">Entry: {error.entryNumber}</p>
                    )}
                    {error.expectedHash && (
                      <div className="mt-2 text-xs">
                        <p className="text-red-600">Expected: {error.expectedHash.substring(0, 16)}...</p>
                        <p className="text-red-600">Actual: {error.actualHash?.substring(0, 16)}...</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-green-100 p-4 rounded-lg">
              <p className="text-green-800 font-medium">
                ✓ All {status?.totalEntries || 0} entries verified successfully
              </p>
              <p className="text-green-700 text-sm mt-1">
                Ledger chain is intact and tamper-proof
              </p>
            </div>
          )}
          
          {/* Chain Statistics */}
          {chainStats && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Chain Statistics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Oldest Entry:</p>
                  <p className="font-mono text-gray-900">
                    {chainStats.oldestEntry ? new Date(chainStats.oldestEntry).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Newest Entry:</p>
                  <p className="font-mono text-gray-900">
                    {chainStats.newestEntry ? new Date(chainStats.newestEntry).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Hash Information */}
          {status?.lastHash && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Chain Hash</h4>
              <p className="text-xs text-blue-700 mb-1">Latest Hash:</p>
              <p className="font-mono text-xs text-blue-800 break-all">
                {status.lastHash}
              </p>
            </div>
          )}
          
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
            <p>Last verified: {new Date().toLocaleString()}</p>
            <p>Auto-refresh: Every 5 minutes</p>
          </div>
        </div>
      )}
    </div>
  );
}