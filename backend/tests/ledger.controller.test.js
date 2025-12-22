import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { createEntry, getEntries, postEntry } from '../src/controllers/ledger.controller.js';
import { protect } from '../src/middleware/auth.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import JournalEntry from '../src/models/JournalEntry.js';

const app = express();
app.use(express.json());

// Mock auth middleware for testing
app.use((req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId(), role: 'admin' };
  next();
});

// Test routes
app.post('/entries', createEntry);
app.get('/entries', getEntries);
app.post('/entries/:id/post', postEntry);

describe('Ledger Controller', () => {
  let cashAccount, revenueAccount;

  beforeAll(async () => {
    if (process.env.MONGODB_TEST_URI) {
      await mongoose.connect(process.env.MONGODB_TEST_URI);
    }

    // Create test accounts
    cashAccount = await ChartOfAccounts.create({
      code: '1000',
      name: 'Cash',
      type: 'Asset',
      normalBalance: 'debit'
    });

    revenueAccount = await ChartOfAccounts.create({
      code: '4000',
      name: 'Revenue',
      type: 'Income',
      normalBalance: 'credit'
    });
  });

  afterAll(async () => {
    await JournalEntry.deleteMany({});
    await ChartOfAccounts.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await JournalEntry.deleteMany({});
  });

  describe('POST /entries', () => {
    it('should create a journal entry', async () => {
      const entryData = {
        description: 'Test journal entry',
        lines: [
          { account: cashAccount._id, debit: '100', credit: '0' },
          { account: revenueAccount._id, debit: '0', credit: '100' }
        ]
      };

      const response = await request(app)
        .post('/entries')
        .send(entryData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe('Test journal entry');
      expect(response.body.data.status).toBe('draft');
    });

    it('should reject unbalanced entries', async () => {
      const entryData = {
        description: 'Unbalanced entry',
        lines: [
          { account: cashAccount._id, debit: '100', credit: '0' },
          { account: revenueAccount._id, debit: '0', credit: '50' }
        ]
      };

      const response = await request(app)
        .post('/entries')
        .send(entryData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Double-entry validation failed');
    });
  });

  describe('GET /entries', () => {
    beforeEach(async () => {
      await JournalEntry.create({
        description: 'Test entry 1',
        lines: [
          { account: cashAccount._id, debit: '100', credit: '0' },
          { account: revenueAccount._id, debit: '0', credit: '100' }
        ],
        status: 'draft',
        immutable_hash: 'test-hash-1'
      });

      await JournalEntry.create({
        description: 'Test entry 2',
        lines: [
          { account: cashAccount._id, debit: '200', credit: '0' },
          { account: revenueAccount._id, debit: '0', credit: '200' }
        ],
        status: 'posted',
        immutable_hash: 'test-hash-2'
      });
    });

    it('should return journal entries with pagination', async () => {
      const response = await request(app)
        .get('/entries?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter entries by status', async () => {
      const response = await request(app)
        .get('/entries?status=draft');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('draft');
    });
  });
});