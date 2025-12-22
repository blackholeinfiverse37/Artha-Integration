import { useEffect, useState } from 'react';
import api from '../services/api';

export default function GSTSummaryWidget() {
  const [gstData, setGstData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState('');

  useEffect(() => {
    // Set current period (YYYY-MM format)
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setCurrentPeriod(period);
    
    loadGSTSummary(period);
  }, []);

  const loadGSTSummary = async (period) => {
    try {
      setLoading(true);
      const response = await api.get(`/gst/summary?period=${period}`);
      setGstData(response.data.data);
    } catch (error) {
      console.error('Failed to load GST summary:', error);
      setGstData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportGSTR1 = async () => {
    try {
      const response = await api.get(`/gst/filing-packet/export?type=gstr-1&period=${currentPeriod}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GSTR1_${currentPeriod}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export GSTR-1:', error);
    }
  };

  const exportGSTR3B = async () => {
    try {
      const response = await api.get(`/gst/filing-packet/export?type=gstr-3b&period=${currentPeriod}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GSTR3B_${currentPeriod}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export GSTR-3B:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          GST Summary - {currentPeriod}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={exportGSTR1}
            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Export GSTR-1
          </button>
          <button
            onClick={exportGSTR3B}
            className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export GSTR-3B
          </button>
        </div>
      </div>

      {gstData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Taxable Value</p>
            <p className="text-2xl font-bold text-blue-900">
              ₹{formatAmount(gstData.gstr1Summary?.totalTaxableValue || 0)}
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">GST Collected</p>
            <p className="text-2xl font-bold text-green-900">
              ₹{formatAmount(gstData.combined?.totalOutwardTax || 0)}
            </p>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-600 font-medium">Net GST Payable</p>
            <p className="text-2xl font-bold text-orange-900">
              ₹{formatAmount(gstData.combined?.netTaxPayable || 0)}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No GST data available for this period</p>
          <p className="text-sm text-gray-400 mt-2">
            GST summary will appear once you have invoices with GST
          </p>
        </div>
      )}
    </div>
  );
}

function formatAmount(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0.00';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}