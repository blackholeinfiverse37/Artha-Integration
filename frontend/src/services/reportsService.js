import api from './api';

export const reportsService = {
  async getDashboardSummary() {
    const response = await api.get('/reports/dashboard');
    return response.data;
  },

  async getProfitLoss(startDate, endDate) {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await api.get(`/reports/profit-loss?${params}`);
    return response.data;
  },

  async getBalanceSheet(asOfDate) {
    const params = new URLSearchParams({ asOfDate });
    const response = await api.get(`/reports/balance-sheet?${params}`);
    return response.data;
  },

  async getCashFlow(startDate, endDate) {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await api.get(`/reports/cash-flow?${params}`);
    return response.data;
  },

  async getTrialBalance(asOfDate) {
    const params = new URLSearchParams({ asOfDate });
    const response = await api.get(`/reports/trial-balance?${params}`);
    return response.data;
  },

  async getAgedReceivables(asOfDate) {
    const params = new URLSearchParams({ asOfDate });
    const response = await api.get(`/reports/aged-receivables?${params}`);
    return response.data;
  },

  async getKPIs(startDate, endDate) {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await api.get(`/reports/kpis?${params}`);
    return response.data;
  },

  async exportGeneralLedger(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/reports/general-ledger?${params}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};