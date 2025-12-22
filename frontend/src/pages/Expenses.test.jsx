import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Expenses from './Expenses';
import { expenseService } from '../services/invoiceService';

// Mock the services
vi.mock('../services/invoiceService');

// Mock the components
vi.mock('../components/ExpenseForm', () => ({
  default: ({ onClose, onSuccess, initialData }) => (
    <div data-testid="expense-form">
      <button onClick={onClose}>Close Form</button>
      <button onClick={onSuccess}>Submit Success</button>
      {initialData && <div data-testid="initial-data">Has Initial Data</div>}
    </div>
  )
}));

vi.mock('../components/OCRReceipt', () => ({
  default: ({ onExtractedData }) => (
    <div data-testid="ocr-receipt">
      <button 
        onClick={() => onExtractedData({
          vendor: 'Test Vendor',
          amount: '100.00',
          date: '2024-12-01',
          description: 'Test Receipt'
        })}
      >
        Extract Data
      </button>
    </div>
  )
}));

describe('Expenses Page with OCR Integration', () => {
  const mockExpenses = [
    {
      _id: '1',
      expenseNumber: 'EXP-001',
      date: '2024-12-01',
      category: 'supplies',
      vendor: 'Test Vendor',
      totalAmount: '100.00',
      status: 'pending'
    },
    {
      _id: '2',
      expenseNumber: 'EXP-002',
      date: '2024-12-02',
      category: 'travel',
      vendor: 'Another Vendor',
      totalAmount: '250.00',
      status: 'approved'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    expenseService.getExpenses.mockResolvedValue({
      data: mockExpenses
    });
  });

  test('renders expenses page with scan receipt button', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('Expenses')).toBeInTheDocument();
      expect(screen.getByText('📸 Scan Receipt')).toBeInTheDocument();
      expect(screen.getByText('+ New Expense')).toBeInTheDocument();
    });
  });

  test('displays expenses table with data', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('EXP-001')).toBeInTheDocument();
      expect(screen.getByText('EXP-002')).toBeInTheDocument();
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
      expect(screen.getByText('Another Vendor')).toBeInTheDocument();
    });
  });

  test('scan receipt button toggles OCR component', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('📸 Scan Receipt')).toBeInTheDocument();
    });

    // Click scan receipt button
    fireEvent.click(screen.getByText('📸 Scan Receipt'));

    // OCR component should appear
    expect(screen.getByTestId('ocr-receipt')).toBeInTheDocument();

    // Click again to hide
    fireEvent.click(screen.getByText('📸 Scan Receipt'));

    // OCR component should disappear
    expect(screen.queryByTestId('ocr-receipt')).not.toBeInTheDocument();
  });

  test('new expense button opens expense form', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('+ New Expense')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ New Expense'));

    expect(screen.getByTestId('expense-form')).toBeInTheDocument();
  });

  test('OCR data extraction flow works correctly', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('📸 Scan Receipt')).toBeInTheDocument();
    });

    // Open OCR component
    fireEvent.click(screen.getByText('📸 Scan Receipt'));
    expect(screen.getByTestId('ocr-receipt')).toBeInTheDocument();

    // Extract data from OCR
    fireEvent.click(screen.getByText('Extract Data'));

    // OCR should close and expense form should open with initial data
    expect(screen.queryByTestId('ocr-receipt')).not.toBeInTheDocument();
    expect(screen.getByTestId('expense-form')).toBeInTheDocument();
    expect(screen.getByTestId('initial-data')).toBeInTheDocument();
  });

  test('expense form closes and clears extracted data', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('📸 Scan Receipt')).toBeInTheDocument();
    });

    // Go through OCR flow
    fireEvent.click(screen.getByText('📸 Scan Receipt'));
    fireEvent.click(screen.getByText('Extract Data'));

    // Form should be open with initial data
    expect(screen.getByTestId('expense-form')).toBeInTheDocument();
    expect(screen.getByTestId('initial-data')).toBeInTheDocument();

    // Close form
    fireEvent.click(screen.getByText('Close Form'));

    // Form should be closed
    expect(screen.queryByTestId('expense-form')).not.toBeInTheDocument();
  });

  test('filter tabs work correctly', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Recorded')).toBeInTheDocument();
    });

    // Click on pending filter
    fireEvent.click(screen.getByText('Pending'));

    // Should call getExpenses with status filter
    await waitFor(() => {
      expect(expenseService.getExpenses).toHaveBeenCalledWith({ status: 'pending' });
    });
  });

  test('handles loading state', () => {
    expenseService.getExpenses.mockImplementation(() => new Promise(() => {}));
    
    render(<Expenses />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expenseService.getExpenses.mockRejectedValue(new Error('API Error'));
    
    render(<Expenses />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load expenses:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  test('displays correct status colors', async () => {
    render(<Expenses />);

    await waitFor(() => {
      // Check that status badges are rendered
      const statusElements = screen.getAllByText(/pending|approved/);
      expect(statusElements.length).toBeGreaterThan(0);
    });
  });

  test('formats currency correctly', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('$100')).toBeInTheDocument();
      expect(screen.getByText('$250')).toBeInTheDocument();
    });
  });

  test('maintains existing functionality after OCR integration', async () => {
    render(<Expenses />);

    // All existing elements should still be present
    await waitFor(() => {
      expect(screen.getByText('Expenses')).toBeInTheDocument();
      expect(screen.getByText('+ New Expense')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Recorded')).toBeInTheDocument();
    });

    // Table headers should be present
    expect(screen.getByText('Expense #')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Vendor')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  test('OCR and manual form creation work independently', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('+ New Expense')).toBeInTheDocument();
    });

    // Open manual form (without OCR)
    fireEvent.click(screen.getByText('+ New Expense'));
    expect(screen.getByTestId('expense-form')).toBeInTheDocument();
    expect(screen.queryByTestId('initial-data')).not.toBeInTheDocument();

    // Close form
    fireEvent.click(screen.getByText('Close Form'));
    expect(screen.queryByTestId('expense-form')).not.toBeInTheDocument();

    // Now try OCR flow
    fireEvent.click(screen.getByText('📸 Scan Receipt'));
    fireEvent.click(screen.getByText('Extract Data'));
    
    expect(screen.getByTestId('expense-form')).toBeInTheDocument();
    expect(screen.getByTestId('initial-data')).toBeInTheDocument();
  });

  test('successful expense submission reloads data', async () => {
    render(<Expenses />);

    await waitFor(() => {
      expect(screen.getByText('+ New Expense')).toBeInTheDocument();
    });

    // Open form and submit
    fireEvent.click(screen.getByText('+ New Expense'));
    fireEvent.click(screen.getByText('Submit Success'));

    // Should reload expenses
    await waitFor(() => {
      expect(expenseService.getExpenses).toHaveBeenCalledTimes(2); // Initial load + reload
    });
  });
});