// frontend/src/components/IdempotentLedgerForm.jsx
// Enhanced example component demonstrating idempotent operations

import React, { useState } from 'react';
import { useSignedApi } from '../services/signedApiService.js';
import { useIdempotentOperation } from '../utils/idempotency.js';

/**
 * Enhanced form component demonstrating complete idempotent operation workflow
 * Shows triple-layer security: Data Consistency + Request Integrity + Operation Uniqueness
 */
export default function IdempotentLedgerForm() {
  const [formData, setFormData] = useState({
    description: '',
    lines: [
      { account: '', debit: '', credit: '' },
      { account: '', credit: '', debit: '' },
    ],
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const signedApi = useSignedApi();
  const idempotentOp = useIdempotentOperation('create-journal-entry');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Option 1: Manual idempotency key management
      const idempotencyKey = idempotentOp.getOrCreateKey();
      
      console.log('[IdempotentForm] Creating entry with key:', idempotencyKey);
      
      const response = await signedApi.createLedgerEntry(formData, idempotencyKey);
      
      setResult({
        success: true,
        message: response.isRetry ? 
          'Entry retrieved from cache (duplicate request detected)' : 
          'Entry created successfully with cryptographic protection',
        data: response.data,
        isRetry: response.isRetry,
        idempotencyKey: response.idempotencyKey,
      });
      
      // Clear key after successful operation
      if (!response.isRetry) {
        idempotentOp.clear();
      }
      
      // Reset form only for new entries
      if (!response.isRetry) {
        setFormData({
          description: '',
          lines: [
            { account: '', debit: '', credit: '' },
            { account: '', credit: '', debit: '' },
          ],
        });
      }
    } catch (err) {
      setError({
        message: err.message,
        isIdempotencyError: err.message.includes('idempotency') || err.message.includes('Idempotency'),
        isSigningError: err.message.includes('signature') || err.message.includes('signing'),
      });
      // Keep key stored for retry
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWithRetry = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Option 2: Automatic retry with exponential backoff
      console.log('[IdempotentForm] Creating entry with auto-retry');
      
      const response = await signedApi.createLedgerEntryWithRetry(formData);
      
      setResult({
        success: true,
        message: 'Entry created successfully with automatic retry protection',
        data: response.data,
        isRetry: response.isRetry,
        idempotencyKey: response.idempotencyKey,
      });
      
      // Reset form
      setFormData({
        description: '',
        lines: [
          { account: '', debit: '', credit: '' },
          { account: '', credit: '', debit: '' },
        ],
      });
    } catch (err) {
      setError({
        message: `Failed after retries: ${err.message}`,
        isRetryFailure: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index][field] = value;
    setFormData({ ...formData, lines: newLines });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { account: '', debit: '', credit: '' }],
    });
  };

  const clearStoredKey = () => {
    idempotentOp.clear();
    setResult(null);
    setError(null);
  };

  const storedKey = idempotentOp.getKey();

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Idempotent Ledger Entry Creation
        </h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">🛡️ Triple-Layer Security</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <strong>Layer 1: Data Consistency</strong>
              <ul className="mt-1 space-y-1">
                <li>• Balanced entries only</li>
                <li>• Valid accounts only</li>
                <li>• Immutable after posting</li>
              </ul>
            </div>
            <div>
              <strong>Layer 2: Request Integrity</strong>
              <ul className="mt-1 space-y-1">
                <li>• HMAC-SHA256 signatures</li>
                <li>• Tampering detection</li>
                <li>• Replay prevention</li>
              </ul>
            </div>
            <div>
              <strong>Layer 3: Operation Uniqueness</strong>
              <ul className="mt-1 space-y-1">
                <li>• Idempotency enforcement</li>
                <li>• Duplicate prevention</li>
                <li>• Safe retries enabled</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {storedKey && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-yellow-800">
                <strong>Stored Key:</strong> {storedKey.substring(0, 8)}...
              </span>
              <p className="text-xs text-yellow-700 mt-1">
                This operation can be safely retried with the same key
              </p>
            </div>
            <button
              onClick={clearStoredKey}
              className="text-xs text-yellow-600 hover:text-yellow-800 underline"
            >
              Clear Key
            </button>
          </div>
        </div>
      )}

      <form className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter transaction description"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Journal Lines (Double-Entry)
          </label>
          <div className="space-y-3">
            {formData.lines.map((line, index) => (
              <div key={index} className="grid grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Account ID</label>
                  <input
                    type="text"
                    value={line.account}
                    onChange={(e) => handleLineChange(index, 'account', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Account ID"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Debit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={line.debit}
                    onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Credit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={line.credit}
                    onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLine}
            className="mt-3 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
          >
            + Add Line
          </button>
        </div>

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating Entry...' : '🔐 Create with Manual Key Management'}
          </button>
          <button
            type="button"
            onClick={handleSubmitWithRetry}
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating Entry...' : '🔄 Create with Auto-Retry'}
          </button>
        </div>
      </form>

      {/* Results */}
      {result && (
        <div className={`mt-6 p-4 rounded-lg border ${
          result.isRetry ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            result.isRetry ? 'text-orange-900' : 'text-green-900'
          }`}>
            {result.isRetry ? '🔄 Cached Response' : '✅ Success'}
          </h3>
          <p className={`mb-2 ${
            result.isRetry ? 'text-orange-800' : 'text-green-800'
          }`}>
            {result.message}
          </p>
          {result.data && (
            <div className={`text-sm ${
              result.isRetry ? 'text-orange-700' : 'text-green-700'
            }`}>
              <p>Entry ID: {result.data.id}</p>
              <p>Status: {result.data.status}</p>
              <p>Idempotency Key: {result.idempotencyKey?.substring(0, 8)}...</p>
              {result.isRetry && (
                <p className="mt-2 font-medium">
                  ⚡ This response was returned from cache - no duplicate entry was created
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-900 mb-2">
            {error.isIdempotencyError ? '🔄 Idempotency Error' : 
             error.isSigningError ? '🔒 Signature Error' : 
             error.isRetryFailure ? '🔄 Retry Failed' : '❌ Error'}
          </h3>
          <p className="text-red-800">{error.message}</p>
          {error.isIdempotencyError && (
            <div className="mt-2 text-sm text-red-700">
              <p>Idempotency key issues:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Check if key format is valid UUID v4</li>
                <li>Ensure key is provided for write operations</li>
                <li>Verify backend idempotency middleware is active</li>
              </ul>
            </div>
          )}
          {error.isSigningError && (
            <div className="mt-2 text-sm text-red-700">
              <p>Request signing issues:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Check authentication status</li>
                <li>Verify system time synchronization</li>
                <li>Ensure signing secret is configured</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Technical Details */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">🔧 Enhanced Implementation</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>Idempotency:</strong> UUID v4 keys with 24-hour cache expiration</p>
          <p><strong>Request Signing:</strong> HMAC-SHA256 with nonce and timestamp validation</p>
          <p><strong>Key Management:</strong> localStorage with automatic expiration</p>
          <p><strong>Retry Strategy:</strong> Exponential backoff with same idempotency key</p>
          <p><strong>Cache Detection:</strong> Server returns isRetry flag for cached responses</p>
          <p><strong>Error Handling:</strong> Specific error codes for different failure types</p>
        </div>
      </div>
    </div>
  );
}