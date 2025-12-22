import Decimal from 'decimal.js';
import mongoose from 'mongoose';
import TDSEntry from '../models/TDSEntry.js';
import ChartOfAccounts from '../models/ChartOfAccounts.js';
import ledgerService from './ledger.service.js';
import logger from '../config/logger.js';

class TDSService {
  /**
   * Get TDS rate based on section
   */
  getTDSRate(section) {
    const rates = {
      '194A': 10, // Interest
      '194C': 2,  // Contractor (individual) / 1% (company)
      '194H': 5,  // Commission
      '194I': 10, // Rent
      '194J': 10, // Professional services
      '192': 0,   // Salary (varies by slab)
      '194Q': 0.1, // Purchase of goods
    };
    
    return rates[section] || 10;
  }
  
  /**
   * Calculate TDS amount
   */
  calculateTDS(amount, section, customRate = null) {
    const rate = customRate !== null ? customRate : this.getTDSRate(section);
    const amt = new Decimal(amount);
    const tdsAmount = amt.times(rate).dividedBy(100);
    
    return {
      tdsRate: rate,
      tdsAmount: tdsAmount.toString(),
      netPayable: amt.minus(tdsAmount).toString(),
    };
  }
  
  /**
   * Create TDS entry
   */
  async createTDSEntry(entryData, userId) {
    try {
      // Calculate TDS if not provided
      if (!entryData.tdsAmount) {
        const calculation = this.calculateTDS(
          entryData.paymentAmount,
          entryData.section,
          entryData.tdsRate
        );
        entryData.tdsAmount = calculation.tdsAmount;
        entryData.tdsRate = calculation.tdsRate;
      }
      
      // Determine quarter and FY
      const date = new Date(entryData.transactionDate);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      let quarter;
      if (month >= 4 && month <= 6) quarter = 'Q1';
      else if (month >= 7 && month <= 9) quarter = 'Q2';
      else if (month >= 10 && month <= 12) quarter = 'Q3';
      else quarter = 'Q4';
      
      const fyYear = month >= 4 ? year : year - 1;
      const financialYear = `FY${fyYear}-${(fyYear + 1).toString().slice(-2)}`;
      
      const tdsEntry = await TDSEntry.create({
        ...entryData,
        quarter,
        financialYear,
        createdBy: userId,
      });
      
      logger.info(`TDS entry created: ${tdsEntry.entryNumber}`);
      
      return tdsEntry;
    } catch (error) {
      logger.error('Create TDS entry error:', error);
      throw error;
    }
  }
  
