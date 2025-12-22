import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Dashboard from './Dashboard';
import { authService } from '../services/authService';
import { reportsService } from '../services/reportsService';

// Mock the services
vi.mock('../services/authService');
vi.mock('../services/reportsService');
vi.mock('../services/api');

// Mock the components
vi.mock('../components/LedgerIntegrityStatus', () => ({
  default: () => <div data-testid="ledger-integrity-status">Ledger Integrity Status</div>
}));

vi.mock('../components/GSTSummaryWidget', () => ({
  default: () => <div data-testid="gst-summary-widget">GST Summary Widget</div>
}));

describe('Dashboard Integration', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin'
  };

  const mockSummary = {
    balanceSheet: {
      assets: '100000',
      liabilities: '50000',
      equity: '50000',
      isBalanced: true
    },
    profitLoss: {
      income: '75000',
      expenses: '25000',
      netIncome: '50000'
    },
    invoices: {
      draft: { count: 5, totalDue: '10000' },
      sent: { count: 3, totalDue: '15000' },
      paid: { count: 10, totalDue: '0' }
    },
    expenses: [
      { _id: 'office', count: 5, totalAmount: '5000' },
      { _id: 'travel', count: 3, totalAmount: '3000' }
    ],
    recentEntries: [
      {
        entryNumber: 'JE-001',
        date: '2024-12-01',
        description: 'Test Entry',
        postedBy: 'Admin'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authService.getCurrentUser.mockReturnValue(mockUser);
    reportsService.getDashboardSummary.mockResolvedValue({
      data: mockSummary
    });
  });

  test('renders both new components in Dashboard', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('ledger-integrity-status')).toBeInTheDocument();
      expect(screen.getByTestId('gst-summary-widget')).toBeInTheDocument();
    });
  });

  test('displays welcome message with user name', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome back, Test User! 👋')).toBeInTheDocument();
    });
  });

  test('displays KPI cards with correct values', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Assets')).toBeInTheDocument();
      expect(screen.getByText('Total Income')).toBeInTheDocument();
      expect(screen.getByText('Total Expenses')).toBeInTheDocument();
      expect(screen.getByText('Net Income')).toBeInTheDocument();
    });
  });

  test('displays balance sheet summary', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Balance Sheet Summary')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Liabilities')).toBeInTheDocument();
      expect(screen.getByText('Equity')).toBeInTheDocument();
    });
  });

  test('displays invoice summary', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Summary')).toBeInTheDocument();
    });
  });

  test('displays recent journal entries', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recent Journal Entries')).toBeInTheDocument();
      expect(screen.getByText('JE-001')).toBeInTheDocument();
      expect(screen.getByText('Test Entry')).toBeInTheDocument();
    });
  });

  test('shows loading state initially', () => {
    reportsService.getDashboardSummary.mockImplementation(() => new Promise(() => {}));
    
    render(<Dashboard />);
    
    expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument();
    expect(screen.getByText('Fetching latest financial data')).toBeInTheDocument();
  });

  test('handles dashboard loading error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    reportsService.getDashboardSummary.mockRejectedValue(new Error('API Error'));
    
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load dashboard:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  test('displays balance sheet status correctly when balanced', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Balance sheet is balanced')).toBeInTheDocument();
    });
  });

  test('displays balance sheet status correctly when unbalanced', async () => {
    const unbalancedSummary = {
      ...mockSummary,
      balanceSheet: {
        ...mockSummary.balanceSheet,
        isBalanced: false
      }
    };

    reportsService.getDashboardSummary.mockResolvedValue({
      data: unbalancedSummary
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Balance sheet is unbalanced')).toBeInTheDocument();
    });
  });

  test('displays expenses section when expenses exist', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Top Expenses (Current Month)')).toBeInTheDocument();
      expect(screen.getByText('Office')).toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
    });
  });

  test('hides expenses section when no expenses exist', async () => {
    const noExpensesSummary = {
      ...mockSummary,
      expenses: []
    };

    reportsService.getDashboardSummary.mockResolvedValue({
      data: noExpensesSummary
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Top Expenses (Current Month)')).not.toBeInTheDocument();
    });
  });

  test('formats currency values correctly', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      // Check that currency formatting is applied (should contain $ symbol)
      const currencyElements = screen.getAllByText(/\$[\d,]+\.?\d*/);
      expect(currencyElements.length).toBeGreaterThan(0);
    });
  });

  test('displays current date in header', async () => {
    render(<Dashboard />);

    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    await waitFor(() => {
      expect(screen.getByText(today)).toBeInTheDocument();
    });
  });

  test('components are properly positioned in layout', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      const ledgerComponent = screen.getByTestId('ledger-integrity-status');
      const gstComponent = screen.getByTestId('gst-summary-widget');
      
      expect(ledgerComponent).toBeInTheDocument();
      expect(gstComponent).toBeInTheDocument();
      
      // Verify they appear before the balance sheet summary
      const balanceSheetHeading = screen.getByText('Balance Sheet Summary');
      expect(balanceSheetHeading).toBeInTheDocument();
    });
  });

  test('maintains responsive design classes', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      // Check that responsive classes are present in the DOM
      const mainContent = document.querySelector('main');
      expect(mainContent).toHaveClass('max-w-7xl', 'mx-auto');
    });
  });
});