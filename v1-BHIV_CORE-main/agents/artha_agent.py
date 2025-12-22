#!/usr/bin/env python3
"""
ARTHA Agent for BHIV Core
Handles financial and accounting-related queries with ARTHA integration
"""

import os
import logging
from typing import Dict, Any, Optional
from agents.base_agent import BaseAgent
from integrations.artha_service import artha_service

logger = logging.getLogger(__name__)

class ARTHAAgent(BaseAgent):
    """Agent specialized for financial and accounting operations with ARTHA integration"""
    
    def __init__(self):
        super().__init__()
        self.agent_id = "artha_agent"
        self.description = "Financial and accounting agent with ARTHA integration"
        self.capabilities = [
            "financial_analysis",
            "accounting_guidance", 
            "journal_entry_creation",
            "balance_inquiry",
            "expense_processing"
        ]
        
    def run(self, input_path: str, model: str, agent: str, input_type: str, task_id: str) -> Dict[str, Any]:
        """Process financial/accounting queries with ARTHA integration"""
        
        try:
            logger.info(f"[ARTHA_AGENT] Processing {input_type} input: {input_path[:100]}...")
            
            # Determine the type of financial operation
            query_lower = input_path.lower()
            
            result = {
                "agent": self.agent_id,
                "model": "artha_integration",
                "input_type": input_type,
                "task_id": task_id,
                "status": 200,
                "capabilities": self.capabilities
            }
            
            # Route to appropriate ARTHA operation
            if any(keyword in query_lower for keyword in ["balance", "account balance", "financial position"]):
                artha_result = self._get_financial_summary()
                result.update(artha_result)
                
            elif any(keyword in query_lower for keyword in ["journal", "entry", "transaction", "record"]):
                result["response"] = "To create journal entries, please use the ARTHA web interface or provide specific transaction details."
                result["guidance"] = "Journal entries require account codes, amounts, and descriptions following double-entry principles."
                
            elif any(keyword in query_lower for keyword in ["expense", "receipt", "cost", "spending"]):
                result["response"] = "For expense processing, upload receipts through ARTHA's expense module for AI-powered analysis."
                result["guidance"] = "Expenses should include vendor details, category, amount, and supporting documentation."
                
            elif any(keyword in query_lower for keyword in ["gst", "tax", "compliance", "filing"]):
                result["response"] = "GST and tax compliance features are available in ARTHA's GST module with automated filing packet generation."
                result["guidance"] = "Ensure all transactions are properly categorized for accurate tax calculations."
                
            else:
                # General accounting guidance
                result["response"] = f"For accounting query: '{input_path}', I recommend using ARTHA's integrated features for accurate financial management."
                result["guidance"] = "ARTHA provides comprehensive accounting with hash-chain ledger integrity, GST compliance, and automated reporting."
            
            # Add ARTHA system status
            result["artha_integration"] = {
                "enabled": artha_service.enabled,
                "authenticated": artha_service.auth_token is not None
            }
            
            logger.info(f"[ARTHA_AGENT] Successfully processed query: {task_id}")
            return result
            
        except Exception as e:
            logger.error(f"[ARTHA_AGENT] Error processing query {task_id}: {e}")
            return {
                "agent": self.agent_id,
                "model": "artha_integration",
                "input_type": input_type,
                "task_id": task_id,
                "status": 500,
                "error": f"ARTHA agent processing failed: {str(e)}",
                "response": "Unable to process financial query at this time."
            }
    
    def _get_financial_summary(self) -> Dict[str, Any]:
        """Get financial summary from ARTHA"""
        try:
            # This would be called asynchronously in a real implementation
            return {
                "response": "Financial summary available through ARTHA integration. Please check the Integration Bridge for detailed balance information.",
                "guidance": "Use /api/v1/ledger/balances endpoint in ARTHA for real-time account balances.",
                "artha_data_available": True
            }
        except Exception as e:
            logger.error(f"Error getting financial summary: {e}")
            return {
                "response": "Financial data temporarily unavailable. Please try again later.",
                "guidance": "Ensure ARTHA system is running and accessible.",
                "artha_data_available": False
            }