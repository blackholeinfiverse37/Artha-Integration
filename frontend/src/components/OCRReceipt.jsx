import { useState } from 'react';
import api from '../services/api';

export default function OCRReceipt({ onExtractedData }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState('');

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    await processReceipt(file);
  };

  const processReceipt = async (file) => {
    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('receipt', file);

      const response = await api.post('/expenses/ocr', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setExtracted(response.data.data);
      onExtractedData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process receipt');
      console.error('OCR error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">📸 Scan Receipt (OCR)</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Receipt Image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={loading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50"
        />
      </div>

      {preview && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
          <img src={preview} alt="Receipt preview" className="max-h-64 mx-auto rounded" />
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Processing receipt...</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {extracted && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-3">✅ Extracted Data</h3>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Vendor</p>
              <p className="font-medium">{extracted.vendor}</p>
            </div>
            <div>
              <p className="text-gray-600">Date</p>
              <p className="font-medium">{extracted.date}</p>
            </div>
            <div>
              <p className="text-gray-600">Amount</p>
              <p className="font-medium">₹{parseFloat(extracted.amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Tax</p>
              <p className="font-medium">₹{parseFloat(extracted.taxAmount).toFixed(2)}</p>
            </div>
            {extracted.invoiceNumber && (
              <div>
                <p className="text-gray-600">Invoice #</p>
                <p className="font-medium">{extracted.invoiceNumber}</p>
              </div>
            )}
            <div>
              <p className="text-gray-600">Confidence</p>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-300 rounded">
                  <div
                    className={`h-full rounded ${
                      extracted.confidence >= 70
                        ? 'bg-green-500'
                        : extracted.confidence >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${extracted.confidence}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{extracted.confidence}%</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-600 mt-3">
            ⓘ Please review the extracted data before confirming. Manual corrections are welcome.
          </p>
        </div>
      )}
    </div>
  );
}
