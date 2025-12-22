#!/usr/bin/env python3
"""
Minimal Web Interface for BHIV Core
Simple Flask-like interface using FastAPI
"""

import os
import logging
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="BHIV Web Interface - Minimal", version="1.0.0")

# Create templates directory if it doesn't exist
os.makedirs("templates", exist_ok=True)

# Simple HTML template
SIMPLE_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>BHIV Core - Web Interface</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; margin-bottom: 30px; }
        .status { padding: 15px; margin: 10px 0; border-radius: 5px; }
        .healthy { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .unhealthy { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .endpoint { background: #f8f9fa; padding: 10px; margin: 5px 0; border-left: 4px solid #007bff; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 BHIV Core Web Interface</h1>
            <p>AI-Powered Assistant for ARTHA Accounting System</p>
        </div>
        
        <div class="status {{ status_class }}">
            <strong>System Status:</strong> {{ status_message }}
        </div>
        
        <div class="info">
            <h3>Available Services:</h3>
            <div class="endpoint">
                <strong>Simple API:</strong> http://localhost:8001 - {{ simple_api_status }}
            </div>
            <div class="endpoint">
                <strong>MCP Bridge:</strong> http://localhost:8002 - {{ mcp_bridge_status }}
            </div>
            <div class="endpoint">
                <strong>Integration Bridge:</strong> http://localhost:8004 - {{ integration_status }}
            </div>
        </div>
        
        <div class="info">
            <h3>Integration Status:</h3>
            <div class="endpoint">
                <strong>ARTHA Backend:</strong> http://localhost:5000 - {{ artha_backend_status }}
            </div>
            <div class="endpoint">
                <strong>ARTHA Frontend:</strong> http://localhost:5173 - {{ artha_frontend_status }}
            </div>
        </div>
        
        <div class="info">
            <h3>Quick Links:</h3>
            <div class="endpoint">
                <a href="http://localhost:5173" target="_blank">🏢 Open ARTHA Frontend</a>
            </div>
            <div class="endpoint">
                <a href="http://localhost:8001/docs" target="_blank">📚 BHIV API Documentation</a>
            </div>
            <div class="endpoint">
                <a href="http://localhost:8004/health" target="_blank">🔍 Integration Health Check</a>
            </div>
        </div>
        
        <div class="footer">
            <p>BHIV Core v1.0.0 | Last updated: {{ timestamp }}</p>
            <p>Integrated with ARTHA Accounting System</p>
        </div>
    </div>
</body>
</html>
"""

def check_service_status(url: str) -> str:
    """Check if a service is running"""
    try:
        response = requests.get(url, timeout=3)
        return "✅ Online" if response.status_code == 200 else "⚠️ Issues"
    except:
        return "❌ Offline"

@app.get("/", response_class=HTMLResponse)
async def home():
    """Main web interface"""
    
    # Check service statuses
    simple_api_status = check_service_status("http://localhost:8001/health")
    mcp_bridge_status = check_service_status("http://localhost:8002/health")
    integration_status = check_service_status("http://localhost:8004/health")
    artha_backend_status = check_service_status("http://localhost:5000/health")
    artha_frontend_status = check_service_status("http://localhost:5173")
    
    # Determine overall status
    online_services = sum(1 for status in [simple_api_status, mcp_bridge_status, integration_status] if "✅" in status)
    
    if online_services == 3:
        status_message = "All BHIV services are running"
        status_class = "healthy"
    elif online_services > 0:
        status_message = f"{online_services}/3 BHIV services are running"
        status_class = "info"
    else:
        status_message = "BHIV services are not running"
        status_class = "unhealthy"
    
    # Render template
    html_content = SIMPLE_HTML.replace("{{ status_message }}", status_message)
    html_content = html_content.replace("{{ status_class }}", status_class)
    html_content = html_content.replace("{{ simple_api_status }}", simple_api_status)
    html_content = html_content.replace("{{ mcp_bridge_status }}", mcp_bridge_status)
    html_content = html_content.replace("{{ integration_status }}", integration_status)
    html_content = html_content.replace("{{ artha_backend_status }}", artha_backend_status)
    html_content = html_content.replace("{{ artha_frontend_status }}", artha_frontend_status)
    html_content = html_content.replace("{{ timestamp }}", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    return html_content

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "bhiv_web_interface",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    import socket
    
    def is_port_in_use(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    
    port = 8003
    
    if is_port_in_use(port):
        print(f"ERROR: Port {port} is in use.")
        exit(1)
    
    print("\\n" + "="*50)
    print("  BHIV WEB INTERFACE")
    print("="*50)
    print(f" URL: http://0.0.0.0:{port}")
    print("="*50)
    
    uvicorn.run(app, host="0.0.0.0", port=port)