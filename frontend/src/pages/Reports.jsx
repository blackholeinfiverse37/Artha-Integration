import { useState, useEffect } from 'react';
import { reportsService } from '../services/reportsService';

export default function Reports() {
  const [activeReport, setActiveReport] = useState('profit-loss');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    asOfDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadReport();
  }, [activeReport]);

  const loadReport = async () => {
    try {
      setLoading(true);
      let data;

      switch (activeReport) {
        case 'profit-loss':
          data = await reportsService.getProfitLoss(filters.startDate, filters.endDate);
          break;
        case 'balance-sheet':
          data = await reportsService.getBalanceSheet(filters.asOfDate);
          break;
        case 'cash-flow':
          data = await reportsService.getCashFlow(filters.startDate, filters.endDate);
          break;
        case 'trial-balance':
          data = await reportsService.getTrialBalance(filters.asOfDate);
          break;
        case 'aged-receivables':
          data = await reportsService.getAgedReceivables(filters.asOfDate);
          break;
        default:
          return;
      }

      setReportData(data.data);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const blob = await reportsService.exportGeneralLedger({
        dateFrom: filters.startDate,
        dateTo: filters.endDate,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `general-ledger-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  const reports = [
    { id: 'profit-loss', name: 'Profit & Loss', icon: '📊' },
    { id: 'balance-sheet', name: 'Balance Sheet', icon: '⚖️' },
    { id: 'cash-flow', name: 'Cash Flow', icon: '💰' },
    { id: 'trial-balance', name: 'Trial Balance', icon: '📋' },
    { id: 'aged-receivables', name: 'Aged Receivables', icon: '📅' },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Export PDF
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-3">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Reports</h2>
            <nav className="space-y-1">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setActiveReport(report.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeReport === report.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{report.icon}</span>
                  {report.name}
                </button>
              ))}
            </nav>

            {/* Filters */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
              {(activeReport === 'profit-loss' || activeReport === 'cash-flow') && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) =>
                        setFilters({ ...filters, startDate: e.target.value })
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) =>
                        setFilters({ ...filters, endDate: e.target.value })
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
              )}
              {(activeReport === 'balance-sheet' ||
                activeReport === 'trial-balance' ||
                activeReport === 'aged-receivables') && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">As Of Date</label>
                  <input
                    type="date"
                    value={filters.asOfDate}
                    onChange={(e) => setFilters({ ...filters, asOfDate: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              )}
              <button
                onClick={loadReport}
                className="mt-3 w-full px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="col-span-9">
          <div className="bg-white shadow rounded-lg p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Generating report...</p>
              </div>
            ) : reportData ? (
              <ReportContent report={activeReport} data={reportData} />
            ) : (
              <div className="text-center py-12 text-gray-500">
                Select a report and click Generate Report
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportContent({ report, data }) {
  switch (report) {
    case 'profit-loss':
      return <ProfitLossReport data={data} />;
    case 'balance-sheet':
      return <BalanceSheetReport data={data} />;
    case 'cash-flow':
      return <CashFlowReport data={data} />;
    case 'trial-balance':
      return <TrialBalanceReport data={data} />;
    case 'aged-receivables':
      return <AgedReceivablesReport data={data} />;
    default:
      return null;
  }
}

function ProfitLossReport({ data }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Profit & Loss Statement</h2>
      <p className="text-sm text-gray-600 mb-6">
        {new Date(data.period.startDate).toLocaleDateString()} to{' '}
        {new Date(data.period.endDate).toLocaleDateString()}
      </p>

      {/* Income */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Income</h3>
        <table className="w-full">
          <tbody>
            {data.income.accounts.map((account, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-2 text-sm text-gray-900">{account.name}</td>
                <td className="py-2 text-sm text-right text-gray-900">
                  ${parseFloat(account.amount).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-2 text-sm">Total Income</td>
              <td className="py-2 text-sm text-right">
                ${parseFloat(data.income.total).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Expenses */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Expenses</h3>
        <table className="w-full">
          <tbody>
            {data.expenses.accounts.map((account, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-2 text-sm text-gray-900">{account.name}</td>
                <td className="py-2 text-sm text-right text-gray-900">
                  ${parseFloat(account.amount).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-2 text-sm">Total Expenses</td>
              <td className="py-2 text-sm text-right">
                ${parseFloat(data.expenses.total).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Net Income */}
      <div className="pt-4 border-t-2 border-gray-300">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">Net Income</span>
          <span
            className={`text-lg font-bold ${
              parseFloat(data.netIncome) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            ${parseFloat(data.netIncome).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function BalanceSheetReport({ data }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Balance Sheet</h2>
      <p className="text-sm text-gray-600 mb-6">
        As of {new Date(data.asOfDate).toLocaleDateString()}
      </p>

      {/* Assets */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Assets</h3>
        <table className="w-full">
          <tbody>
            {data.assets.accounts.map((account, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-2 text-sm text-gray-900">{account.name}</td>
                <td className="py-2 text-sm text-right text-gray-900">
                  ${parseFloat(account.amount).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-2 text-sm">Total Assets</td>
              <td className="py-2 text-sm text-right">
                ${parseFloat(data.assets.total).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Liabilities */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Liabilities</h3>
        <table className="w-full">
          <tbody>
            {data.liabilities.accounts.map((account, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-2 text-sm text-gray-900">{account.name}</td>
                <td className="py-2 text-sm text-right text-gray-900">
                  ${parseFloat(account.amount).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-2 text-sm">Total Liabilities</td>
              <td className="py-2 text-sm text-right">
                ${parseFloat(data.liabilities.total).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Equity */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Equity</h3>
        <table className="w-full">
          <tbody>
            {data.equity.accounts.map((account, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-2 text-sm text-gray-900">{account.name}</td>
                <td className="py-2 text-sm text-right text-gray-900">
                  ${parseFloat(account.amount).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-2 text-sm">Total Equity</td>
              <td className="py-2 text-sm text-right">
                ${parseFloat(data.equity.total).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Balance Check */}
      <div className="pt-4 border-t-2 border-gray-300">
        {data.totals.isBalanced ? (
          <div className="flex items-center text-green-600">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Balance sheet is balanced</span>
          </div>
        ) : (
          <div className="flex items-center text-red-600">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">
              Balance sheet is unbalanced (Difference: $
              {parseFloat(data.totals.difference).toLocaleString()})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function CashFlowReport({ data }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Cash Flow Statement</h2>
      <p className="text-sm text-gray-600 mb-6">
        {new Date(data.period.startDate).toLocaleDateString()} to{' '}
        {new Date(data.period.endDate).toLocaleDateString()}
      </p>

      {/* Operating Activities */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Operating Activities</h3>
        {data.operating.activities.length > 0 ? (
          <table className="w-full mb-3">
            <tbody>
              {data.operating.activities.map((activity, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2 text-sm text-gray-900">{activity.description}</td>
                  <td className="py-2 text-sm text-right text-gray-900">
                    ${parseFloat(activity.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500 mb-3">No operating activities</p>
        )}
        <div className="flex justify-between font-bold">
          <span>Net Cash from Operating Activities</span>
          <span>${parseFloat(data.operating.netCashFlow).toLocaleString()}</span>
        </div>
      </div>

      {/* Investing Activities */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Investing Activities</h3>
        {data.investing.activities.length > 0 ? (
          <table className="w-full mb-3">
            <tbody>
              {data.investing.activities.map((activity, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2 text-sm text-gray-900">{activity.description}</td>
                  <td className="py-2 text-sm text-right text-gray-900">
                    ${parseFloat(activity.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500 mb-3">No investing activities</p>
        )}
        <div className="flex justify-between font-bold">
          <span>Net Cash from Investing Activities</span>
          <span>${parseFloat(data.investing.netCashFlow).toLocaleString()}</span>
        </div>
      </div>

      {/* Financing Activities */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Financing Activities</h3>
        {data.financing.activities.length > 0 ? (
          <table className="w-full mb-3">
            <tbody>
              {data.financing.activities.map((activity, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2 text-sm text-gray-900">{activity.description}</td>
                  <td className="py-2 text-sm text-right text-gray-900">
                    ${parseFloat(activity.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500 mb-3">No financing activities</p>
        )}
        <div className="flex justify-between font-bold">
          <span>Net Cash from Financing Activities</span>
          <span>${parseFloat(data.financing.netCashFlow).toLocaleString()}</span>
        </div>
      </div>

      {/* Net Cash Change */}
      <div className="pt-4 border-t-2 border-gray-300">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">Net Change in Cash</span>
          <span
            className={`text-lg font-bold ${
              parseFloat(data.netCashChange) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            ${parseFloat(data.netCashChange).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function TrialBalanceReport({ data }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Trial Balance</h2>
      <p className="text-sm text-gray-600 mb-6">
        As of {new Date(data.asOfDate).toLocaleDateString()}
      </p>

      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Code
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Account Name
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
              Debit
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
              Credit
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.accounts.map((account, idx) => (
            <tr key={idx}>
              <td className="px-3 py-2 text-sm text-gray-900">{account.code}</td>
              <td className="px-3 py-2 text-sm text-gray-900">{account.name}</td>
              <td className="px-3 py-2 text-sm text-right text-gray-900">
                ${parseFloat(account.debit).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-900">
                ${parseFloat(account.credit).toLocaleString()}
              </td>
            </tr>
          ))}
          <tr className="font-bold bg-gray-50">
            <td className="px-3 py-2 text-sm" colSpan="2">
              TOTALS
            </td>
            <td className="px-3 py-2 text-sm text-right">
              ${parseFloat(data.totals.debit).toLocaleString()}
            </td>
            <td className="px-3 py-2 text-sm text-right">
              ${parseFloat(data.totals.credit).toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4">
        {data.totals.isBalanced ? (
          <div className="flex items-center text-green-600">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Trial balance is balanced</span>
          </div>
        ) : (
          <div className="flex items-center text-red-600">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">
              Trial balance is unbalanced (Difference: $
              {parseFloat(data.totals.difference).toLocaleString()})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function AgedReceivablesReport({ data }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Aged Receivables Report</h2>
      <p className="text-sm text-gray-600 mb-6">
        As of {new Date(data.asOfDate).toLocaleDateString()}
      </p>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600">Current</p>
          <p className="text-lg font-bold">${parseFloat(data.totals.current).toLocaleString()}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600">1-30 Days</p>
          <p className="text-lg font-bold">${parseFloat(data.totals['1-30']).toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600">31-60 Days</p>
          <p className="text-lg font-bold">${parseFloat(data.totals['31-60']).toLocaleString()}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600">61-90 Days</p>
          <p className="text-lg font-bold">${parseFloat(data.totals['61-90']).toLocaleString()}</p>
        </div>
        <div className="bg-red-100 p-4 rounded-lg">
          <p className="text-xs text-gray-600">90+ Days</p>
          <p className="text-lg font-bold">${parseFloat(data.totals['90+']).toLocaleString()}</p>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-bold">Total Receivables</span>
          <span className="text-lg font-bold text-gray-900">
            ${parseFloat(data.totals.total).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Details by aging bucket */}
      {Object.entries(data.aging).map(([bucket, invoices]) => (
        invoices.length > 0 && (
          <div key={bucket} className="mb-6">
            <h3 className="text-sm font-semibold mb-2">{bucket === 'current' ? 'Current' : `${bucket} Days`}</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Invoice #</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Customer</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Due Date</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">{invoice.invoiceNumber}</td>
                    <td className="px-3 py-2">{invoice.customerName}</td>
                    <td className="px-3 py-2">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-right">${parseFloat(invoice.amountDue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ))}
    </div>
  );
}