import { useState, useEffect } from 'react';
import { expenseService } from '../services/invoiceService';
import OCRReceipt from './OCRReceipt';

export default function ExpenseForm({ onClose, onSuccess, initialData }) {
  const [formData, setFormData] = useState({
    vendor: '',
    description: '',
    category: 'supplies',
    amount: '',
    totalAmount: '',
    paymentMethod: 'credit_card',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Update form data when initialData is provided
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        vendor: initialData.vendor || prev.vendor,
        date: initialData.date || prev.date,
        amount: initialData.amount || prev.amount,
        totalAmount: initialData.amount || prev.totalAmount,
        description: initialData.description || prev.description,
      }));
    }
  }, [initialData]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOCR, setShowOCR] = useState(false);

  const categories = [
    'travel', 'meals', 'supplies', 'utilities', 'rent', 'insurance',
    'marketing', 'professional_services', 'equipment', 'software', 'other'
  ];

  const paymentMethods = [
    'cash', 'credit_card', 'debit_card', 'check', 'bank_transfer', 'other'
  ];

  const handleExtractedData = (ocrData) => {
    setFormData(prev => ({
      ...prev,
      vendor: ocrData.vendor || prev.vendor,
      date: ocrData.date || prev.date,
      amount: ocrData.amount || prev.amount,
      totalAmount: ocrData.amount || prev.totalAmount,
      description: ocrData.description || prev.description,
    }));
    setShowOCR(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'amount') {
        updated.totalAmount = value;
      }
      return updated;
    });
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await expenseService.createExpense(formData, files);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {initialData ? '📸 Submit Scanned Expense' : 'Submit Expense'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {initialData && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ✅ Receipt data has been extracted and pre-filled. Please review and modify as needed.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md">{error}</div>
          )}

          {/* OCR Section */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowOCR(!showOCR)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              {showOCR ? '✕ Hide OCR' : '📸 Scan Receipt'}
            </button>

            {showOCR && (
              <div className="mt-4">
                <OCRReceipt onExtractedData={handleExtractedData} />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Vendor</label>
                <input
                  type="text"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>
                      {method.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Receipts</label>
              <input
                type="file"
                onChange={handleFileChange}
                multiple
                accept="image/*,.pdf"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload receipts (images or PDFs, max 5 files, 10MB each)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}