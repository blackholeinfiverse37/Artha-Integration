#!/usr/bin/env python3
"""
Minimal Integration Bridge for ARTHA-BHIV Integration
Simplified version that provides basic integration endpoints
"""

import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ARTHA-BHIV Integration Bridge - Minimal", version="1.0.0")

class DocumentProcessRequest(BaseModel):
    file_path: str
    document_type: str = "pdf"
    create_journal_entry: bool = False

class JournalEntryRequest(BaseModel):
    description: str
    lines: list
    enhance_with_ai: bool = False

# Simple ARTHA service mock (replace with actual service later)
class SimpleARTHAService:
    def __init__(self):
        self.artha_api_url = "http://localhost:5000/api/v1"
        self.auth_token = None
        
    async def authenticate(self):
        """Simple authentication check"""
        try:
            response = requests.post(
                f"{self.artha_api_url}/auth/login",
                json={
                    "email": "admin@artha.local",
                    "password": "admin123"
                },
                timeout=10
            )
            if response.status_code == 200:
                self.auth_token = response.json().get("data", {}).get("token")
                return True
        except:
            pass
        return False
    
    async def health_check(self):
        """Check ARTHA health"""
        try:
            response = requests.get(f"{self.artha_api_url}/../health", timeout=5)
            return {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "response_code": response.status_code
            }
        except:
            return {"status": "unreachable", "error": "Connection failed"}

artha_service = SimpleARTHAService()

@app.on_event("startup")
async def startup_event():
    """Initialize integrations on startup"""
    logger.info("🚀 Starting Integration Bridge...")
    
    try:
        auth_success = await artha_service.authenticate()
        if auth_success:
            logger.info("✅ ARTHA integration ready")
        else:
            logger.warning("⚠️ ARTHA integration not available")
    except Exception as e:
        logger.warning(f"⚠️ ARTHA authentication failed: {e}")

@app.get("/health")
async def health_check():
    """Health check for both systems"""
    artha_health = await artha_service.health_check()
    
    # Check BHIV Core health
    bhiv_health = {"status": "unknown"}
    try:
        response = requests.get("http://localhost:8001/health", timeout=5)
        bhiv_health = {"status": "healthy" if response.status_code == 200 else "unhealthy"}
    except:
        bhiv_health = {"status": "unreachable"}
    
    return {
        "integration_bridge": "healthy",
        "artha": artha_health,
        "bhiv_core": bhiv_health,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/process-financial-document")
async def process_financial_document(request: DocumentProcessRequest):
    """Process document with BHIV and optionally create ARTHA journal entry"""
    try:
        # Process document with BHIV
        bhiv_response = requests.post(
            "http://localhost:8002/handle_task",
            json={
                "agent": "archive_agent",
                "input": f"Extract financial data from {request.document_type}",
                "pdf_path": request.file_path,
                "input_type": request.document_type
            },
            timeout=30
        )
        
        if bhiv_response.status_code != 200:
            raise HTTPException(status_code=500, detail="BHIV processing failed")
        
        bhiv_data = bhiv_response.json()
        result = {"bhiv_analysis": bhiv_data}
        
        # Mock journal entry creation for now
        if request.create_journal_entry:
            result["journal_entry"] = {
                "status": "created",
                "description": f"Processed {request.document_type} document",
                "timestamp": datetime.now().isoformat()
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Document processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/enhanced-journal-entry")
async def create_enhanced_journal_entry(request: JournalEntryRequest):
    """Create journal entry with optional AI enhancement"""
    try:
        description = request.description
        
        # Enhance description with AI if requested
        if request.enhance_with_ai:
            ai_response = requests.post(
                "http://localhost:8001/ask-vedas",
                json={
                    "query": f"Provide accounting guidance for: {description}",
                    "user_id": "integration_bridge"
                },
                timeout=15
            )
            
            if ai_response.status_code == 200:
                ai_data = ai_response.json()
                enhanced_desc = ai_data.get("response", "")
                if enhanced_desc:
                    description = f"{description} | AI Guidance: {enhanced_desc[:100]}..."
        
        # Mock journal entry creation
        journal_entry = {
            "status": "created",
            "description": description,
            "lines": request.lines,
            "timestamp": datetime.now().isoformat(),
            "enhanced_by_ai": request.enhance_with_ai
        }
        
        return {"journal_entry": journal_entry}
        
    except Exception as e:
        logger.error(f"Enhanced journal entry error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/financial-summary")
async def get_financial_summary():
    """Get financial summary from ARTHA with AI insights"""
    try:
        # Mock financial data
        balances = {
            "cash": 10000,
            "accounts_receivable": 5000,
            "accounts_payable": 3000,
            "total_assets": 15000
        }
        
        # Get AI insights about the financial position
        insights = None
        try:
            balance_summary = f"Account balances: Cash ${balances['cash']}, AR ${balances['accounts_receivable']}"
            ai_response = requests.post(
                "http://localhost:8001/ask-vedas",
                json={
                    "query": f"Provide financial insights for: {balance_summary}",
                    "user_id": "integration_bridge"
                },
                timeout=15
            )
            
            if ai_response.status_code == 200:
                insights = ai_response.json().get("response")
        except:
            pass  # AI insights are optional
        
        return {
            "balances": balances,
            "ai_insights": insights,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Financial summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint with integration information"""
    return {
        "message": "ARTHA-BHIV Integration Bridge",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "health": "GET /health - System health check",
            "process_document": "POST /process-financial-document - Process documents with AI",
            "enhanced_journal": "POST /enhanced-journal-entry - Create AI-enhanced journal entries",
            "financial_summary": "GET /financial-summary - Get financial summary with AI insights"
        },
        "integration": {
            "artha_backend": "http://localhost:5000",
            "bhiv_simple_api": "http://localhost:8001",
            "bhiv_mcp_bridge": "http://localhost:8002"
        }
    }

if __name__ == "__main__":
    import uvicorn
    import socket
    
    def is_port_in_use(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    
    port = 8004
    
    if is_port_in_use(port):
        print(f"ERROR: Port {port} is in use.")
        exit(1)
    
    print("\\n" + "="*60)
    print("  ARTHA-BHIV INTEGRATION BRIDGE")
    print("="*60)
    print(f" Server URL: http://0.0.0.0:{port}")
    print(f" Health Check: http://0.0.0.0:{port}/health")
    print("\\n Integration Features:")
    print("   • Document processing with AI")
    print("   • AI-enhanced journal entries")
    print("   • Financial insights")
    print("="*60)
    
    uvicorn.run(app, host="0.0.0.0", port=port)