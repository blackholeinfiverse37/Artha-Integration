import mongoose from 'mongoose';
import Invoice from '../src/models/Invoice.js';
import User from '../src/models/User.js';

describe('Invoice Model', () => {
  let userId;

  beforeAll(async () => {
    if (process.env.MONGODB_TEST_URI) {
      await mongoose.connect(process.env.MONGODB_TEST_URI);
    }

    // Create test user
    const user = await User.create({
      email: 'test@invoice.local',
      password: 'Test@123456',
      name: 'Test User',
      role: 'admin',
    });
    userId = user._id;
  });

  afterAll(async () => {
    await Invoice.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Invoice.deleteMany({});
  });

  describe('Invoice Creation', () => {
    it('should create a valid invoice with automatic calculations', async () => {
      const invoiceData = {
        customerName: 'Test Customer',
        customerEmail: 'customer@test.com',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        lines: [
          {
            description: 'Product 1',
            quantity: 2,
            unitPrice: '100.00',
            taxRate: 10,
          },
          {
            description: 'Product 2',
            quantity: 1,
            unitPrice: '50.00',
            taxRate: 5,
          },
        ],
        createdBy: userId,
      };

      const invoice = await Invoice.create(invoiceData);

      expect(invoice).toBeDefined();
      expect(invoice.invoiceNumber).toMatch(/^INV-\d{8}-\d{4}$/);
      expect(invoice.subtotal).toBe('250.00'); // (2*100) + (1*50)
      expect(invoice.totalTax).toBe('22.50'); // (200*0.1) + (50*0.05)
      expect(invoice.totalAmount).toBe('272.50'); // 250 + 22.50
      expect(invoice.amountDue).toBe('272.50');
      expect(invoice.status).toBe('draft');
    });

    it('should generate unique invoice numbers', async () => {
      const invoiceData = {
        customerName: 'Test Customer',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: [
          {
            description: 'Product 1',
            quantity: 1,
            unitPrice: '100.00',
          },
        ],
        createdBy: userId,
      };

      const invoice1 = await Invoice.create(invoiceData);
      const invoice2 = await Invoice.create(invoiceData);

      expect(invoice1.invoiceNumber).not.toBe(invoice2.invoiceNumber);
      expect(invoice1.invoiceNumber).toMatch(/^INV-\d{8}-0001$/);
      expect(invoice2.invoiceNumber).toMatch(/^INV-\d{8}-0002$/);
    });

    it('should validate required fields', async () => {
      const invalidInvoice = new Invoice({});

      await expect(invalidInvoice.save()).rejects.toThrow();
    });

    it('should require at least one line item', async () => {
      const invoiceData = {
        customerName: 'Test Customer',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: [],
        createdBy: userId,
      };

      await expect(Invoice.create(invoiceData)).rejects.toThrow('Invoice must have at least 1 line item');
    });
  });

  describe('Payment Tracking', () => {
    it('should update status when payment is added', async () => {
      const invoice = await Invoice.create({
        customerName: 'Test Customer',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: [
          {
            description: 'Product 1',
            quantity: 1,
            unitPrice: '100.00',
          },
        ],
        createdBy: userId,
      });

      // Add partial payment
      invoice.payments.push({
        amount: '50.00',
        paymentMethod: 'cash',
        reference: 'CASH-001',
      });
      invoice.amountPaid = '50.00';
      await invoice.save();

      expect(invoice.status).toBe('partial');
      expect(invoice.amountDue).toBe('50.00');

      // Add remaining payment
      invoice.payments.push({
        amount: '50.00',
        paymentMethod: 'bank_transfer',
        reference: 'TXN-002',
      });
      invoice.amountPaid = '100.00';
      await invoice.save();

      expect(invoice.status).toBe('paid');
      expect(invoice.amountDue).toBe('0.00');
    });
  });

  describe('Tax Calculations', () => {
    it('should calculate tax correctly for multiple tax rates', async () => {
      const invoice = await Invoice.create({
        customerName: 'Test Customer',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: [
          {
            description: 'Product 1',
            quantity: 1,
            unitPrice: '100.00',
            taxRate: 18, // GST rate
          },
          {
            description: 'Service 1',
            quantity: 2,
            unitPrice: '50.00',
            taxRate: 12, // Different GST rate
          },
        ],
        createdBy: userId,
      });

      expect(invoice.lines[0].taxAmount).toBe('18.00'); // 100 * 18%
      expect(invoice.lines[1].taxAmount).toBe('12.00'); // 100 * 12%
      expect(invoice.totalTax).toBe('30.00'); // 18 + 12
      expect(invoice.totalAmount).toBe('230.00'); // 200 + 30
    });
  });
});