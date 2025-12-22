import mongoose from 'mongoose';
import { execSync } from 'child_process';
import User from '../src/models/User.js';
import Invoice from '../src/models/Invoice.js';
import Expense from '../src/models/Expense.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import JournalEntry from '../src/models/JournalEntry.js';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Seed Script Tests', () => {
  describe('Database seeding', () => {
    it('should run seed script successfully', async () => {
      // Set test environment
      process.env.NODE_ENV = 'development';
      process.env.MONGODB_URI = process.env.MONGODB_TEST_URI;
      
      // Run seed script
      try {
        execSync('node scripts/seed.js', { 
          stdio: 'pipe',
          env: { 
            ...process.env,
            NODE_ENV: 'development',
            MONGODB_URI: process.env.MONGODB_TEST_URI
          }
        });
      } catch (error) {
        // Script exits with code 0, so this is expected
        if (!error.stdout.toString().includes('Database seeded successfully')) {
          throw new Error(`Seed script failed: ${error.message}`);
        }
      }
      
      // Verify users were created
      const users = await User.find({});
      expect(users.length).toBeGreaterThanOrEqual(3);
      
      const admin = await User.findOne({ role: 'admin' });
      const accountant = await User.findOne({ role: 'accountant' });
      const viewer = await User.findOne({ role: 'viewer' });
      
      expect(admin).toBeTruthy();
      expect(accountant).toBeTruthy();
      expect(viewer).toBeTruthy();
    }, 30000);
    
    it('should create chart of accounts', async () => {
      const accounts = await ChartOfAccounts.find({});
      expect(accounts.length).toBeGreaterThan(0);
      
      // Check for essential accounts
      const cash = await ChartOfAccounts.findOne({ code: '1000' });
      const capital = await ChartOfAccounts.findOne({ code: '3000' });
      const revenue = await ChartOfAccounts.findOne({ code: '4000' });
      const supplies = await ChartOfAccounts.findOne({ code: '6300' });
      
      expect(cash).toBeTruthy();
      expect(capital).toBeTruthy();
      expect(revenue).toBeTruthy();
      expect(supplies).toBeTruthy();
    });
    
    it('should create sample journal entries', async () => {
      const entries = await JournalEntry.find({ status: 'posted' });
      expect(entries.length).toBeGreaterThanOrEqual(4);
      
      // Check for specific entries
      const capitalEntry = await JournalEntry.findOne({ 
        description: 'Initial capital investment' 
      });
      const salesEntry = await JournalEntry.findOne({ 
        description: 'Cash sales for January' 
      });
      
      expect(capitalEntry).toBeTruthy();
      expect(salesEntry).toBeTruthy();
      expect(capitalEntry.status).toBe('posted');
      expect(salesEntry.status).toBe('posted');
    });
    
    it('should create sample invoice', async () => {
      const invoice = await Invoice.findOne({ invoiceNumber: 'INV-2025-001' });
      
      expect(invoice).toBeTruthy();
      expect(invoice.customerName).toBe('Acme Corporation');
      expect(invoice.status).toBe('sent');
      expect(invoice.items).toHaveLength(2);
      expect(invoice.totalAmount).toBe('106200.00');
      
      // Check if AR journal entry was created
      const arEntry = await JournalEntry.findOne({ 
        reference: invoice.invoiceNumber 
      });
      expect(arEntry).toBeTruthy();
      expect(arEntry.status).toBe('posted');
    });
    
    it('should create sample expense', async () => {
      const expense = await Expense.findOne({ vendor: 'Office Depot' });
      
      expect(expense).toBeTruthy();
      expect(expense.category).toBe('supplies');
      expect(expense.status).toBe('recorded');
      expect(expense.totalAmount).toBe('5900.00');
      expect(expense.journalEntryId).toBeTruthy();
      
      // Check if expense journal entry was created
      const expenseEntry = await JournalEntry.findById(expense.journalEntryId);
      expect(expenseEntry).toBeTruthy();
      expect(expenseEntry.status).toBe('posted');
    });
    
    it('should maintain ledger integrity', async () => {
      const entries = await JournalEntry.find({ status: 'posted' });
      
      // Verify each entry has balanced debits and credits
      entries.forEach(entry => {
        const totalDebits = entry.lines.reduce((sum, line) => 
          sum + parseFloat(line.debit || 0), 0);
        const totalCredits = entry.lines.reduce((sum, line) => 
          sum + parseFloat(line.credit || 0), 0);
        
        expect(totalDebits).toBeCloseTo(totalCredits, 2);
      });
    });
    
    it('should create proper relationships', async () => {
      // Test invoice relationships
      const invoice = await Invoice.findOne({ invoiceNumber: 'INV-2025-001' })
        .populate('createdBy');
      
      expect(invoice.createdBy).toBeTruthy();
      expect(invoice.createdBy.role).toBe('accountant');
      
      // Test expense relationships
      const expense = await Expense.findOne({ vendor: 'Office Depot' })
        .populate('submittedBy approvedBy account');
      
      expect(expense.submittedBy).toBeTruthy();
      expect(expense.approvedBy).toBeTruthy();
      expect(expense.account).toBeTruthy();
      expect(expense.account.code).toBe('6300');
    });
  });
  
  describe('Backward compatibility', () => {
    it('should maintain existing user structure', async () => {
      const viewer = await User.findOne({ email: 'user@example.com' });
      
      expect(viewer).toBeTruthy();
      expect(viewer.role).toBe('viewer');
      expect(viewer.name).toBe('Test User');
    });
    
    it('should maintain existing journal entry structure', async () => {
      const entry = await JournalEntry.findOne({ 
        description: 'Initial capital investment' 
      });
      
      expect(entry).toBeTruthy();
      expect(entry.lines).toHaveLength(2);
      expect(entry.immutable_hash).toBeTruthy();
      expect(entry.prev_hash).toBeDefined();
    });
  });
});