import axios from 'axios';
import logger from '../config/logger.js';

class BHIVIntegrationService {
  constructor() {
    // BHIV Core endpoints
    this.simpleApiUrl = process.env.BHIV_SIMPLE_API_URL || 'http://localhost:8001';
    this.mcpBridgeUrl = process.env.BHIV_MCP_BRIDGE_URL || 'http://localhost:8002';
    
    // BHIV Central Depository endpoints
    this.centralDepositoryUrl = process.env.BHIV_CENTRAL_DEPOSITORY_URL || 'http://localhost:8000';
    this.agentRunnerUrl = process.env.BHIV_AGENT_RUNNER_URL || 'http://localhost:8000';
    
    this.enabled = process.env.BHIV_INTEGRATION_ENABLED !== 'false';
    
    // Service priorities (Central Depository has priority for agent tasks)
    this.servicePriority = {
      agents: 'central_depository', // Use Central Depository for agent tasks
      knowledge: 'core', // Use Core for knowledge queries
      documents: 'central_depository' // Use Central Depository for document processing
    };
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
      // Try BHIV Core first
      const response = await axios.post(`${this.simpleApiUrl}/ask-vedas`, {
        query: `Accounting guidance: ${query}`,
        user_id: 'artha_system'
      }, { timeout: 15000 });

      if (response.data && response.data.response) {
        return {
          response: response.data.response,
          sources: response.data.sources || [],
          query_id: response.data.query_id,
          timestamp: response.data.timestamp,
          status: response.data.status || 200
        };
      }
    } catch (error) {
      logger.warn('BHIV Core guidance failed, trying fallback:', error.message);
    }

