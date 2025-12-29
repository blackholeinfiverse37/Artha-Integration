import os
import uuid
import logging
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

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

# Health check data
health_data = {
    "startup_time": datetime.now(),
    "total_requests": 0,
    "successful_requests": 0
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Minimal BHIV Core API...")
    logger.info("Minimal BHIV Core API ready!")
    yield
    logger.info("Shutting down Minimal BHIV Core API...")

app = FastAPI(
    title="Minimal BHIV Core API",
    description="Lightweight BHIV Core with essential endpoints",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_fallback_response(query: str, endpoint: str) -> str:
    """Generate fallback responses without external dependencies"""
    if endpoint == "ask-vedas":
        return f"Regarding '{query}', ancient wisdom teaches us to seek truth through self-reflection and righteous action. Practice mindfulness, act with compassion, and seek the divine within yourself."
    elif endpoint == "edumentor":
        return f"Great question about '{query}'! This is an important topic to understand. The key is to break it down into fundamental principles and understand how they apply in real-world situations."
    elif endpoint == "wellness":
        return f"Thank you for asking about '{query}'. It's important to take care of your wellbeing. Consider self-care practices, deep breathing, and staying connected with supportive people."
    else:
        return f"Thank you for your question about '{query}'. I'm here to help with information and guidance."

@app.get("/ask-vedas")
async def ask_vedas_get(
    query: str = Query(..., description="Your spiritual question"),
    user_id: str = Query("anonymous", description="User ID")
):
    return await process_query(query, user_id, "ask-vedas")

@app.post("/ask-vedas")
async def ask_vedas_post(request: QueryRequest):
    return await process_query(request.query, request.user_id, "ask-vedas")

@app.get("/edumentor")
async def edumentor_get(
    query: str = Query(..., description="Your learning question"),
    user_id: str = Query("anonymous", description="User ID")
):
    return await process_query(query, user_id, "edumentor")

@app.post("/edumentor")
async def edumentor_post(request: QueryRequest):
    return await process_query(request.query, request.user_id, "edumentor")

@app.get("/wellness")
async def wellness_get(
    query: str = Query(..., description="Your wellness concern"),
    user_id: str = Query("anonymous", description="User ID")
):
    return await process_query(query, user_id, "wellness")

@app.post("/wellness")
async def wellness_post(request: QueryRequest):
    return await process_query(request.query, request.user_id, "wellness")

async def process_query(query: str, user_id: str, endpoint: str):
    """Process query with minimal overhead"""
    try:
        health_data["total_requests"] += 1
        
        response_text = generate_fallback_response(query, endpoint)
        
        health_data["successful_requests"] += 1
        
        return SimpleResponse(
            query_id=str(uuid.uuid4()),
            query=query,
            response=response_text,
            sources=[{"text": "Fallback response", "source": "minimal_api"}],
            timestamp=datetime.now().isoformat(),
            endpoint=endpoint,
            status=200
        )
    except Exception as e:
        logger.error(f"Error in {endpoint}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "message": "Minimal BHIV Core API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "ask-vedas": {"GET": "/ask-vedas", "POST": "/ask-vedas"},
            "edumentor": {"GET": "/edumentor", "POST": "/edumentor"},
            "wellness": {"GET": "/wellness", "POST": "/wellness"}
        }
    }

@app.get("/health")
async def health_check():
    """Fast health check endpoint"""
    try:
        health_data["total_requests"] += 1
        uptime_seconds = (datetime.now() - health_data["startup_time"]).total_seconds()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": uptime_seconds,
            "services": {
                "api": "healthy",
                "minimal_mode": True
            },
            "metrics": {
                "total_requests": health_data["total_requests"],
                "successful_requests": health_data["successful_requests"]
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    import uvicorn
    import argparse
    
    parser = argparse.ArgumentParser(description="Minimal BHIV Core API")
    parser.add_argument("--port", type=int, default=8001, help="Port to run the server on")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to run the server on")
    args = parser.parse_args()
    
    print(f"\nStarting Minimal BHIV Core API on http://{args.host}:{args.port}")
    print("Available endpoints:")
    print("   • /health - Health check")
    print("   • /ask-vedas - Spiritual guidance")
    print("   • /edumentor - Educational content")
    print("   • /wellness - Wellness advice")
    print("=" * 60)
    
    uvicorn.run(app, host=args.host, port=args.port)