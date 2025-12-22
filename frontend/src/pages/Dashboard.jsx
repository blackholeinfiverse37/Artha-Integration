import { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { reportsService } from '../services/reportsService';
import LedgerIntegrityStatus from '../components/LedgerIntegrityStatus';
import GSTSummaryWidget from '../components/GSTSummaryWidget';
import { BHIVIntegration } from '../components/BHIVIntegration';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await reportsService.getDashboardSummary();
      setSummary(data.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-indigo-600 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">Loading your dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching latest financial data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back, {user?.name}! 👋
              </h1>
              <p className="text-blue-100 text-lg">
                Here's your financial overview for today
              </p>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="text-white text-right">
                  <p className="text-sm opacity-90">Today's Date</p>
                  <p className="text-lg font-semibold">{new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8 -mt-4 relative z-10">
        {summary && (
          <div>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 px-4 sm:px-0">
              <KPICard
                title="Total Assets"
                value={formatCurrency(summary.balanceSheet.assets)}
                icon="💰"
                color="blue"
              />
              <KPICard
                title="Total Income"
                value={formatCurrency(summary.profitLoss.income)}
                icon="📈"
                color="green"
              />
              <KPICard
                title="Total Expenses"
                value={formatCurrency(summary.profitLoss.expenses)}
                icon="📉"
                color="red"
              />
              <KPICard
                title="Net Income"
                value={formatCurrency(summary.profitLoss.netIncome)}
                icon="💵"
                color={parseFloat(summary.profitLoss.netIncome) >= 0 ? 'green' : 'red'}
              />
            </div>

            {/* Ledger Integrity Status */}
            <div className="bg-white shadow rounded-lg p-6 mb-8 mx-4 sm:mx-0">
              <LedgerIntegrityStatus />
            </div>

            {/* GST Summary Widget */}
            <div className="mb-8 mx-4 sm:mx-0">
              <GSTSummaryWidget />
            </div>

            {/* BHIV AI Integration */}
            <div className="mb-8 mx-4 sm:mx-0">
              <BHIVIntegration />
            </div>

            {/* Balance Sheet Summary */}
            <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 mb-8 border border-white/20 mx-4 sm:mx-0">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Balance Sheet Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Assets</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.balanceSheet.assets)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Liabilities</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.balanceSheet.liabilities)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Equity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.balanceSheet.equity)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                {summary.balanceSheet.isBalanced ? (
                  <div className="flex items-center text-green-600">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium">Balance sheet is balanced</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium">Balance sheet is unbalanced</span>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 mb-8 border border-white/20 mx-4 sm:mx-0">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(summary.invoices).map(([status, data]) => (
                  <div key={status} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600 uppercase">{status}</p>
                    <p className="text-lg font-bold text-gray-900">{data.count}</p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(data.totalDue)} due
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Expenses by Category */}
            {summary.expenses && summary.expenses.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 mb-8 border border-white/20 mx-4 sm:mx-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Top Expenses (Current Month)
                </h2>
                <div className="space-y-3">
                  {summary.expenses.slice(0, 5).map((expense, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {expense._id.charAt(0).toUpperCase() + expense._id.slice(1)}
                        </p>
                        <p className="text-xs text-gray-500">{expense.count} transactions</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(expense.totalAmount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Journal Entries */}
            <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-white/20 mx-4 sm:mx-0">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Journal Entries
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Entry #
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Posted By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summary.recentEntries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {entry.entryNumber}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {entry.description}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {entry.postedBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function KPICard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-white',
    green: 'from-green-500 to-green-600 text-white',
    red: 'from-red-500 to-red-600 text-white',
  };

  const bgClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
    green: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
    red: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${bgClasses[color]}`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-16 w-16 rounded-full bg-white/20 blur-xl"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-r ${colorClasses[color]} shadow-lg`}>
            <span className="text-2xl">{icon}</span>
          </div>
          <div className="text-right">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}