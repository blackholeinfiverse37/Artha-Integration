import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import LedgerIntegrityStatus from './LedgerIntegrityStatus';
import api from '../services/api';

// Mock the API
vi.mock('../services/api');

describe('LedgerIntegrityStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    api.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<LedgerIntegrityStatus />);
    
    expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
  });

  it('displays healthy status when ledger is valid', async () => {
    const mockResponse = {
      data: {
        data: {
          isValid: true,
          totalEntries: 150,
          errors: [],
          message: 'Ledger chain is valid and tamper-proof'
        }
      }
    };
    
    api.get.mockResolvedValue(mockResponse);
    
    render(<LedgerIntegrityStatus />);
    
    await waitFor(() => {
      expect(screen.getByText('Ledger Integrity: OK ✓')).toBeInTheDocument();
      expect(screen.getByText('150 entries verified')).toBeInTheDocument();
    });
    
    expect(screen.getByRole('generic')).toHaveClass('bg-green-50', 'border-green-200');
  });

  it('displays error status when ledger has issues', async () => {
    const mockResponse = {
      data: {
        data: {
          isValid: false,
          totalEntries: 100,
          errors: [
            {
              position: 5,
              entryNumber: 'JE-20250101-0006',
              issue: 'Hash mismatch (possible tampering)'
            }
          ]
        }
      }
    };
    
    api.get.mockResolvedValue(mockResponse);
    
    render(<LedgerIntegrityStatus />);
    
    await waitFor(() => {
      expect(screen.getByText('Ledger Integrity: Issues Detected ⚠')).toBeInTheDocument();
      expect(screen.getByText('100 entries verified')).toBeInTheDocument();
    });
    
    expect(screen.getByRole('generic')).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('expands to show detailed error information', async () => {
    const mockResponse = {
      data: {
        data: {
          isValid: false,
          totalEntries: 100,
          errors: [
            {
              position: 5,
              entryNumber: 'JE-20250101-0006',
              issue: 'Hash mismatch (possible tampering)'
            }
          ]
        }
      }
    };
    
    api.get.mockResolvedValue(mockResponse);
    
    render(<LedgerIntegrityStatus />);
    
    await waitFor(() => {
      expect(screen.getByText('Details')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Details'));
    
    expect(screen.getByText('Issues Found:')).toBeInTheDocument();
    expect(screen.getByText('Position 5: Hash mismatch (possible tampering)')).toBeInTheDocument();
    expect(screen.getByText('Entry: JE-20250101-0006')).toBeInTheDocument();
  });

  it('shows success message when no errors', async () => {
    const mockResponse = {
      data: {
        data: {
          isValid: true,
          totalEntries: 150,
          errors: []
        }
      }
    };
    
    api.get.mockResolvedValue(mockResponse);
    
    render(<LedgerIntegrityStatus />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Details'));
    });
    
    expect(screen.getByText('✓ All 150 entries verified successfully')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    
    render(<LedgerIntegrityStatus />);
    
    await waitFor(() => {
      expect(screen.getByText('Ledger Integrity: Issues Detected ⚠')).toBeInTheDocument();
    });
    
    expect(screen.getByRole('generic')).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('calls verify endpoint when Verify Now button is clicked', async () => {
    const mockResponse = {
      data: {
        data: {
          isValid: true,
          totalEntries: 150,
          errors: []
        }
      }
    };
    
    api.get.mockResolvedValue(mockResponse);
    
    render(<LedgerIntegrityStatus />);
    
    await waitFor(() => {
      expect(screen.getByText('Verify Now')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Verify Now'));
    
    // Should call the API twice - once on mount, once on button click
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledWith('/ledger/verify-chain');
  });

  it('uses correct API endpoint', async () => {
    const mockResponse = {
      data: {
        data: {
          isValid: true,
          totalEntries: 0,
          errors: []
        }
      }
    };
    
    api.get.mockResolvedValue(mockResponse);
    
    render(<LedgerIntegrityStatus />);
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/ledger/verify-chain');
    });
  });

  it('sets up auto-refresh interval', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    api.get.mockResolvedValue({
      data: { data: { isValid: true, totalEntries: 0, errors: [] } }
    });
    
    const { unmount } = render(<LedgerIntegrityStatus />);
    
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
    
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});