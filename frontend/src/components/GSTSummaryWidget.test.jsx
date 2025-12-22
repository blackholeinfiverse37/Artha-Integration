import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import GSTSummaryWidget from './GSTSummaryWidget';
import api from '../services/api';

// Mock the API
vi.mock('../services/api');

describe('GSTSummaryWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    api.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<GSTSummaryWidget />);
    
    expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
  });

  it('displays GST summary data correctly', async () => {
    const mockResponse = {
      data: {
        data: {
          period: '2025-01',
          gstr1Summary: {
            totalTaxableValue: '100000.00',
            totalTaxCollected: '18000.00'
          },
          combined: {
            totalOutwardTax: '18000.00',
            netTaxPayable: '15000.00'
          }
        }
      }
    };
    
    api.get.mockResolvedValue(mockResponse);
    
    render(<GSTSummaryWidget />);
    
    await waitFor(() => {
      expect(screen.getByText('GST Summary - 2025-01')).toBeInTheDocument();
      expect(screen.getByText('₹1,00,000.00')).toBeInTheDocument(); // Taxable Value
      expect(screen.getByText('₹18,000.00')).toBeInTheDocument(); // GST Collected
      expect(screen.getByText('₹15,000.00')).toBeInTheDocument(); // Net GST Payable
    });
  });

  it('shows no data message when GST data is null', async () => {
    api.get.mockResolvedValue({ data: { data: null } });
    
    render(<GSTSummaryWidget />);
    
    await waitFor(() => {
      expect(screen.getByText('No GST data available for this period')).toBeInTheDocument();
      expect(screen.getByText('GST summary will appear once you have invoices with GST')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    
    render(<GSTSummaryWidget />);
    
    await waitFor(() => {
      expect(screen.getByText('No GST data available for this period')).toBeInTheDocument();
    });
  });

  it('exports GSTR-1 when export button is clicked', async () => {
    const mockSummaryResponse = {
      data: {
        data: {
          period: '2025-01',
          gstr1Summary: { totalTaxableValue: '100000.00' },
          combined: { totalOutwardTax: '18000.00', netTaxPayable: '15000.00' }
        }
      }
    };
    
    const mockExportResponse = {
      data: new Blob(['csv,data'], { type: 'text/csv' })
    };
    
    api.get.mockImplementation((url) => {
      if (url.includes('/gst/summary')) {
        return Promise.resolve(mockSummaryResponse);
      } else if (url.includes('/gst/filing-packet/export')) {
        return Promise.resolve(mockExportResponse);
      }
    });
    
    // Mock URL.createObjectURL and related functions
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    };
    document.createElement = vi.fn(() => mockLink);
    
    render(<GSTSummaryWidget />);
    
    await waitFor(() => {
      expect(screen.getByText('Export GSTR-1')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Export GSTR-1'));
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/gst/filing-packet/export?type=gstr-1'),
        { responseType: 'blob' }
      );
    });
  });

  it('exports GSTR-3B when export button is clicked', async () => {
    const mockSummaryResponse = {
      data: {
        data: {
          period: '2025-01',
          gstr1Summary: { totalTaxableValue: '100000.00' },
          combined: { totalOutwardTax: '18000.00', netTaxPayable: '15000.00' }
        }
      }
    };
    
    const mockExportResponse = {
      data: new Blob(['csv,data'], { type: 'text/csv' })
    };
    
    api.get.mockImplementation((url) => {
      if (url.includes('/gst/summary')) {
        return Promise.resolve(mockSummaryResponse);
      } else if (url.includes('/gst/filing-packet/export')) {
        return Promise.resolve(mockExportResponse);
      }
    });
    
    // Mock URL.createObjectURL and related functions
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    };
    document.createElement = vi.fn(() => mockLink);
    
    render(<GSTSummaryWidget />);
    
    await waitFor(() => {
      expect(screen.getByText('Export GSTR-3B')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Export GSTR-3B'));
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/gst/filing-packet/export?type=gstr-3b'),
        { responseType: 'blob' }
      );
    });
  });

  it('uses current period in YYYY-MM format', async () => {
    const mockResponse = {
      data: { data: null }
    };
    
    api.get.mockResolvedValue(mockResponse);
    
    render(<GSTSummaryWidget />);
    
    const currentDate = new Date();
    const expectedPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/gst/summary?period=${expectedPeriod}`);
    });
  });

  it('formats Indian currency correctly', async () => {
    const mockResponse = {
      data: {
        data: {
          period: '2025-01',
          gstr1Summary: {
            totalTaxableValue: '1234567.89'
          },
          combined: {
            totalOutwardTax: '222222.22',
            netTaxPayable: '111111.11'
          }
        }
      }
    };
    
    api.get.mockResolvedValue(mockResponse);
    
    render(<GSTSummaryWidget />);
    
    await waitFor(() => {
      expect(screen.getByText('₹12,34,567.89')).toBeInTheDocument();
      expect(screen.getByText('₹2,22,222.22')).toBeInTheDocument();
      expect(screen.getByText('₹1,11,111.11')).toBeInTheDocument();
    });
  });
});