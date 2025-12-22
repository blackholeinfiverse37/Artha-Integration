import axios from 'axios';
import logger from '../config/logger.js';

class BHIVIntegrationService {
  constructor() {
    this.simpleApiUrl = process.env.BHIV_SIMPLE_API_URL || 'http://localhost:8001';
    this.mcpBridgeUrl = process.env.BHIV_MCP_BRIDGE_URL || 'http://localhost:8002';
    this.enabled = process.env.BHIV_INTEGRATION_ENABLED !== 'false'; // Enable by default
  }

  async processDocument(filePath, documentType = 'pdf') {
    if (!this.enabled) return null;
    
    try {
      const response = await axios.post(`${this.mcpBridgeUrl}/handle_task`, {
        agent: 'archive_agent',
        input: `Process ${documentType} document for accounting`,
        pdf_path: filePath,
        input_type: documentType,
        retries: 2
      }, { timeout: 30000 });

      return response.data;
    } catch (error) {
      logger.error('BHIV document processing failed:', error.message);
      return null;
    }
  }

  async getAccountingGuidance(query) {
    if (!this.enabled) return null;

    try {
      const response = await axios.post(`${this.simpleApiUrl}/ask-vedas`, {
        query: `Accounting guidance: ${query}`,
        user_id: 'artha_system'
      }, { timeout: 15000 });

      return response.data;
    } catch (error) {
      logger.error('BHIV guidance request failed:', error.message);
      return null;
    }
  }

  async checkHealth() {
    if (!this.enabled) {
      return { enabled: false, status: 'disabled' };
    }

    const healthChecks = {
      simpleApi: { healthy: false, error: null },
      mcpBridge: { healthy: false, error: null }
    };

    try {
      // Check Simple API health
      const simpleApiResponse = await axios.get(`${this.simpleApiUrl}/health`, { 
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept 4xx as "reachable"
      });
      healthChecks.simpleApi.healthy = simpleApiResponse.status === 200;
    } catch (error) {
      healthChecks.simpleApi.error = error.code === 'ECONNREFUSED' ? 'Service not running' : error.message;
    }

    try {
      // Check MCP Bridge health
      const mcpBridgeResponse = await axios.get(`${this.mcpBridgeUrl}/health`, { 
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      healthChecks.mcpBridge.healthy = mcpBridgeResponse.status === 200;
    } catch (error) {
      healthChecks.mcpBridge.error = error.code === 'ECONNREFUSED' ? 'Service not running' : error.message;
    }

    const overallHealthy = healthChecks.simpleApi.healthy && healthChecks.mcpBridge.healthy;
    const partialHealthy = healthChecks.simpleApi.healthy || healthChecks.mcpBridge.healthy;

    return {
      enabled: true,
      status: overallHealthy ? 'connected' : (partialHealthy ? 'partial' : 'disconnected'),
      simpleApi: healthChecks.simpleApi.healthy ? 'healthy' : 'unhealthy',
      mcpBridge: healthChecks.mcpBridge.healthy ? 'healthy' : 'unhealthy',
      simpleApiUrl: this.simpleApiUrl,
      mcpBridgeUrl: this.mcpBridgeUrl,
      errors: {
        simpleApi: healthChecks.simpleApi.error,
        mcpBridge: healthChecks.mcpBridge.error
      },
      troubleshooting: {
        message: overallHealthy ? 'All services running' : 
                partialHealthy ? 'Some services not running' : 'No services running',
        solution: overallHealthy ? null : 
                 'Run start-bhiv-services.bat to start BHIV AI services'
      }
    };
  }
  async analyzeExpenseReceipt(filePath) {
    if (!this.enabled) return null;

    try {
      const response = await axios.post(`${this.mcpBridgeUrl}/handle_task`, {
        agent: 'image_agent',
        input: 'Extract expense details from receipt',
        pdf_path: filePath,
        input_type: 'image',
        retries: 2
      }, { timeout: 30000 });

      return response.data;
    } catch (error) {
      logger.error('BHIV receipt analysis failed:', error.message);
      return null;
    }
  }
}

export default new BHIVIntegrationService();