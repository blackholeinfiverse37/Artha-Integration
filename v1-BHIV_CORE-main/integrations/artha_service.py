#!/usr/bin/env python3
"""
ARTHA Integration Service for BHIV Core
Provides financial data access and accounting operations
"""

import os
import requests
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ARTHAIntegrationService:
    def __init__(self):
        self.artha_api_url = os.getenv("ARTHA_API_URL", "http://localhost:5000/api/v1")
        self.enabled = os.getenv("ARTHA_INTEGRATION_ENABLED", "true").lower() == "true"
        self.auth_token = None
        
    async def authenticate(self, email: str = None, password: str = None):
        """Authenticate with ARTHA system"""
        if not self.enabled:
            return False
            
        try:
            auth_data = {
                "email": email or os.getenv("ARTHA_API_EMAIL", "admin@artha.local"),
                "password": password or os.getenv("ARTHA_API_PASSWORD", "admin123")
            }
            
            response = requests.post(
                f"{self.artha_api_url}/auth/login",
                json=auth_data,
                timeout=10
            )
            
            if response.status_code == 200:
                self.auth_token = response.json().get("data", {}).get("token")
                logger.info("✅ ARTHA authentication successful")
                return True
            else:
                logger.error(f"❌ ARTHA authentication failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ ARTHA authentication error: {e}")
            return False
    
    def _get_headers(self):
        """Get authenticated headers"""
        if not self.auth_token:
            return {}
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    async def create_journal_entry(self, description: str, lines: list):
        """Create journal entry in ARTHA"""
        if not self.enabled or not self.auth_token:
            return None
            
        try:
            entry_data = {
                "description": description,
                "lines": lines,
                "date": datetime.now().isoformat()
            }
            
            response = requests.post(
                f"{self.artha_api_url}/ledger/entries",
                json=entry_data,
                headers=self._get_headers(),
                timeout=15
            )
            
            if response.status_code == 201:
                logger.info(f"✅ Journal entry created: {description}")
                return response.json().get("data")
            else:
                logger.error(f"❌ Journal entry creation failed: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Journal entry creation error: {e}")
            return None
    
    async def get_account_balances(self):
        """Get account balances from ARTHA"""
        if not self.enabled or not self.auth_token:
            return None
            
        try:
            response = requests.get(
                f"{self.artha_api_url}/ledger/balances",
                headers=self._get_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json().get("data")
            else:
                logger.error(f"❌ Failed to get balances: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Balance retrieval error: {e}")
            return None
    
    async def health_check(self):
        """Check ARTHA system health"""
        if not self.enabled:
            return {"status": "disabled"}
            
        try:
            response = requests.get(f"{self.artha_api_url}/../health", timeout=5)
            return {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "response_code": response.status_code
            }
        except Exception as e:
            return {"status": "unreachable", "error": str(e)}

# Global instance
artha_service = ARTHAIntegrationService()