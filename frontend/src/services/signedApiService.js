// frontend/src/services/signedApiService.js
// Enhanced API service with request signing integration

import { createSignedRequest, createSignedRequestWithRetry, useSignedRequest } from '../utils/requestSigning.js';
import { generateClientIdempotencyKey, useIdempotentOperation } from '../utils/idempotency.js';
import { authService } from './authService.js';

/**
 * Enhanced API service that automatically signs critical requests
 */
class SignedApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  }

  /**
   * Get current user info for signing
   */
  getCurrentUser() {
    const user = authService.getCurrentUser();
    const token = authService.getToken();
    return { user, token };
  }

  /**
   * Make a signed request with idempotency
   */
  async signedRequest(method, path, data = {}, idempotencyKey = null) {
    const { user, token } = this.getCurrentUser();
    
    if (!user || !token) {
      throw new Error('Authentication required for signed requests');
    }

    return createSignedRequest(method, path, data, token, user.id, idempotencyKey);
  }

  /**
   * Make a signed request with automatic retry
   */
  async signedRequestWithRetry(method, path, data = {}, maxRetries = 3) {
    const { user, token } = this.getCurrentUser();
    
    if (!user || !token) {
      throw new Error('Authentication required for signed requests');
    }

    return createSignedRequestWithRetry(method, path, data, token, user.id, maxRetries);
  }

  /**
   * Create idempotent operation with key management
   */
  createIdempotentOperation(operationId) {
    return useIdempotentOperation(operationId);
  }

  // Ledger operations (require signatures)
  async createLedgerEntry(entryData) {
    return this.signedRequest('POST', '/ledger/entries', entryData);
  }

  async postLedgerEntry(entryId) {
    return this.signedRequest('POST', `/ledger/entries/${entryId}/post`, {});
  }

  async voidLedgerEntry(entryId, reason) {
    return this.signedRequest('POST', `/ledger/entries/${entryId}/void`, { reason });
  }

  async updateLedgerEntry(entryId, updates) {
    return this.signedRequest('PUT', `/ledger/entries/${entryId}`, updates);
  }

  async deleteLedgerEntry(entryId) {
    return this.signedRequest('DELETE', `/ledger/entries/${entryId}`, {});
  }

  // Invoice operations (require signatures)
  async createInvoice(invoiceData) {
    return this.signedRequest('POST', '/invoices', invoiceData);
  }

  async recordPayment(invoiceId, paymentData) {
    return this.signedRequest('POST', `/invoices/${invoiceId}/payment`, paymentData);
  }

  async sendInvoice(invoiceId) {
    return this.signedRequest('POST', `/invoices/${invoiceId}/send`, {});
  }

  async cancelInvoice(invoiceId) {
    return this.signedRequest('POST', `/invoices/${invoiceId}/cancel`, {});
  }

  // Expense operations (require signatures)
  async createExpense(expenseData) {
    return this.signedRequest('POST', '/expenses', expenseData);
  }

  async approveExpense(expenseId) {
    return this.signedRequest('POST', `/expenses/${expenseId}/approve`, {});
  }

  async recordExpense(expenseId) {
    return this.signedRequest('POST', `/expenses/${expenseId}/record`, {});
  }

  // Read-only operations (no signature required)
  async getLedgerEntries(params = {}) {
    const { token } = this.getCurrentUser();
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/ledger/entries?${queryString}` : '/ledger/entries';
    
    const response = await fetch(`${this.baseURL}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  async getLedgerEntry(entryId) {
    const { token } = this.getCurrentUser();
    
    const response = await fetch(`${this.baseURL}/ledger/entries/${entryId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  async getInvoices(params = {}) {
    const { token } = this.getCurrentUser();
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/invoices?${queryString}` : '/invoices';
    
    const response = await fetch(`${this.baseURL}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  async getExpenses(params = {}) {
    const { token } = this.getCurrentUser();
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/expenses?${queryString}` : '/expenses';
    
    const response = await fetch(`${this.baseURL}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  // Health and status endpoints
  async getSystemHealth() {
    const response = await fetch(`${this.baseURL.replace('/api/v1', '')}/health`);
    return response.json();
  }

  async verifyLedgerChain() {
    const { token } = this.getCurrentUser();
    
    const response = await fetch(`${this.baseURL}/ledger/verify-chain`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }
}

// Create singleton instance
export const signedApiService = new SignedApiService();

/**
 * React hook for signed API operations
 */
export function useSignedApi() {
  const { user, token } = signedApiService.getCurrentUser();

  const signedRequest = useSignedRequest(token, user?.id);

  return {
    // Signed operations with idempotency
    createLedgerEntry: (data, idempotencyKey) => 
      signedApiService.signedRequest('POST', '/ledger/entries', data, idempotencyKey),
    postLedgerEntry: (id, idempotencyKey) => 
      signedApiService.signedRequest('POST', `/ledger/entries/${id}/post`, {}, idempotencyKey),
    voidLedgerEntry: (id, reason, idempotencyKey) => 
      signedApiService.signedRequest('POST', `/ledger/entries/${id}/void`, { reason }, idempotencyKey),
    updateLedgerEntry: (id, data, idempotencyKey) => 
      signedApiService.signedRequest('PUT', `/ledger/entries/${id}`, data, idempotencyKey),
    deleteLedgerEntry: (id, idempotencyKey) => 
      signedApiService.signedRequest('DELETE', `/ledger/entries/${id}`, {}, idempotencyKey),
    
    createInvoice: (data, idempotencyKey) => 
      signedApiService.signedRequest('POST', '/invoices', data, idempotencyKey),
    recordPayment: (id, data, idempotencyKey) => 
      signedApiService.signedRequest('POST', `/invoices/${id}/payment`, data, idempotencyKey),
    
    createExpense: (data, idempotencyKey) => 
      signedApiService.signedRequest('POST', '/expenses', data, idempotencyKey),
    approveExpense: (id, idempotencyKey) => 
      signedApiService.signedRequest('POST', `/expenses/${id}/approve`, {}, idempotencyKey),
    
    // Operations with automatic retry
    createLedgerEntryWithRetry: (data) => 
      signedApiService.signedRequestWithRetry('POST', '/ledger/entries', data),
    createInvoiceWithRetry: (data) => 
      signedApiService.signedRequestWithRetry('POST', '/invoices', data),
    createExpenseWithRetry: (data) => 
      signedApiService.signedRequestWithRetry('POST', '/expenses', data),
    
    // Idempotent operation management
    createIdempotentOperation: signedApiService.createIdempotentOperation.bind(signedApiService),
    
    // Read operations
    getLedgerEntries: signedApiService.getLedgerEntries.bind(signedApiService),
    getLedgerEntry: signedApiService.getLedgerEntry.bind(signedApiService),
    getInvoices: signedApiService.getInvoices.bind(signedApiService),
    getExpenses: signedApiService.getExpenses.bind(signedApiService),
    verifyLedgerChain: signedApiService.verifyLedgerChain.bind(signedApiService),
  };
}

export default signedApiService;