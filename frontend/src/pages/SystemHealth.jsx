import { useState, useEffect } from 'react';
import api from '../services/api';

export default function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadHealth = async () => {
    try {
      const response = await api.get('/health/detailed');
      setHealth(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load health status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading system health...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">System Health</h1>

      {/* Overall Status */}
      <div className="mb-8">
        <div
          className={`inline-flex items-center px-4 py-2 rounded-lg ${
            health.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full mr-2 ${
              health.success ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></div>
          <span className="font-semibold">
            {health.success ? 'All Systems Operational' : 'System Issues Detected'}
          </span>
        </div>
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm text-gray-600">Version</p>
          <p className="text-2xl font-bold text-gray-900">{health.version}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm text-gray-600">Environment</p>
          <p className="text-2xl font-bold text-gray-900">{health.environment}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm text-gray-600">Uptime</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatUptime(health.uptime)}
          </p>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Services</h2>
        <div className="space-y-4">
          {Object.entries(health.services).map(([service, status]) => (
            <ServiceStatus key={service} name={service} status={status} />
          ))}
        </div>
      </div>

      {/* Memory Usage */}
      {health.memory && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Memory Usage</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">RSS</p>
              <p className="text-lg font-bold text-gray-900">{health.memory.rss}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Heap Total</p>
              <p className="text-lg font-bold text-gray-900">{health.memory.heapTotal}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Heap Used</p>
              <p className="text-lg font-bold text-gray-900">{health.memory.heapUsed}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceStatus({ name, status }) {
  const isHealthy = status.status === 'healthy' || status.status === 'disabled';

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center">
        <div
          className={`w-3 h-3 rounded-full mr-3 ${
            isHealthy ? 'bg-green-500' : 'bg-red-500'
          }`}
        ></div>
        <div>
          <p className="font-medium text-gray-900 capitalize">{name}</p>
          {status.state && (
            <p className="text-sm text-gray-500">State: {status.state}</p>
          )}
          {status.error && (
            <p className="text-sm text-red-600">Error: {status.error}</p>
          )}
        </div>
      </div>
      <span
        className={`px-3 py-1 text-xs font-medium rounded-full ${
          status.status === 'healthy'
            ? 'bg-green-100 text-green-800'
            : status.status === 'disabled'
            ? 'bg-gray-100 text-gray-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {status.status}
      </span>
    </div>
  );
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}