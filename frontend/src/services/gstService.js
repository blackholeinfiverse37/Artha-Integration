import api from './api';

export const gstService = {
  // Get GST summary for a period
  async getSummary(period) {
    const response = await api.get(`/gst/summary?period=${period}`);
    return response.data;
  },

  // Get GSTR-1 filing packet
  async getGSTR1Packet(period) {
    const response = await api.get(`/gst/filing-packet/gstr-1?period=${period}`);
    return response.data;
  },

  // Get GSTR-3B filing packet
  async getGSTR3BPacket(period) {
    const response = await api.get(`/gst/filing-packet/gstr-3b?period=${period}`);
    return response.data;
  },

  // Export filing packet as CSV
  async exportFilingPacket(type, period) {
    const response = await api.get(`/gst/filing-packet/export?type=${type}&period=${period}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Generate GSTR-1
  async generateGSTR1(month, year) {
    const response = await api.post('/gst/gstr1/generate', { month, year });
    return response.data;
  },

  // Generate GSTR-3B
  async generateGSTR3B(month, year) {
    const response = await api.post('/gst/gstr3b/generate', { month, year });
    return response.data;
  },

  // Get GST returns
  async getReturns(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/gst/returns?${params}`);
    return response.data;
  },

  // File GST return
  async fileReturn(returnId) {
    const response = await api.post(`/gst/returns/${returnId}/file`);
    return response.data;
  },

  // Validate GSTIN
  async validateGSTIN(gstin) {
    const response = await api.post('/gst/validate-gstin', { gstin });
    return response.data;
  },

  // Helper function to download blob as file
  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};