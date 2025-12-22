#!/usr/bin/env python3
"""
Minimal MCP Bridge for ARTHA Integration
Simplified version that handles basic task routing without complex dependencies
"""

import uuid
import logging
from datetime import datetime
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="BHIV MCP Bridge - Minimal", version="1.0.0")

# Health check data
health_status = {
    "startup_time": datetime.now(),
    "total_requests": 0,
    "successful_requests": 0,
    "failed_requests": 0
}

class TaskPayload(BaseModel):
    agent: str
    input: str
    pdf_path: str = ""
    input_type: str = "text"
    retries: int = 3
    fallback_model: str = "edumentor_agent"

async def handle_task_request(payload: TaskPayload) -> dict:
    """Handle task request with simple routing to Simple API"""
    task_id = str(uuid.uuid4())
    start_time = datetime.now()
    
    logger.info(f"[MCP_BRIDGE] Task ID: {task_id} | Agent: {payload.agent} | Input: {payload.input[:50]}...")
    health_status["total_requests"] += 1
    
    try:
        # Route to appropriate endpoint based on agent type
        endpoint_map = {
            "vedas_agent": "ask-vedas",
            "edumentor_agent": "edumentor", 
            "wellness_agent": "wellness",
            "archive_agent": "ask-vedas",  # Route document processing to vedas for accounting wisdom
            "image_agent": "edumentor",    # Route image processing to edumentor
            "audio_agent": "wellness",     # Route audio to wellness
            "text_agent": "edumentor",     # Route text to edumentor
            "knowledge_agent": "ask-vedas" # Route knowledge queries to vedas
        }
        
        # Default to edumentor if agent not found
        endpoint = endpoint_map.get(payload.agent, "edumentor")
        
        # Call Simple API
        simple_api_url = f"http://localhost:8001/{endpoint}"
        
        request_data = {
            "query": payload.input,
            "user_id": "mcp_bridge"
        }
        
        logger.info(f"[MCP_BRIDGE] Calling Simple API: {simple_api_url}")
        
        response = requests.post(
            simple_api_url,
            json=request_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Transform response to match expected format
            agent_output = {
                "status": result.get("status", 200),
                "response": result.get("response", ""),
                "sources": result.get("sources", []),
                "query_id": result.get("query_id", task_id),
                "endpoint": result.get("endpoint", endpoint),
                "timestamp": result.get("timestamp", datetime.now().isoformat()),
                "processing_time": (datetime.now() - start_time).total_seconds(),
                "agent_used": payload.agent,
                "input_type": payload.input_type
            }
            
            health_status["successful_requests"] += 1
            
            logger.info(f"[MCP_BRIDGE] Task {task_id} completed successfully")
            
            return {
                "task_id": task_id,
                "agent_output": agent_output,
                "status": 200
            }
        else:
            raise Exception(f"Simple API returned status {response.status_code}")
            
    except Exception as e:
        logger.error(f"[MCP_BRIDGE] Error processing task {task_id}: {str(e)}")
        health_status["failed_requests"] += 1
        
        error_output = {
            "error": f"Task processing failed: {str(e)}",
            "status": 500,
            "task_id": task_id,
            "agent_used": payload.agent,
            "input_type": payload.input_type,
            "timestamp": datetime.now().isoformat()
        }
        
        return {
            "task_id": task_id,
            "agent_output": error_output,
            "status": 500
        }

@app.post("/handle_task")
async def handle_task(payload: TaskPayload):
    """Handle task via JSON payload"""
    return await handle_task_request(payload)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if Simple API is available
        simple_api_status = "unknown"
        try:
            response = requests.get("http://localhost:8001/health", timeout=5)
            simple_api_status = "healthy" if response.status_code == 200 else "unhealthy"
        except:
            simple_api_status = "unreachable"
        
        # Calculate uptime and success rate
        uptime_seconds = (datetime.now() - health_status["startup_time"]).total_seconds()
        total_requests = health_status["total_requests"]
        success_rate = (health_status["successful_requests"] / total_requests * 100) if total_requests > 0 else 100
        
        overall_status = "healthy" if simple_api_status == "healthy" else "degraded"
        
        return {
            "status": overall_status,
            "service": "bhiv_mcp_bridge",
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": uptime_seconds,
            "version": "1.0.0",
            "services": {
                "mcp_bridge": "healthy",
                "simple_api": simple_api_status
            },
            "metrics": {
                "total_requests": total_requests,
                "successful_requests": health_status["successful_requests"],
                "failed_requests": health_status["failed_requests"],
                "success_rate_percent": round(success_rate, 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "service": "bhiv_mcp_bridge",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "BHIV MCP Bridge - Minimal Version",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "handle_task": "POST /handle_task - Process tasks via agents",
            "health": "GET /health - Health check"
        },
        "integration": {
            "simple_api": "http://localhost:8001",
            "artha_backend": "http://localhost:5000"
        },
        "supported_agents": [
            "vedas_agent",
            "edumentor_agent", 
            "wellness_agent",
            "archive_agent",
            "image_agent",
            "audio_agent",
            "text_agent",
            "knowledge_agent"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    import socket
    
    def is_port_in_use(port):
        """Check if a port is already in use"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    
    port = 8002
    
    if is_port_in_use(port):
        logger.error(f"Port {port} is already in use")
        print(f"ERROR: Port {port} is in use. Please run 'clear-bhiv-ports.bat' first.")
        exit(1)
    
    print("\\n" + "="*60)
    print("  BHIV MCP BRIDGE - MINIMAL VERSION")
    print("="*60)
    print(f" Server URL: http://0.0.0.0:{port}")
    print(f" Health Check: http://0.0.0.0:{port}/health")
    print("\\n Features:")
    print("   • Task routing to Simple API")
    print("   • Agent-based processing")
    print("   • ARTHA integration ready")
    print("="*60)
    print(" Waiting for Simple API on port 8001...")
    print("="*60)
    
    try:
        uvicorn.run(app, host="0.0.0.0", port=port)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        exit(1)