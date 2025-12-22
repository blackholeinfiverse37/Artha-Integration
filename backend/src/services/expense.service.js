import Decimal from 'decimal.js';
import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import ledgerService from './ledger.service.js';
import ChartOfAccounts from '../models/ChartOfAccounts.js';
import logger from '../config/logger.js';
import fs from 'fs/promises';
import path from 'path';
import cacheService from './cache.service.js';

class ExpenseService {
  /**
   * Create a new expense
   */
  async createExpense(expenseData, userId, files = []) {
    try {
      const expense = new Expense({
        ...expenseData,
        submittedBy: userId,
      });
      
      // Handle file uploads
      if (files && files.length > 0) {
        expense.receipts = files.map(file => ({
          filename: file.filename,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
        }));
      }
      
      await expense.save();
      logger.info(`Expense created: ${expense.expenseNumber}`);
      
      return expense;
    } catch (error) {
      logger.error('Create expense error:', error);
      throw error;
    }
  }
  
  /**
   * Get expenses with filters and pagination
   */
  async getExpenses(filters = {}, pagination = {}) {
    const {
      status,
      category,
      dateFrom,
      dateTo,
      submittedBy,
      search,
    } = filters;
    
    const {
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc',
    } = pagination;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }
    
    if (submittedBy) {
      query.submittedBy = submittedBy;
    }
    
    if (search) {
      query.$or = [
        { expenseNumber: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('submittedBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('account', 'code name')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Expense.countDocuments(query),
    ]);
    
    return {
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Get a single expense by ID
   */
  async getExpenseById(expenseId) {
    const expense = await Expense.findById(expenseId)
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('account', 'code name')
      .populate('journalEntryId');
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    return expense;
  }
  
  /**
   * Update expense
   */
  async updateExpense(expenseId, updateData, files = []) {
    const expense = await Expense.findById(expenseId);
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    if (expense.status === 'recorded') {
      throw new Error('Cannot update a recorded expense');
    }
    
    Object.assign(expense, updateData);
    
    // Add new receipts
    if (files && files.length > 0) {
      const newReceipts = files.map(file => ({
        filename: file.filename,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
      }));
      expense.receipts = [...expense.receipts, ...newReceipts];
    }
    
    await expense.save();
    
    logger.info(`Expense updated: ${expense.expenseNumber}`);
    
    return expense;
  }
  
  /**
   * Approve expense
   */
  async approveExpense(expenseId, userId) {
    const expense = await Expense.findById(expenseId);
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    if (expense.status !== 'pending') {
      throw new Error('Only pending expenses can be approved');
    }
    
    expense.status = 'approved';
    expense.approvedBy = userId;
    expense.approvedAt = new Date();
    
    await expense.save();
    
    logger.info(`Expense approved: ${expense.expenseNumber}`);
    
    return expense;
  }
  
  /**
   * Reject expense
   */
  async rejectExpense(expenseId, reason, userId) {
    const expense = await Expense.findById(expenseId);
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    if (expense.status !== 'pending') {
      throw new Error('Only pending expenses can be rejected');
    }
    
    expense.status = 'rejected';
    expense.rejectionReason = reason;
    expense.approvedBy = userId;
    expense.approvedAt = new Date();
    
    await expense.save();
    
    logger.info(`Expense rejected: ${expense.expenseNumber}`);
    
    return expense;
  }
  
  /**
   * Record expense in ledger
   */
  async recordExpense(expenseId, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const expense = await Expense.findById(expenseId).session(session);
      
      if (!expense) {
        throw new Error('Expense not found');
      }
      
      if (expense.status !== 'approved') {
        throw new Error('Only approved expenses can be recorded');
      }
      
      // Get or find expense account
      let expenseAccount;
      if (expense.account) {
        expenseAccount = await ChartOfAccounts.findById(expense.account).session(session);
      } else {
        // Map category to account
        const categoryAccountMap = {
          travel: '6700',
          meals: '6900',
          supplies: '6300',
          utilities: '6200',
          rent: '6100',
          insurance: '6600',
          marketing: '6500',
          professional_services: '6700',
          equipment: '1800',
          software: '6300',
          other: '6900',
        };
        
        const accountCode = categoryAccountMap[expense.category] || '6900';
        expenseAccount = await ChartOfAccounts.findOne({ code: accountCode }).session(session);
      }
      
      const cashAccount = await ChartOfAccounts.findOne({ code: '1010' }).session(session);
      
      if (!expenseAccount || !cashAccount) {
        throw new Error('Required accounts not found');
      }
      
      // Create journal entry
      const journalEntry = await ledgerService.createJournalEntry(
        {
          date: expense.date,
          description: `Expense: ${expense.description} - ${expense.vendor}`,
          lines: [
            {
              account: expenseAccount._id,
              debit: expense.totalAmount,
              credit: '0',
              description: `${expense.category} expense`,
            },
            {
              account: cashAccount._id,
              debit: '0',
              credit: expense.totalAmount,
              description: `Payment via ${expense.paymentMethod}`,
            },
          ],
          reference: expense.expenseNumber,
          tags: ['expense', expense.category],
        },
        userId
      );
      
      // Post the journal entry
      await ledgerService.postJournalEntry(journalEntry._id, userId);
      
      // Update expense
      expense.status = 'recorded';
      expense.journalEntryId = journalEntry._id;
      expense.account = expenseAccount._id;
      await expense.save({ session });
      
      await session.commitTransaction();
      
      // Invalidate related caches
      await cacheService.invalidateExpenseCaches();
      await cacheService.invalidateLedgerCaches();
      
      logger.info(`Expense recorded: ${expense.expenseNumber}`);
      
      return expense;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Record expense error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Delete receipt file
   */
  async deleteReceipt(expenseId, receiptId) {
    const expense = await Expense.findById(expenseId);
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    const receipt = expense.receipts.id(receiptId);
    
    if (!receipt) {
      throw new Error('Receipt not found');
    }
    
    // Delete file from filesystem
    try {
      await fs.unlink(receipt.path);
    } catch (error) {
      logger.warn(`Failed to delete file: ${receipt.path}`, error);
    }
    
    // Remove from database
    expense.receipts.pull(receiptId);
    await expense.save();
    
    logger.info(`Receipt deleted from expense: ${expense.expenseNumber}`);
    
    return expense;
  }
  
  /**
   * Get expense statistics
   */
  async getExpenseStats(dateFrom, dateTo) {
    // Try to get from cache first
    const cached = await cacheService.getCachedExpenseStats(dateFrom, dateTo);
    if (cached) {
      return cached;
    }

    const match = {};
    
    if (dateFrom || dateTo) {
      match.date = {};
      if (dateFrom) match.date.$gte = new Date(dateFrom);
      if (dateTo) match.date.$lte = new Date(dateTo);
    }
    
    const [statusStats, categoryStats] = await Promise.all([
      Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: { $toDouble: '$totalAmount' } },
          },
        },
      ]),
      Expense.aggregate([
        { $match: { ...match, status: 'recorded' } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalAmount: { $sum: { $toDouble: '$totalAmount' } },
          },
        },
      ]),
    ]);
    
    const result = {
      byStatus: statusStats,
      byCategory: categoryStats,
    };
    
    // Cache the result
    await cacheService.cacheExpenseStats(dateFrom, dateTo, result);
    
    return result;
  }
}

export default new ExpenseService();