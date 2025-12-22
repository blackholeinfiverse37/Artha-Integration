import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import JournalEntry from '../src/models/JournalEntry.js';
import Expense from '../src/models/Expense.js';
import Invoice from '../src/models/Invoice.js';

let authToken;
let userId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
  
  // Clear test database
  await User.deleteMany({});
  await ChartOfAccounts.deleteMany({});
  await JournalEntry.deleteMany({});
  await Expense.deleteMany({});
  await Invoice.deleteMany({});
  
  // Create test user
  const user = await User.create({
    email: 'integration@artha.local',
    password: 'Test@123456',
    name: 'Integration Test User',
    role: 'admin',
  });
  userId = user._id;
  
  // Login to get token
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'integration@artha.local', password: 'Test@123456' });
  
  authToken = loginRes.body.data.token;
  
  // Create essential accounts
  await ChartOfAccounts.create([
    { code: '1010', name: 'Cash', type: 'Asset', normalBalance: 'debit' },
    { code: '1100', name: 'Accounts Receivable', type: 'Asset', normalBalance: 'debit' },
    { code: '4000', name: 'Sales Revenue', type: 'Income', normalBalance: 'credit' },
    { code: '6300', name: 'Office Supplies', type: 'Expense', normalBalance: 'debit' },
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('System Integration Tests', () => {
  describe('Complete Expense Workflow', () => {
    let expenseId;
    
    it('should create expense → approve → record in ledger', async () => {
      // Step 1: Create expense
      const createRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vendor: 'Staples',
          description: 'Office supplies for Q1',
          category: 'supplies',
          amount: '250.00',
          totalAmount: '250.00',
          paymentMethod: 'credit_card',
        });
      
      expect(createRes.status).toBe(201);
      expect(createRes.body.data.status).toBe('pending');
      expenseId = createRes.body.data._id;
      
      // Step 2: Approve expense
      const approveRes = await request(app)
        .post(`/api/v1/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('approved');
      
      // Step 3: Record in ledger
      const recordRes = await request(app)
        .post(`/api/v1/expenses/${expenseId}/record`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(recordRes.status).toBe(200);
      expect(recordRes.body.data.status).toBe('recorded');
      expect(recordRes.body.data.journalEntryId).toBeDefined();
      
      // Step 4: Verify journal entry was created
      const journalEntryId = recordRes.body.data.journalEntryId;
      const entryRes = await request(app)
        .get(`/api/v1/ledger/entries/${journalEntryId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(entryRes.status).toBe(200);
      expect(entryRes.body.data.status).toBe('posted');
      expect(entryRes.body.data.lines).toHaveLength(2);
    });
  });
  
  describe('Complete Invoice Workflow', () => {
    let invoiceId;
    
    it('should create invoice → send → record payment', async () => {
      // Step 1: Create invoice
      const createRes = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceNumber: 'INV-2024-001',
          customerName: 'Acme Corp',
          customerEmail: 'billing@acme.com',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              description: 'Consulting Services',
              quantity: 10,
              unitPrice: '100.00',
              amount: '1000.00',
            },
          ],
          subtotal: '1000.00',
          totalAmount: '1000.00',
        });
      
      expect(createRes.status).toBe(201);
      expect(createRes.body.data.status).toBe('draft');
      invoiceId = createRes.body.data._id;
      
      // Step 2: Send invoice (creates AR entry)
      const sendRes = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(sendRes.status).toBe(200);
      expect(sendRes.body.data.status).toBe('sent');
      
      // Step 3: Record payment
      const paymentRes = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: '1000.00',
          paymentMethod: 'bank_transfer',
          paymentDate: new Date().toISOString(),
        });
      
      expect(paymentRes.status).toBe(200);
      expect(paymentRes.body.data.status).toBe('paid');
      expect(paymentRes.body.data.payments).toHaveLength(1);
    });
  });
  
  describe('Ledger Integrity', () => {
    it('should maintain ledger chain integrity after all transactions', async () => {
      const verifyRes = await request(app)
        .get('/api/v1/ledger/verify')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.isValid).toBe(true);
      expect(verifyRes.body.data.errors).toHaveLength(0);
    });
    
    it('should show correct account balances', async () => {
      const balancesRes = await request(app)
        .get('/api/v1/ledger/balances')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(balancesRes.status).toBe(200);
      expect(Array.isArray(balancesRes.body.data)).toBe(true);
      
      // Find cash account balance
      const cashBalance = balancesRes.body.data.find(b => b.accountCode === '1010');
      expect(cashBalance).toBeDefined();
      
      // Cash should have increased by invoice payment and decreased by expense
      // +1000 (invoice payment) - 250 (expense) = +750
      expect(parseFloat(cashBalance.balance)).toBe(750);
    });
    
    it('should show correct ledger summary', async () => {
      const summaryRes = await request(app)
        .get('/api/v1/ledger/summary')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.data.isBalanced).toBe(true);
      expect(parseFloat(summaryRes.body.data.balanceDifference)).toBe(0);
    });
  });
  
  describe('API Backward Compatibility', () => {
    it('should work with legacy ledger endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/journal-entries')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
    
    it('should work with legacy health endpoint', async () => {
      const res = await request(app).get('/api/health');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});