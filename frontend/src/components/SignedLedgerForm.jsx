// frontend/src/components/SignedLedgerForm.jsx
// Example component demonstrating signed request usage

import React, { useState, useContext } from 'react';
import { useSignedApi } from '../services/signedApiService.js';

/**
 * Example form component that creates ledger entries with cryptographic signatures
 * Demonstrates the complete signing workflow
 */
export default function SignedLedgerForm() {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // This will automatically sign the request with HMAC-SHA256
      const response = await signedApi.createLedgerEntry(formData);
      
      setResult({
        success: true,
        message: 'Ledger entry created successfully with verified signature',
        data: response.data,
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
        message: err.message,
        isSigningError: err.message.includes('signature') || err.message.includes('signing'),
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

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create Signed Ledger Entry
        </h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">🔐 Security Features</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• HMAC-SHA256 cryptographic signatures</li>
            <li>• Nonce-based replay attack prevention</li>
            <li>• Timestamp validation (5-minute window)</li>
            <li>• User-specific secret derivation</li>
            <li>• Tamper-proof request verification</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating Signed Entry...' : '🔐 Create Signed Entry'}
          </button>
        </div>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">✅ Success</h3>
          <p className="text-green-800 mb-2">{result.message}</p>
          {result.data && (
            <div className="text-sm text-green-700">
              <p>Entry ID: {result.data.id}</p>
              <p>Status: {result.data.status}</p>
              <p>Signature Verified: ✅</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-900 mb-2">
            {error.isSigningError ? '🔒 Signature Error' : '❌ Error'}
          </h3>
          <p className="text-red-800">{error.message}</p>
          {error.isSigningError && (
            <div className="mt-2 text-sm text-red-700">
              <p>This indicates a problem with request signing:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Check your authentication status</li>
                <li>Verify system time is synchronized</li>
                <li>Ensure signing secret is configured</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Technical Details */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">🔧 Technical Implementation</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>Signature Algorithm:</strong> HMAC-SHA256</p>
          <p><strong>Canonical String:</strong> body|userId|timestamp|nonce (sorted keys)</p>
          <p><strong>Headers Added:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li>X-Request-Signature: HMAC hex digest</li>
            <li>X-Request-Timestamp: Current time in milliseconds</li>
            <li>X-Request-Nonce: 32-character random hex string</li>
          </ul>
          <p><strong>Security:</strong> Timing-safe comparison, replay protection, tamper detection</p>
        </div>
      </div>
    </div>
  );
}