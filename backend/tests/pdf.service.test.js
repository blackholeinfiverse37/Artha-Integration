import pdfService from '../src/services/pdf.service.js';
import ledgerService from '../src/services/ledger.service.js';

// Mock ledger service
jest.mock('../src/services/ledger.service.js');

describe('PDF Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateGeneralLedger', () => {
    it('should generate PDF with journal entries', async () => {
      // Mock data
      const mockEntries = [
        {
          entryNumber: 'JE-001',
          date: new Date('2024-01-01'),
          description: 'Test entry',
          lines: [
            {
              account: { name: 'Cash' },
              debit: '1000.00',
              credit: '0.00'
            },
            {
              account: { name: 'Revenue' },
              debit: '0.00',
              credit: '1000.00'
            }
          ]
        }
      ];

      const mockSummary = {
        assets: '1000.00',
        liabilities: '0.00',
        equity: '1000.00',
        income: '1000.00',
        expenses: '0.00',
        netIncome: '1000.00',
        isBalanced: true,
        balanceDifference: '0.00'
      };

      ledgerService.getJournalEntries.mockResolvedValue({
        entries: mockEntries,
        pagination: { total: 1 }
      });
      ledgerService.getLedgerSummary.mockResolvedValue(mockSummary);

      const pdfDoc = await pdfService.generateGeneralLedger({});

      expect(pdfDoc).toBeDefined();
      expect(ledgerService.getJournalEntries).toHaveBeenCalledWith(
        {},
        {
          page: 1,
          limit: 10000,
          sortBy: 'date',
          sortOrder: 'asc'
        }
      );
      expect(ledgerService.getLedgerSummary).toHaveBeenCalled();
    });

    it('should handle empty entries', async () => {
      ledgerService.getJournalEntries.mockResolvedValue({
        entries: [],
        pagination: { total: 0 }
      });
      ledgerService.getLedgerSummary.mockResolvedValue({
        assets: '0.00',
        liabilities: '0.00',
        equity: '0.00',
        income: '0.00',
        expenses: '0.00',
        netIncome: '0.00',
        isBalanced: true,
        balanceDifference: '0.00'
      });

      const pdfDoc = await pdfService.generateGeneralLedger({});

      expect(pdfDoc).toBeDefined();
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(pdfService.formatCurrency('1000')).toBe('1,000.00');
      expect(pdfService.formatCurrency('1234567.89')).toBe('1,234,567.89');
      expect(pdfService.formatCurrency('0')).toBe('0.00');
    });
  });
});