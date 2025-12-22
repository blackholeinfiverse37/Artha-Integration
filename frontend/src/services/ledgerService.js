import api from './api';

export const ledgerService = {
  async getEntries(filters = {}, pagination = {}) {
    const params = new URLSearchParams({ ...filters, ...pagination });
    const response = await api.get(`/ledger/entries?${params}`);
    return response.data;
  },

  async getEntry(id) {
    const response = await api.get(`/ledger/entries/${id}`);
    return response.data;
  },

  async createEntry(entryData) {
    const response = await api.post('/ledger/entries', entryData);
    return response.data;
  },

  async postEntry(id) {
    const response = await api.post(`/ledger/entries/${id}/post`);
    return response.data;
  },

  async voidEntry(id, reason) {
    const response = await api.post(`/ledger/entries/${id}/void`, { reason });
    return response.data;
  },

  async getBalances(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/ledger/balances?${params}`);
    return response.data;
  },

  async getSummary() {
    const response = await api.get('/ledger/summary');
    return response.data;
  },

  async verifyChain() {
    const response = await api.get('/ledger/verify');
    return response.data;
  },

  async verifyChainLegacy() {
    const response = await api.get('/ledger/verify-chain');
    return response.data;
  },

  async verifyEntry(id) {
    const response = await api.get(`/ledger/entries/${id}/verify`);
    return response.data;
  },

  async getChainStats() {
    const response = await api.get('/ledger/chain-stats');
    return response.data;
  },

  async getChainSegment(startPosition = 0, endPosition = 100) {
    const response = await api.get(`/ledger/chain-segment?startPosition=${startPosition}&endPosition=${endPosition}`);
    return response.data;
  },
};

export const accountsService = {
  async getAccounts(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/accounts?${params}`);
    return response.data;
  },

  async getAccount(id) {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
  },

  async createAccount(accountData) {
    const response = await api.post('/accounts', accountData);
    return response.data;
  },

  async seedAccounts() {
    const response = await api.post('/accounts/seed');
    return response.data;
  },
};

export const reportsService = {
  async exportGeneralLedger(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/reports/general-ledger?${params}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};