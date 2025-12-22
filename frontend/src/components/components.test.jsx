import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Invoices from '../pages/Invoices';
import Expenses from '../pages/Expenses';
import Navigation from './Navigation';

// Mock the services
vi.mock('../services/invoiceService', () => ({
  invoiceService: {
    getInvoices: vi.fn().mockResolvedValue({ data: [] }),
  },
  expenseService: {
    getExpenses: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('../services/authService', () => ({
  authService: {
    isAuthenticated: vi.fn().mockReturnValue(true),
    getCurrentUser: vi.fn().mockReturnValue({ name: 'Test User', role: 'admin' }),
    logout: vi.fn(),
  },
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Frontend Components', () => {
  describe('Invoices Component', () => {
    it('should render invoices page', async () => {
      renderWithRouter(<Invoices />);
      
      expect(screen.getByText('Invoices')).toBeInTheDocument();
      expect(screen.getByText('Create Invoice')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
    
    it('should render invoice table headers', async () => {
      renderWithRouter(<Invoices />);
      
      expect(screen.getByText('Invoice #')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });
  
  describe('Expenses Component', () => {
    it('should render expenses page', async () => {
      renderWithRouter(<Expenses />);
      
      expect(screen.getByText('Expenses')).toBeInTheDocument();
      expect(screen.getByText('Submit Expense')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
    
    it('should render expense table headers', async () => {
      renderWithRouter(<Expenses />);
      
      expect(screen.getByText('Expense #')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Vendor')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
    });
  });
  
  describe('Navigation Component', () => {
    it('should render navigation links', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.getByText('Artha')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Ledger')).toBeInTheDocument();
      expect(screen.getByText('Invoices')).toBeInTheDocument();
      expect(screen.getByText('Expenses')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
    
    it('should display user information', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.getByText('Test User (admin)')).toBeInTheDocument();
    });
  });
});