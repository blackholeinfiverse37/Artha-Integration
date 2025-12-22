import { useState, useEffect } from 'react';
import { gstService } from '../services/gstService';
import GSTSummaryWidget from '../components/GSTSummaryWidget';

export default function GST() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const response = await gstService.getReturns();
      setReturns(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load GST returns');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReturn = async (type) => {
    try {
      const [year, month] = selectedPeriod.split('-');
      
      if (type === 'gstr-1') {
        await gstService.generateGSTR1(parseInt(month), parseInt(year));
      } else {
        await gstService.generateGSTR3B(parseInt(month), parseInt(year));
      }
      
      alert(`${type.toUpperCase()} generated successfully`);
      loadReturns();
    } catch (error) {
      alert(`Failed to generate ${type.toUpperCase()}: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleFileReturn = async (returnId) => {
    try {
      await gstService.fileReturn(returnId);
      alert('Return filed successfully');
      loadReturns();
    } catch (error) {
      alert(`Failed to file return: ${error.response?.data?.message || error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadReturns}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">GST Management</h1>
        <p className="text-gray-600">Manage GST returns, filings, and compliance</p>
      </div>

      {/* GST Summary Widget */}
      <div className="mb-8">
        <GSTSummaryWidget />
      </div>

      {/* Generate Returns Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Generate Returns</h2>
        
        <div className="flex gap-4 items-end mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period
            </label>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <button
            onClick={() => handleGenerateReturn('gstr-1')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Generate GSTR-1
          </button>
          <button
            onClick={() => handleGenerateReturn('gstr-3b')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Generate GSTR-3B
          </button>
        </div>
      </div>

      {/* Returns History */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">GST Returns History</h2>
        </div>
        
        {returns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-4">📋</div>
            <p>No GST returns found</p>
            <p className="text-sm mt-1">Generate your first return using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returns.map((gstReturn) => (
                  <tr key={gstReturn._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {gstReturn.returnType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {gstReturn.period.month.toString().padStart(2, '0')}/{gstReturn.period.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          gstReturn.status === 'filed'
                            ? 'bg-green-100 text-green-800'
                            : gstReturn.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {gstReturn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(gstReturn.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {gstReturn.status === 'draft' && (
                        <button
                          onClick={() => handleFileReturn(gstReturn._id)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          File Return
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-900">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}