    // Fallback response
    return {
      response: `Regarding "${query}": This is an important accounting topic. For GST calculations, you need to determine the applicable GST rate, calculate the tax amount, and record it properly in your books. The basic formula is: GST Amount = (Taxable Value × GST Rate) / 100. Record this in your GST liability account and ensure proper documentation for compliance.`,
      sources: [{ text: "Fallback accounting guidance", source: "artha_system" }],
      query_id: `fallback_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 200,
      mode: 'fallback'
    };
  }

  async checkHealth() {
    if (!this.enabled) {
      return { enabled: false, status: 'disabled' };
    }

    const healthChecks = {
      simpleApi: { healthy: false, error: null },
      centralDepository: { healthy: false, error: null },
      agentRunner: { healthy: false, error: null }
    };

    // Check BHIV Core Simple API
    try {
      const simpleApiResponse = await axios.get(`${this.simpleApiUrl}/health`, { 
        timeout: 8000,
        validateStatus: (status) => status < 500
      });
      healthChecks.simpleApi.healthy = simpleApiResponse.status === 200;
    } catch (error) {
      healthChecks.simpleApi.error = error.code === 'ECONNREFUSED' ? 'Service not running' : error.message;
    }

    // Check BHIV Central Depository
    try {
      const centralResponse = await axios.get(`${this.centralDepositoryUrl}/health`, { 
        timeout: 8000,
        validateStatus: (status) => status < 500
      });
      healthChecks.centralDepository.healthy = centralResponse.status === 200;
    } catch (error) {
      healthChecks.centralDepository.error = error.code === 'ECONNREFUSED' ? 'Service not running' : error.message;
    }

    // Check Agent Runner capability
    try {
      const agentsResponse = await axios.get(`${this.agentRunnerUrl}/agents`, { 
        timeout: 8000,
        validateStatus: (status) => status < 500
      });
      healthChecks.agentRunner.healthy = agentsResponse.status === 200;
    } catch (error) {
      healthChecks.agentRunner.error = error.code === 'ECONNREFUSED' ? 'Service not running' : error.message;
    }

    const coreHealthy = healthChecks.simpleApi.healthy;
    const centralHealthy = healthChecks.centralDepository.healthy && healthChecks.agentRunner.healthy;
    const overallHealthy = coreHealthy && centralHealthy;
    
    // Determine status based on what's working
    let status;
    if (overallHealthy) {
      status = 'connected';
    } else if (coreHealthy || centralHealthy) {
      status = 'partial';
    } else {
      status = 'disconnected';
    }

    return {
      enabled: true,
      status: status,
      services: {
        bhivCore: {
          status: coreHealthy ? 'healthy' : 'unhealthy',
          simpleApi: healthChecks.simpleApi.healthy ? 'healthy' : 'unhealthy',
          url: this.simpleApiUrl,
          error: healthChecks.simpleApi.error
        },
        bhivCentralDepository: {
          status: centralHealthy ? 'healthy' : 'unhealthy',
          mainApi: healthChecks.centralDepository.healthy ? 'healthy' : 'unhealthy',
          agentRunner: healthChecks.agentRunner.healthy ? 'healthy' : 'unhealthy',
          url: this.centralDepositoryUrl,
          errors: {
            mainApi: healthChecks.centralDepository.error,
            agentRunner: healthChecks.agentRunner.error
          }
        }
      },
      endpoints: {
        simpleApiUrl: this.simpleApiUrl,
        centralDepositoryUrl: this.centralDepositoryUrl,
        agentRunnerUrl: this.agentRunnerUrl
      },
      troubleshooting: {
        message: overallHealthy ? 'All BHIV services running' : 
                status === 'partial' ? 'Some BHIV services not running' : 'No BHIV services running',
        solution: overallHealthy ? null : 
                 'Run start-integrated-system.bat to start all BHIV services',
        details: {
          coreHealthy,
          centralHealthy,
          requiredServices: ['BHIV Core (8001)', 'BHIV Central (8000)']
        }
      }
    };
  }
  async analyzeExpenseReceipt(filePath) {
    if (!this.enabled) return null;

    // Try Central Depository first (priority for document processing)
    try {
      const response = await axios.post(`${this.centralDepositoryUrl}/run-agent`, {
        agent_name: 'textToJson',
        input_data: {
          file_path: filePath,
          task: 'extract_expense_details',
          format: 'receipt'
        },
        stateful: false
      }, { timeout: 30000 });

      if (response.data && !response.data.error) {
        return response.data;
      }
    } catch (error) {
      logger.warn('Central Depository receipt analysis failed, trying Core:', error.message);
    }

    // Fallback to Core system
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
      logger.error('BHIV receipt analysis failed on both systems:', error.message);
      return null;
    }
  }

  // New methods for enhanced integration
  async runAgent(agentName, inputData, options = {}) {
    if (!this.enabled) return null;

    try {
      // Try Central Depository first
      const response = await axios.post(`${this.centralDepositoryUrl}/run-agent`, {
        agent_name: agentName,
        input_data: inputData || {},
        stateful: options.stateful || false
      }, { timeout: options.timeout || 30000 });

      if (response.data && !response.data.error) {
        return response.data;
      }
    } catch (error) {
      logger.error(`BHIV agent ${agentName} execution failed:`, error.message);
      
      // Fallback to simple API if available
      if (agentName === 'textToJson' || agentName === 'image_agent') {
        try {
          const fallbackResponse = await axios.post(`${this.simpleApiUrl}/ask-vedas`, {
            query: `Process this data: ${JSON.stringify(inputData)}`,
            user_id: 'artha_system'
          }, { timeout: 15000 });
          
          return fallbackResponse.data;
        } catch (fallbackError) {
          logger.error(`Fallback agent execution failed:`, fallbackError.message);
        }
      }
    }
    
    return null;
  }

  async runBasket(basketName, inputData, options = {}) {
    if (!this.enabled) return null;

    try {
      const response = await axios.post(`${this.centralDepositoryUrl}/run-basket`, {
        basket_name: basketName,
        input_data: inputData
      }, { timeout: options.timeout || 60000 });

      return response.data;
    } catch (error) {
      logger.error(`BHIV basket ${basketName} execution failed:`, error.message);
      return null;
    }
  }

  async getAvailableAgents() {
    if (!this.enabled) return [];

    try {
      const response = await axios.get(`${this.centralDepositoryUrl}/agents`, { timeout: 10000 });
      return response.data || [];
    } catch (error) {
      logger.error('Failed to get available agents:', error.message);
      return [];
    }
  }

  async getAvailableBaskets() {
    if (!this.enabled) return [];

    try {
      const response = await axios.get(`${this.centralDepositoryUrl}/baskets`, { timeout: 10000 });
      return response.data?.baskets || [];
    } catch (error) {
      logger.error('Failed to get available baskets:', error.message);
      return [];
    }
  }

  async getFinancialAnalysis(data) {
    if (!this.enabled) return null;

    try {
      // Use financial coordinator agent for comprehensive analysis
      const result = await this.runAgent('financial_coordinator', {
        financial_data: data,
        analysis_type: 'comprehensive',
        include_recommendations: true
      });
      
      if (result) {
        return result;
      }
      
      // Fallback to simple analysis
      const fallbackResponse = await axios.post(`${this.simpleApiUrl}/ask-vedas`, {
        query: `Analyze this financial data: ${JSON.stringify(data)}. Provide insights on cash flow, profitability, and recommendations.`,
        user_id: 'artha_financial_analysis'
      }, { timeout: 20000 });
      
      return fallbackResponse.data;
    } catch (error) {
      logger.error('Financial analysis failed:', error.message);
      return null;
    }
  }

  async getCashflowAnalysis(transactions) {
    if (!this.enabled) return null;

    try {
      return await this.runAgent('cashflow_analyzer', {
        transactions: transactions,
        analysis_period: 'monthly',
        include_projections: true
      });
    } catch (error) {
      logger.error('Cashflow analysis failed:', error.message);
      return null;
    }
  }

  async getLegalGuidance(query, context = {}) {
    if (!this.enabled) return null;

    try {
      return await this.runAgent('law_agent', {
        query: query,
        context: context,
        jurisdiction: 'India',
        focus: 'business_law'
      });
    } catch (error) {
      logger.error('Legal guidance failed:', error.message);
      return null;
    }
  }
}

export default new BHIVIntegrationService();