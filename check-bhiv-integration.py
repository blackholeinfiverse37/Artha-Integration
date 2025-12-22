#!/usr/bin/env python3
"""
BHIV Core Integration Health Check
Verifies all services are running and properly connected
"""

import requests
import json
import sys
from datetime import datetime

def check_service(name, url, timeout=5):
    """Check if a service is healthy"""
    try:
        response = requests.get(url, timeout=timeout)
        return {
            "name": name,
            "url": url,
            "status": "healthy" if response.status_code == 200 else "unhealthy",
            "status_code": response.status_code,
            "response_time": response.elapsed.total_seconds()
        }
    except requests.exceptions.ConnectionError:
        return {
            "name": name,
            "url": url,
            "status": "unreachable",
            "error": "Connection refused - service not running"
        }
    except requests.exceptions.Timeout:
        return {
            "name": name,
            "url": url,
            "status": "timeout",
            "error": "Request timed out"
        }
    except Exception as e:
        return {
            "name": name,
            "url": url,
            "status": "error",
            "error": str(e)
        }

def test_bhiv_integration():
    """Test BHIV Core integration functionality"""
    try:
        # Test Simple API
        response = requests.post(
            "http://localhost:8001/ask-vedas",
            json={
                "query": "What is double-entry bookkeeping?",
                "user_id": "health_check"
            },
            timeout=15
        )
        
        if response.status_code == 200:
            return {
                "status": "working",
                "response": "AI guidance system operational"
            }
        else:
            return {
                "status": "error",
                "error": f"HTTP {response.status_code}"
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

def test_artha_bhiv_connection():
    """Test ARTHA-BHIV integration"""
    try:
        # First login to ARTHA
        login_response = requests.post(
            "http://localhost:5000/api/v1/auth/login",
            json={
                "email": "admin@artha.local",
                "password": "admin123"
            },
            timeout=10
        )
        
        if login_response.status_code != 200:
            return {
                "status": "error",
                "error": "ARTHA login failed"
            }
        
        token = login_response.json().get("data", {}).get("token")
        if not token:
            return {
                "status": "error",
                "error": "No auth token received"
            }
        
        # Test BHIV status endpoint
        headers = {"Authorization": f"Bearer {token}"}
        status_response = requests.get(
            "http://localhost:5000/api/v1/bhiv/status",
            headers=headers,
            timeout=10
        )
        
        if status_response.status_code == 200:
            status_data = status_response.json().get("data", {})
            return {
                "status": "connected",
                "bhiv_status": status_data.get("status", "unknown"),
                "simple_api": status_data.get("simpleApi", "unknown"),
                "mcp_bridge": status_data.get("mcpBridge", "unknown")
            }
        else:
            return {
                "status": "error",
                "error": f"BHIV status check failed: HTTP {status_response.status_code}"
            }
            
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

def main():
    print("🔍 BHIV Core Integration Health Check")
    print("=" * 50)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Check individual services
    services = [
        ("ARTHA Backend", "http://localhost:5000/health"),
        ("ARTHA Frontend", "http://localhost:5173"),
        ("BHIV Simple API", "http://localhost:8001/health"),
        ("BHIV MCP Bridge", "http://localhost:8002/health"),
        ("BHIV Web Interface", "http://localhost:8003"),
        ("Integration Bridge", "http://localhost:8004/health")
    ]
    
    print("📊 Service Status:")
    print("-" * 30)
    
    all_healthy = True
    service_results = {}
    
    for name, url in services:
        result = check_service(name, url)
        service_results[name] = result
        
        status_icon = {
            "healthy": "✅",
            "unhealthy": "⚠️",
            "unreachable": "❌",
            "timeout": "⏰",
            "error": "💥"
        }.get(result["status"], "❓")
        
        print(f"{status_icon} {name:<20} {result['status']:<12} {result['url']}")
        
        if result["status"] != "healthy":
            all_healthy = False
            if "error" in result:
                print(f"   └─ Error: {result['error']}")
    
    print()
    
    # Test BHIV functionality if services are running
    if service_results.get("BHIV Simple API", {}).get("status") == "healthy":
        print("🧠 Testing BHIV AI Functionality:")
        print("-" * 35)
        
        ai_test = test_bhiv_integration()
        if ai_test["status"] == "working":
            print(f"✅ AI Guidance: {ai_test['response']}")
        else:
            print(f"❌ AI Guidance: {ai_test.get('error', 'Unknown error')}")
            all_healthy = False
    else:
        print("⚠️  Skipping AI functionality test - BHIV Simple API not available")
    
    print()
    
    # Test ARTHA-BHIV integration
    if (service_results.get("ARTHA Backend", {}).get("status") == "healthy" and 
        service_results.get("BHIV Simple API", {}).get("status") == "healthy"):
        
        print("🔗 Testing ARTHA-BHIV Integration:")
        print("-" * 35)
        
        integration_test = test_artha_bhiv_connection()
        if integration_test["status"] == "connected":
            print(f"✅ Integration Status: {integration_test['bhiv_status']}")
            print(f"   └─ Simple API: {integration_test['simple_api']}")
            print(f"   └─ MCP Bridge: {integration_test['mcp_bridge']}")
        else:
            print(f"❌ Integration: {integration_test.get('error', 'Unknown error')}")
            all_healthy = False
    else:
        print("⚠️  Skipping integration test - Required services not available")
    
    print()
    print("=" * 50)
    
    if all_healthy:
        print("🎉 All systems operational! BHIV Core is properly integrated with ARTHA.")
        print()
        print("🚀 Ready to use:")
        print("   • Open ARTHA: http://localhost:5173")
        print("   • Login: admin@artha.local / admin123")
        print("   • Check Dashboard → BHIV AI Integration")
        return 0
    else:
        print("⚠️  Some issues detected. Please check the errors above.")
        print()
        print("💡 Common solutions:")
        print("   • Run: start-bhiv-core-integrated.bat")
        print("   • Check Windows Firewall settings")
        print("   • Ensure Python virtual environment is activated")
        return 1

if __name__ == "__main__":
    sys.exit(main())