  /**
   * Record TDS deduction in ledger
   */
  async recordTDSDeduction(tdsId, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const tdsEntry = await TDSEntry.findById(tdsId).session(session);
      
      if (!tdsEntry) {
        throw new Error('TDS entry not found');
      }
      
      if (tdsEntry.status !== 'pending') {
        throw new Error('Only pending TDS entries can be recorded');
      }
      
      // Get accounts
      let expenseAccount = tdsEntry.expenseAccount;
      if (!expenseAccount) {
        // Default to professional fees
        expenseAccount = await ChartOfAccounts.findOne({ code: '6700' }).session(session);
      } else {
        expenseAccount = await ChartOfAccounts.findById(expenseAccount).session(session);
      }
      
      // Get or create TDS Payable account
      let tdsPayableAccount = await ChartOfAccounts.findOne({ 
        code: '2300' 
      }).session(session);
      
      if (!tdsPayableAccount) {
        tdsPayableAccount = await ChartOfAccounts.create([{
          code: '2300',
          name: 'TDS Payable',
          type: 'Liability',
          subtype: 'Current Liability',
          normalBalance: 'credit',
          description: 'Tax Deducted at Source - Payable to Government',
        }], { session });
        tdsPayableAccount = tdsPayableAccount[0];
      }
      
      const cashAccount = await ChartOfAccounts.findOne({ code: '1010' }).session(session);
      
      if (!expenseAccount || !cashAccount) {
        throw new Error('Required accounts not found');
      }
      
      // Create journal entry
      const journalEntry = await ledgerService.createJournalEntry(
        {
          date: tdsEntry.transactionDate,
          description: `TDS ${tdsEntry.section} - ${tdsEntry.deductee.name}`,
          lines: [
            {
              account: expenseAccount._id,
              debit: tdsEntry.paymentAmount,
              credit: '0',
              description: `Payment to ${tdsEntry.deductee.name}`,
            },
            {
              account: tdsPayableAccount._id,
              debit: '0',
              credit: tdsEntry.tdsAmount,
              description: `TDS deducted @ ${tdsEntry.tdsRate}%`,
            },
            {
              account: cashAccount._id,
              debit: '0',
              credit: tdsEntry.netPayable,
              description: 'Net payment',
            },
          ],
          reference: tdsEntry.entryNumber,
          tags: ['tds', tdsEntry.section],
        },
        userId
      );
      
      // Post the journal entry
      await ledgerService.postJournalEntry(journalEntry._id, userId);
      
      // Update TDS entry
      tdsEntry.status = 'deducted';
      tdsEntry.journalEntryId = journalEntry._id;
      tdsEntry.expenseAccount = expenseAccount._id;
      tdsEntry.tdsPayableAccount = tdsPayableAccount._id;
      await tdsEntry.save({ session });
      
      await session.commitTransaction();
      
      logger.info(`TDS deduction recorded: ${tdsEntry.entryNumber}`);
      
      return tdsEntry;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Record TDS deduction error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Record TDS challan deposit
   */
  async recordChallanDeposit(tdsId, challanData, userId) {
    const tdsEntry = await TDSEntry.findById(tdsId);
    
    if (!tdsEntry) {
      throw new Error('TDS entry not found');
    }
    
    if (tdsEntry.status !== 'deducted') {
      throw new Error('TDS must be deducted before recording challan');
    }
    
    tdsEntry.challanNumber = challanData.challanNumber;
    tdsEntry.challanDate = challanData.challanDate;
    tdsEntry.bankBSR = challanData.bankBSR;
    tdsEntry.status = 'deposited';
    
    await tdsEntry.save();
    
    logger.info(`TDS challan recorded: ${tdsEntry.entryNumber}`);
    
    return tdsEntry;
  }
  
  /**
   * Get TDS entries with filters
   */
  async getTDSEntries(filters = {}, pagination = {}) {
    const {
      status,
      section,
      quarter,
      financialYear,
      dateFrom,
      dateTo,
      pan,
    } = filters;
    
    const {
      page = 1,
      limit = 20,
      sortBy = 'transactionDate',
      sortOrder = 'desc',
    } = pagination;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (section) {
      query.section = section;
    }
    
    if (quarter) {
      query.quarter = quarter;
    }
    
    if (financialYear) {
      query.financialYear = financialYear;
    }
    
    if (dateFrom || dateTo) {
      query.transactionDate = {};
      if (dateFrom) query.transactionDate.$gte = new Date(dateFrom);
      if (dateTo) query.transactionDate.$lte = new Date(dateTo);
    }
    
    if (pan) {
      query['deductee.pan'] = pan;
    }
    
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [entries, total] = await Promise.all([
      TDSEntry.find(query)
        .populate('createdBy', 'name email')
        .populate('expenseAccount', 'code name')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      TDSEntry.countDocuments(query),
    ]);
    
    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Get TDS summary for quarter
   */
  async getTDSSummary(quarter, financialYear) {
    const summary = await TDSEntry.aggregate([
      {
        $match: {
          quarter,
          financialYear,
          status: { $in: ['deducted', 'deposited', 'filed'] },
        },
      },
      {
        $group: {
          _id: '$section',
          count: { $sum: 1 },
          totalPayment: { $sum: { $toDouble: '$paymentAmount' } },
          totalTDS: { $sum: { $toDouble: '$tdsAmount' } },
          totalNet: { $sum: { $toDouble: '$netPayable' } },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
    
    // Calculate totals
    let totalPayment = new Decimal(0);
    let totalTDS = new Decimal(0);
    let totalNet = new Decimal(0);
    let totalCount = 0;
    
    summary.forEach(item => {
      totalPayment = totalPayment.plus(item.totalPayment);
      totalTDS = totalTDS.plus(item.totalTDS);
      totalNet = totalNet.plus(item.totalNet);
      totalCount += item.count;
    });
    
    return {
      bySection: summary,
      totals: {
        count: totalCount,
        totalPayment: totalPayment.toString(),
        totalTDS: totalTDS.toString(),
        totalNet: totalNet.toString(),
      },
    };
  }
  
  /**
   * Validate PAN format
   */
  validatePAN(pan) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  }
  
  /**
   * Generate Form 26Q data (TDS quarterly return)
   */
  async generateForm26Q(quarter, financialYear) {
    const entries = await TDSEntry.find({
      quarter,
      financialYear,
      status: { $in: ['deducted', 'deposited'] },
    }).sort({ transactionDate: 1 });
    
    // Group by deductee PAN
    const deducteeWise = {};
    
    entries.forEach(entry => {
      const pan = entry.deductee.pan;
      
      if (!deducteeWise[pan]) {
        deducteeWise[pan] = {
          pan,
          name: entry.deductee.name,
          entries: [],
          totalPayment: new Decimal(0),
          totalTDS: new Decimal(0),
        };
      }
      
      deducteeWise[pan].entries.push({
        entryNumber: entry.entryNumber,
        section: entry.section,
        date: entry.transactionDate,
        payment: entry.paymentAmount,
        tds: entry.tdsAmount,
      });
      
      deducteeWise[pan].totalPayment = deducteeWise[pan].totalPayment.plus(entry.paymentAmount);
      deducteeWise[pan].totalTDS = deducteeWise[pan].totalTDS.plus(entry.tdsAmount);
    });
    
    // Convert to array
    const deductees = Object.values(deducteeWise).map(d => ({
      ...d,
      totalPayment: d.totalPayment.toString(),
      totalTDS: d.totalTDS.toString(),
    }));
    
    return {
      quarter,
      financialYear,
      deductees,
      summary: {
        totalEntries: entries.length,
        totalDeductees: deductees.length,
      },
    };
  }
}

export default new TDSService();