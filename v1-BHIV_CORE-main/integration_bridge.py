#!/usr/bin/env python3
"""
Integration Bridge Service
Coordinates between ARTHA and BHIV Core systems
"""

import asyncio
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from integrations.artha_service import artha_service
import requests
import os

logger = logging.getLogger(__name__)
app = FastAPI(title="ARTHA-BHIV Integration Bridge", version="1.0.0")

class DocumentProcessRequest(BaseModel):
    file_path: str
    document_type: str = "pdf"
    create_journal_entry: bool = False

class JournalEntryRequest(BaseModel):
    description: str
    lines: list
    enhance_with_ai: bool = False

@app.on_event("startup")
async def startup_event():
    """Initialize integrations on startup"""
    logger.info("🚀 Starting Integration Bridge...")
    
    # Try to authenticate with ARTHA (non-blocking)
    try:
        auth_success = await artha_service.authenticate()
        if auth_success:
            logger.info("✅ ARTHA integration ready")
        else:
            logger.warning("⚠️ ARTHA integration not available - will retry on first request")
    except Exception as e:
        logger.warning(f"⚠️ ARTHA authentication failed: {e} - will retry on first request")

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
        "bhiv_core": bhiv_health
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
        
        # Create journal entry if requested
        if request.create_journal_entry and artha_service.enabled:
            # Extract meaningful description from BHIV analysis
            agent_output = bhiv_data.get("agent_output", {})
            description = agent_output.get("result", f"Processed {request.document_type} document")
            
            # Create basic journal entry (would need actual accounting logic)
            journal_entry = await artha_service.create_journal_entry(
                description=description[:200],  # Limit description length
                lines=[]  # Would need to extract actual line items
            )
            
            if journal_entry:
                result["journal_entry"] = journal_entry
        
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
        
        # Create journal entry in ARTHA
        journal_entry = await artha_service.create_journal_entry(
            description=description,
            lines=request.lines
        )
        
        if not journal_entry:
            raise HTTPException(status_code=500, detail="Failed to create journal entry")
        
        return {"journal_entry": journal_entry}
        
    except Exception as e:
        logger.error(f"Enhanced journal entry error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/financial-summary")
async def get_financial_summary():
    """Get financial summary from ARTHA with AI insights"""
    try:
        # Get account balances from ARTHA
        balances = await artha_service.get_account_balances()
        
        if not balances:
            raise HTTPException(status_code=500, detail="Failed to get financial data")
        
        # Get AI insights about the financial position
        insights = None
        try:
            balance_summary = f"Account balances summary with {len(balances)} accounts"
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
            "ai_insights": insights
        }
        
    except Exception as e:
        logger.error(f"Financial summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)