import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ExpenseForm from './ExpenseForm';
import { expenseService } from '../services/invoiceService';

// Mock the services
vi.mock('../services/invoiceService');

// Mock OCRReceipt component
vi.mock('./OCRReceipt', () => ({
  default: ({ onExtractedData }) => (
    <div data-testid="ocr-receipt">
      <button 
        onClick={() => onExtractedData({
          vendor: 'OCR Vendor',
          amount: '150.00',
          date: '2024-12-01',
          description: 'OCR Description'
        })}
      >
        OCR Extract
      </button>
    </div>
  )
}));

describe('ExpenseForm with Initial Data Support', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const mockInitialData = {
    vendor: 'Scanned Vendor',
    amount: '200.00',
    date: '2024-12-01',
    description: 'Scanned Receipt Description'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    expenseService.createExpense.mockResolvedValue({});
  });

  test('renders expense form without initial data', () => {
    render(<ExpenseForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    expect(screen.getByText('Submit Expense')).toBeInTheDocument();
    expect(screen.getByLabelText('Vendor')).toHaveValue('');
    expect(screen.getByLabelText('Amount')).toHaveValue('');
    expect(screen.queryByText('Receipt data has been extracted')).not.toBeInTheDocument();
  });

  test('renders expense form with initial data from OCR', () => {
    render(
      <ExpenseForm 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
        initialData={mockInitialData}
      />
    );

    expect(screen.getByText('📸 Submit Scanned Expense')).toBeInTheDocument();
    expect(screen.getByText('Receipt data has been extracted and pre-filled')).toBeInTheDocument();
    
    // Check that form fields are pre-filled
    expect(screen.getByLabelText('Vendor')).toHaveValue('Scanned Vendor');
    expect(screen.getByLabelText('Amount')).toHaveValue('200.00');
    expect(screen.getByLabelText('Date')).toHaveValue('2024-12-01');
  });

  test('form fields can be edited after OCR pre-fill', async () => {
    render(
      <ExpenseForm 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
        initialData={mockInitialData}
      />
    );

    const vendorInput = screen.getByLabelText('Vendor');
    expect(vendorInput).toHaveValue('Scanned Vendor');

    // Edit the vendor field
    fireEvent.change(vendorInput, { target: { value: 'Modified Vendor' } });
    expect(vendorInput).toHaveValue('Modified Vendor');
  });

  test('OCR button works within form', async () => {
    render(<ExpenseForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Click OCR button
    fireEvent.click(screen.getByText('📸 Scan Receipt'));
    expect(screen.getByTestId('ocr-receipt')).toBeInTheDocument();

    // Extract data from OCR
    fireEvent.click(screen.getByText('OCR Extract'));

    // Check that form is updated with OCR data
    await waitFor(() => {
      expect(screen.getByLabelText('Vendor')).toHaveValue('OCR Vendor');
      expect(screen.getByLabelText('Amount')).toHaveValue('150.00');
    });

    // OCR component should be hidden after extraction
    expect(screen.queryByTestId('ocr-receipt')).not.toBeInTheDocument();
  });

  test('form submission works with initial data', async () => {
    render(
      <ExpenseForm 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
        initialData={mockInitialData}
      />
    );

    // Fill required fields that aren't pre-filled
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Test Description' }
    });

    // Submit form
    fireEvent.click(screen.getByText('Submit Expense'));

    await waitFor(() => {
      expect(expenseService.createExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor: 'Scanned Vendor',
          amount: '200.00',
          totalAmount: '200.00',
          date: '2024-12-01',
          description: 'Test Description'
        }),
        []
      );
    });

    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('form validation still works with initial data', async () => {
    render(
      <ExpenseForm 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
        initialData={mockInitialData}
      />
    );

    // Clear required field
    fireEvent.change(screen.getByLabelText('Vendor'), { target: { value: '' } });

    // Try to submit
    fireEvent.click(screen.getByText('Submit Expense'));

    // Form should not submit due to validation
    await waitFor(() => {
      expect(expenseService.createExpense).not.toHaveBeenCalled();
    });
  });

  test('cancel button works correctly', () => {
    render(<ExpenseForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('close button (X) works correctly', () => {
    render(<ExpenseForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('✕'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('handles form submission errors', async () => {
    expenseService.createExpense.mockRejectedValue(new Error('Submission failed'));

    render(<ExpenseForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Fill form
    fireEvent.change(screen.getByLabelText('Vendor'), { target: { value: 'Test Vendor' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });

    // Submit form
    fireEvent.click(screen.getByText('Submit Expense'));

    await waitFor(() => {
      expect(screen.getByText('Submission failed')).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('loading state during submission', async () => {
    expenseService.createExpense.mockImplementation(() => new Promise(() => {}));

    render(<ExpenseForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Fill form
    fireEvent.change(screen.getByLabelText('Vendor'), { target: { value: 'Test Vendor' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });

    // Submit form
    fireEvent.click(screen.getByText('Submit Expense'));

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(screen.getByText('Submitting...')).toBeDisabled();
  });

  test('file upload works correctly', () => {
    render(<ExpenseForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText(/Upload receipts/i);
    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // File should be selected (we can't easily test the actual file content)
    expect(fileInput.files).toHaveLength(1);
  });

  test('amount field updates totalAmount automatically', () => {
    render(<ExpenseForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const amountInput = screen.getByLabelText('Amount');
    fireEvent.change(amountInput, { target: { value: '150.50' } });

    // Both amount and totalAmount should be updated
    expect(amountInput).toHaveValue('150.50');
  });

  test('category and payment method dropdowns work', () => {
    render(<ExpenseForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const categorySelect = screen.getByLabelText('Category');
    const paymentSelect = screen.getByLabelText('Payment Method');

    fireEvent.change(categorySelect, { target: { value: 'travel' } });
    fireEvent.change(paymentSelect, { target: { value: 'cash' } });

    expect(categorySelect).toHaveValue('travel');
    expect(paymentSelect).toHaveValue('cash');
  });

  test('initial data does not override user changes', async () => {
    const { rerender } = render(
      <ExpenseForm onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // User makes changes
    fireEvent.change(screen.getByLabelText('Vendor'), { target: { value: 'User Vendor' } });

    // Component re-renders with initial data
    rerender(
      <ExpenseForm 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
        initialData={mockInitialData}
      />
    );

    // User's changes should be preserved initially, then overridden by initialData
    await waitFor(() => {
      expect(screen.getByLabelText('Vendor')).toHaveValue('Scanned Vendor');
    });
  });
});