import api from './api';

export const invoiceService = {
  async getInvoices(filters = {}, pagination = {}) {
    const params = new URLSearchParams({ ...filters, ...pagination });
    const response = await api.get(`/invoices?${params}`);
    return response.data;
  },

  async getInvoice(id) {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  async createInvoice(invoiceData) {
    const response = await api.post('/invoices', invoiceData);
    return response.data;
  },

  async updateInvoice(id, invoiceData) {
    const response = await api.put(`/invoices/${id}`, invoiceData);
    return response.data;
  },

  async sendInvoice(id) {
    const response = await api.post(`/invoices/${id}/send`);
    return response.data;
  },

  async recordPayment(id, paymentData) {
    const response = await api.post(`/invoices/${id}/payment`, paymentData);
    return response.data;
  },

  async cancelInvoice(id, reason) {
    const response = await api.post(`/invoices/${id}/cancel`, { reason });
    return response.data;
  },

  async getStats(dateFrom, dateTo) {
    const params = new URLSearchParams({ dateFrom, dateTo });
    const response = await api.get(`/invoices/stats?${params}`);
    return response.data;
  },
};

export const expenseService = {
  async getExpenses(filters = {}, pagination = {}) {
    const params = new URLSearchParams({ ...filters, ...pagination });
    const response = await api.get(`/expenses?${params}`);
    return response.data;
  },

  async getExpense(id) {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  },

  async createExpense(expenseData, files) {
    const formData = new FormData();
    
    Object.keys(expenseData).forEach(key => {
      formData.append(key, expenseData[key]);
    });
    
    if (files) {
      files.forEach(file => {
        formData.append('receipts', file);
      });
    }
    
    const response = await api.post('/expenses', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async approveExpense(id) {
    const response = await api.post(`/expenses/${id}/approve`);
    return response.data;
  },

  async rejectExpense(id, reason) {
    const response = await api.post(`/expenses/${id}/reject`, { reason });
    return response.data;
  },

  async recordExpense(id) {
    const response = await api.post(`/expenses/${id}/record`);
    return response.data;
  },

  async getStats(dateFrom, dateTo) {
    const params = new URLSearchParams({ dateFrom, dateTo });
    const response = await api.get(`/expenses/stats?${params}`);
    return response.data;
  },
};