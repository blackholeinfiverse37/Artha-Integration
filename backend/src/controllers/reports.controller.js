import financialReportsService from '../services/financialReports.service.js';
import logger from '../config/logger.js';

// @desc    Generate Profit & Loss
// @route   GET /api/v1/reports/profit-loss
// @access  Private
export const getProfitLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const report = await financialReportsService.generateProfitLoss(startDate, endDate);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Get profit loss error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Generate Balance Sheet
// @route   GET /api/v1/reports/balance-sheet
// @access  Private
export const getBalanceSheet = async (req, res) => {
  try {
    const { asOfDate } = req.query;

    if (!asOfDate) {
      return res.status(400).json({
        success: false,
        message: 'As of date is required',
      });
    }

    const report = await financialReportsService.generateBalanceSheet(asOfDate);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Get balance sheet error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Generate Cash Flow
// @route   GET /api/v1/reports/cash-flow
// @access  Private
export const getCashFlow = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const report = await financialReportsService.generateCashFlow(startDate, endDate);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Get cash flow error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Generate Trial Balance
// @route   GET /api/v1/reports/trial-balance
// @access  Private
export const getTrialBalance = async (req, res) => {
  try {
    const { asOfDate } = req.query;

    if (!asOfDate) {
      return res.status(400).json({
        success: false,
        message: 'As of date is required',
      });
    }

    const report = await financialReportsService.generateTrialBalance(asOfDate);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Get trial balance error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Generate Aged Receivables
// @route   GET /api/v1/reports/aged-receivables
// @access  Private
export const getAgedReceivables = async (req, res) => {
  try {
    const { asOfDate } = req.query;

    if (!asOfDate) {
      return res.status(400).json({
        success: false,
        message: 'As of date is required',
      });
    }

    const report = await financialReportsService.generateAgedReceivables(asOfDate);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Get aged receivables error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Generate Dashboard Summary
// @route   GET /api/v1/reports/dashboard
// @access  Private
export const getDashboardSummary = async (req, res) => {
  try {
    const summary = await financialReportsService.generateDashboardSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Get dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Generate KPIs
// @route   GET /api/v1/reports/kpis
// @access  Private
export const getKPIs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const kpis = await financialReportsService.generateKPIs(startDate, endDate);

    res.json({
      success: true,
      data: kpis,
    });
  } catch (error) {
    logger.error('Get KPIs error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};