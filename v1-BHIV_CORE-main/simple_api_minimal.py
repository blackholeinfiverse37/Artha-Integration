#!/usr/bin/env python3
"""
Minimal BHIV Simple API for ARTHA Integration
Simplified version that focuses on core functionality without complex dependencies
"""

import os
import uuid
import logging
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = "anonymous"

class SimpleResponse(BaseModel):
    query_id: str
    query: str
    response: str
    sources: list
    timestamp: str
    endpoint: str
    status: int

# Initialize FastAPI app
app = FastAPI(
    title="BHIV Simple API",
    description="Simplified BHIV API for ARTHA Integration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add specific CORS headers for ARTHA
@app.middleware("http")
async def add_cors_headers(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Health check data
health_data = {
    "startup_time": datetime.now(),
    "total_requests": 0,
    "successful_requests": 0
}

def generate_fallback_response(query: str, endpoint: str) -> str:
    """Generate intelligent fallback responses based on query content and endpoint"""
    query_lower = query.lower()
    
    if endpoint == "ask-vedas":
        if any(word in query_lower for word in ["accounting", "bookkeeping", "ledger", "financial"]):
            return f"From an ancient wisdom perspective, proper accounting reflects the principle of dharma - righteous conduct in business. For '{query}', consider that accurate record-keeping is a form of truthfulness (satya), one of the fundamental virtues. Maintain transparency in your financial dealings, ensure all transactions are recorded honestly, and remember that ethical business practices create positive karma. The Vedic principle of 'Vasudhaiva Kutumbakam' (the world is one family) suggests treating all stakeholders fairly in your accounting practices."
        elif any(word in query_lower for word in ["depreciation", "expense", "asset"]):
            return f"The ancient texts teach us about the impermanence of all material things. Regarding '{query}', understand that depreciation reflects the natural cycle of creation and dissolution. Just as seasons change, assets lose value over time. Record this truthfully in your books, as honesty in accounting reflects spiritual integrity. Consider the principle of 'Aparigraha' (non-attachment) - while we must track material assets, remember not to become overly attached to them."
        else:
            return f"The ancient Vedic wisdom teaches us to seek truth through self-reflection and righteous action. Regarding '{query}', remember that true wisdom comes from understanding the interconnectedness of all existence. Practice mindfulness, act with compassion, and seek the divine within yourself. Every question is an opportunity for growth and understanding."
    
    elif endpoint == "edumentor":
        if any(word in query_lower for word in ["accounting", "bookkeeping", "financial"]):
            return f"Great question about '{query}'! Let me explain this accounting concept clearly. In accounting, we follow the fundamental equation: Assets = Liabilities + Equity. This means everything a business owns (assets) is financed either by borrowing money (liabilities) or by owner investment (equity). For your specific question about '{query}', think of it as a systematic way to track and record business transactions. The key is to always maintain balance and accuracy in your records. Would you like me to break down any specific part of this concept further?"
        else:
            return f"Excellent question about '{query}'! This is an important topic to understand. Let me break it down for you in simple terms with practical examples that will help you learn and remember the key concepts. The main idea is to understand the fundamental principles and how they apply in real-world situations. Think of it step by step, and don't hesitate to ask follow-up questions if you need clarification on any part."
    
    elif endpoint == "wellness":
        if any(word in query_lower for word in ["stress", "work", "accounting", "financial"]):
            return f"Thank you for reaching out about '{query}'. Work-related stress, especially in financial roles, is very common and it's important to address it. Here are some gentle suggestions: Take regular breaks during your workday, practice deep breathing exercises when feeling overwhelmed, maintain a healthy work-life balance, and remember that accuracy is important but perfection isn't always necessary. Consider talking to colleagues or supervisors if the workload feels unmanageable. Your mental health is just as important as your professional responsibilities."
        else:
            return f"Thank you for reaching out about '{query}'. It's important to take care of your wellbeing. Here are some gentle suggestions: Take time for self-care, practice deep breathing, stay connected with supportive people, and remember that small steps can lead to big improvements. If you're experiencing serious concerns, please consider speaking with a healthcare professional. You're taking a positive step by asking for guidance."
    
    return f"Thank you for your question about '{query}'. I'm here to help provide guidance and support. Please feel free to ask more specific questions so I can give you better assistance."

@app.get("/ask-vedas")
async def ask_vedas_get(
    query: str = Query(..., description="Your spiritual/accounting question"),
    user_id: str = Query("anonymous", description="User ID")
):
    return await process_vedas_query(query, user_id)

@app.post("/ask-vedas")
async def ask_vedas_post(request: QueryRequest):
    return await process_vedas_query(request.query, request.user_id)

async def process_vedas_query(query: str, user_id: str):
    """Process Vedas query with accounting-focused wisdom"""
    try:
        health_data["total_requests"] += 1
        
        logger.info(f"Vedas query from {user_id}: {query[:100]}...")
        
        # Generate response using fallback (can be enhanced with actual AI later)
        response_text = generate_fallback_response(query, "ask-vedas")
        
        # Mock sources for now
        sources = [
            {"text": "Ancient Vedic wisdom on righteous conduct in business", "source": "Vedic_Business_Ethics"},
            {"text": "Principles of dharma in financial management", "source": "Dharmic_Accounting"}
        ]
        
        health_data["successful_requests"] += 1
        
        return SimpleResponse(
            query_id=str(uuid.uuid4()),
            query=query,
            response=response_text,
            sources=sources,
            timestamp=datetime.now().isoformat(),
            endpoint="ask-vedas",
            status=200
        )
        
    except Exception as e:
        logger.error(f"Error in ask-vedas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/edumentor")
async def edumentor_get(
    query: str = Query(..., description="Your learning question"),
    user_id: str = Query("anonymous", description="User ID")
):
    return await process_edumentor_query(query, user_id)

@app.post("/edumentor")
async def edumentor_post(request: QueryRequest):
    return await process_edumentor_query(request.query, request.user_id)

async def process_edumentor_query(query: str, user_id: str):
    """Process educational query"""
    try:
        health_data["total_requests"] += 1
        
        logger.info(f"Edumentor query from {user_id}: {query[:100]}...")
        
        response_text = generate_fallback_response(query, "edumentor")
        
        sources = [
            {"text": "Educational content on accounting principles", "source": "Accounting_Fundamentals"},
            {"text": "Practical examples of financial concepts", "source": "Finance_Examples"}
        ]
        
        health_data["successful_requests"] += 1
        
        return SimpleResponse(
            query_id=str(uuid.uuid4()),
            query=query,
            response=response_text,
            sources=sources,
            timestamp=datetime.now().isoformat(),
            endpoint="edumentor",
            status=200
        )
        
    except Exception as e:
        logger.error(f"Error in edumentor: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/wellness")
async def wellness_get(
    query: str = Query(..., description="Your wellness concern"),
    user_id: str = Query("anonymous", description="User ID")
):
    return await process_wellness_query(query, user_id)

@app.post("/wellness")
async def wellness_post(request: QueryRequest):
    return await process_wellness_query(request.query, request.user_id)

async def process_wellness_query(query: str, user_id: str):
    """Process wellness query"""
    try:
        health_data["total_requests"] += 1
        
        logger.info(f"Wellness query from {user_id}: {query[:100]}...")
        
        response_text = generate_fallback_response(query, "wellness")
        
        sources = [
            {"text": "Wellness guidance for professionals", "source": "Professional_Wellness"},
            {"text": "Stress management techniques", "source": "Stress_Management"}
        ]
        
        health_data["successful_requests"] += 1
        
        return SimpleResponse(
            query_id=str(uuid.uuid4()),
            query=query,
            response=response_text,
            sources=sources,
            timestamp=datetime.now().isoformat(),
            endpoint="wellness",
            status=200
        )
        
    except Exception as e:
        logger.error(f"Error in wellness: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "message": "BHIV Simple API - ARTHA Integration",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "ask-vedas": {
                "GET": "/ask-vedas?query=your_question&user_id=optional",
                "POST": "/ask-vedas with JSON body"
            },
            "edumentor": {
                "GET": "/edumentor?query=your_question&user_id=optional",
                "POST": "/edumentor with JSON body"
            },
            "wellness": {
                "GET": "/wellness?query=your_question&user_id=optional",
                "POST": "/wellness with JSON body"
            }
        },
        "integration": {
            "artha_backend": "http://localhost:5000",
            "artha_frontend": "http://localhost:5173"
        },
        "documentation": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for ARTHA integration"""
    try:
        # Calculate uptime
        uptime_seconds = (datetime.now() - health_data["startup_time"]).total_seconds()
        
        # Calculate success rate
        total_requests = health_data["total_requests"]
        success_rate = (health_data["successful_requests"] / total_requests * 100) if total_requests > 0 else 100
        
        return {
            "status": "healthy",
            "service": "bhiv_simple_api",
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": uptime_seconds,
            "version": "1.0.0",
            "endpoints": {
                "ask_vedas": "operational",
                "edumentor": "operational", 
                "wellness": "operational"
            },
            "metrics": {
                "total_requests": total_requests,
                "successful_requests": health_data["successful_requests"],
                "success_rate_percent": round(success_rate, 2)
            },
            "integration": {
                "artha_compatible": True,
                "cors_enabled": True
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "service": "bhiv_simple_api",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    import uvicorn
    import argparse
    import socket
    
    def is_port_in_use(port):
        """Check if a port is already in use"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    
    parser = argparse.ArgumentParser(description="BHIV Simple API")
    parser.add_argument("--port", type=int, default=8001, help="Port to run the server on")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to run the server on")
    args = parser.parse_args()
    
    # Check if port is available
    if is_port_in_use(args.port):
        logger.error(f"Port {args.port} is already in use")
        print(f"ERROR: Port {args.port} is in use. Please run 'clear-bhiv-ports.bat' first.")
        exit(1)
    
    print("\\n" + "="*60)
    print("  BHIV SIMPLE API - ARTHA INTEGRATION")
    print("="*60)
    print(f" Server URL: http://{args.host}:{args.port}")
    print(f" Health Check: http://{args.host}:{args.port}/health")
    print(f" Documentation: http://{args.host}:{args.port}/docs")
    print("\\n Endpoints:")
    print("   GET/POST /ask-vedas - Spiritual & accounting wisdom")
    print("   GET/POST /edumentor - Educational content")
    print("   GET/POST /wellness - Wellness advice")
    print("="*60)
    print(" Ready for ARTHA integration!")
    print("="*60)
    
    try:
        uvicorn.run(app, host=args.host, port=args.port)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        exit(1)