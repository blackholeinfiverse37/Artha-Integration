import express from 'express';
import { exportGeneralLedger } from '../controllers/pdf.controller.js';
import {
  getProfitLoss,
  getBalanceSheet,
  getCashFlow,
  getTrialBalance,
  getAgedReceivables,
  getDashboardSummary,
  getKPIs,
} from '../controllers/reports.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Routes
router.route('/general-ledger').get(exportGeneralLedger);
router.route('/profit-loss').get(getProfitLoss);
router.route('/balance-sheet').get(getBalanceSheet);
router.route('/cash-flow').get(getCashFlow);
router.route('/trial-balance').get(getTrialBalance);
router.route('/aged-receivables').get(getAgedReceivables);
router.route('/dashboard').get(getDashboardSummary);
router.route('/kpis').get(getKPIs);

export default router;