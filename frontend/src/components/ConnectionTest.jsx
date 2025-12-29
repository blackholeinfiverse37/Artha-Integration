import { useState, useEffect } from 'react';

export default function ConnectionTest() {
  const [tests, setTests] = useState({});
  const [loading, setLoading] = useState(true);

  const getServiceUrl = (port, path = '') => {
    const currentHost = window.location.hostname;
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      return `http://${currentHost}:${port}${path}`;
    }
    return `http://localhost:${port}${path}`;
  };

  const runTests = async () => {
    setLoading(true);
    const results = {};

    // Test backend health
    try {
      const backendUrl = getServiceUrl(5000, '/api/health');
      console.log('Testing backend:', backendUrl);
      
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      results.backend = {
        status: response.ok ? 'success' : 'error',
        message: response.ok ? 'Backend connected' : `HTTP ${response.status}`,
        data: response.ok ? await response.json() : null,
        url: backendUrl
      };
    } catch (error) {
      results.backend = {
        status: 'error',
        message: error.message || 'Backend connection failed',
        data: null,
        url: getServiceUrl(5000, '/api/health')
      };
    }

    // Test BHIV Core
    try {
      const bhivCoreUrl = getServiceUrl(8001, '/health');
      console.log('Testing BHIV Core:', bhivCoreUrl);
      
      const response = await fetch(bhivCoreUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      results.bhivCore = {
        status: response.ok ? 'success' : 'error',
        message: response.ok ? 'BHIV Core connected' : `HTTP ${response.status}`,
        data: response.ok ? await response.json() : null,
        url: bhivCoreUrl
      };
    } catch (error) {
      results.bhivCore = {
        status: 'error',
        message: error.message || 'BHIV Core connection failed',
        data: null,
        url: getServiceUrl(8001, '/health')
      };
    }

    // Test BHIV Central
    try {
      const bhivCentralUrl = getServiceUrl(8000, '/health');
      console.log('Testing BHIV Central:', bhivCentralUrl);
      
      const response = await fetch(bhivCentralUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      results.bhivCentral = {
        status: response.ok ? 'success' : 'error',
        message: response.ok ? 'BHIV Central connected' : `HTTP ${response.status}`,
        data: response.ok ? await response.json() : null,
        url: bhivCentralUrl
      };
    } catch (error) {
      results.bhivCentral = {
        status: 'error',
        message: error.message || 'BHIV Central connection failed',
        data: null,
        url: getServiceUrl(8000, '/health')
      };
    }

    // Test Integration Bridge
    try {
      const bridgeUrl = getServiceUrl(8004, '/health');
      console.log('Testing Integration Bridge:', bridgeUrl);
      
      const response = await fetch(bridgeUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      results.integrationBridge = {
        status: response.ok ? 'success' : 'error',
        message: response.ok ? 'Integration Bridge connected' : `HTTP ${response.status}`,
        data: response.ok ? await response.json() : null,
        url: bridgeUrl
      };
    } catch (error) {
      results.integrationBridge = {
        status: 'error',
        message: error.message || 'Integration Bridge connection failed',
        data: null,
        url: getServiceUrl(8004, '/health')
      };
    }

    setTests(results);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">System Connection Test</h2>
          <button
            onClick={runTests}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Retest'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(tests).map(([service, result]) => (
            <div
              key={service}
              className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold capitalize">
                  {service.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <span className="text-2xl">{getStatusIcon(result.status)}</span>
              </div>
              <p className="text-sm mb-2">{result.message}</p>
              {result.url && (
                <p className="text-xs text-gray-500 mb-2">URL: {result.url}</p>
              )}
              {result.data && (
                <details className="text-xs">
                  <summary className="cursor-pointer">View Details</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        {!loading && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Troubleshooting Tips:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• If Backend fails: Run <code>cd backend && npm run dev</code></li>
              <li>• If BHIV Core fails: Run <code>cd v1-BHIV_CORE-main && python simple_api.py --port 8001</code></li>
              <li>• If BHIV Central fails: Run <code>cd BHIV_Central_Depository-main && python main.py</code></li>
              <li>• If Integration Bridge fails: Run <code>node integration-bridge.js</code></li>
              <li>• Or run the complete startup: <code>start-integrated-system.bat</code></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}