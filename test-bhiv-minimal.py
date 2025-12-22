#!/usr/bin/env python3
"""
BHIV Minimal Integration Test
Tests the minimal BHIV services integration with ARTHA
"""

import requests
import json
import time
import sys
from datetime import datetime

def test_service(name, url, timeout=5):
    """Test if a service is responding"""
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

def test_bhiv_functionality():
    """Test BHIV AI functionality"""
    try:
        response = requests.post(
            "http://localhost:8001/ask-vedas",
            json={
                "query": "How do I record a cash sale in accounting?",
                "user_id": "test_user"
            },
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                "status": "working",
                "response_length": len(data.get("response", "")),
                "has_sources": len(data.get("sources", [])) > 0
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

def test_mcp_bridge():
    """Test MCP Bridge functionality"""
    try:
        response = requests.post(
            "http://localhost:8002/handle_task",
            json={
                "agent": "vedas_agent",
                "input": "What is double-entry bookkeeping?",
                "input_type": "text"
            },
            timeout=20
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                "status": "working",
                "task_id": data.get("task_id"),
                "agent_output": bool(data.get("agent_output"))
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

def test_integration_bridge():
    """Test Integration Bridge functionality"""
    try:
        response = requests.get(
            "http://localhost:8004/financial-summary",
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                "status": "working",
                "has_balances": bool(data.get("balances")),
                "has_ai_insights": bool(data.get("ai_insights"))
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

def test_artha_bhiv_integration():
    """Test ARTHA-BHIV integration through ARTHA API"""
    try:
        # Login to ARTHA
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
        
        # Test BHIV status through ARTHA
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
    print("🧪 BHIV Minimal Integration Test Suite")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test individual services
    services = [
        ("ARTHA Backend", "http://localhost:5000/health"),
        ("ARTHA Frontend", "http://localhost:5173"),
        ("BHIV Simple API", "http://localhost:8001/health"),
        ("BHIV MCP Bridge", "http://localhost:8002/health"),
        ("BHIV Web Interface", "http://localhost:8003/health"),
        ("Integration Bridge", "http://localhost:8004/health")
    ]
    
    print("📊 Service Status Check:")
    print("-" * 40)
    
    all_healthy = True
    service_results = {}
    
    for name, url in services:
        result = test_service(name, url)
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
    
    # Test BHIV functionality
    if service_results.get("BHIV Simple API", {}).get("status") == "healthy":
        print("🧠 Testing BHIV AI Functionality:")
        print("-" * 35)
        
        ai_test = test_bhiv_functionality()
        if ai_test["status"] == "working":
            print(f"✅ AI Response: {ai_test['response_length']} characters")
            print(f"✅ Sources Available: {ai_test['has_sources']}")
        else:
            print(f"❌ AI Test Failed: {ai_test.get('error', 'Unknown error')}")
            all_healthy = False
    else:
        print("⚠️  Skipping AI test - BHIV Simple API not available")
    
    print()
    
    # Test MCP Bridge
    if service_results.get("BHIV MCP Bridge", {}).get("status") == "healthy":
        print("🌉 Testing MCP Bridge:")
        print("-" * 25)
        
        mcp_test = test_mcp_bridge()
        if mcp_test["status"] == "working":
            print(f"✅ Task Processing: {mcp_test['task_id']}")
            print(f"✅ Agent Output: {mcp_test['agent_output']}")
        else:
            print(f"❌ MCP Bridge Failed: {mcp_test.get('error', 'Unknown error')}")
            all_healthy = False
    else:
        print("⚠️  Skipping MCP Bridge test - service not available")
    
    print()
    
    # Test Integration Bridge
    if service_results.get("Integration Bridge", {}).get("status") == "healthy":
        print("🔗 Testing Integration Bridge:")
        print("-" * 30)
        
        integration_test = test_integration_bridge()
        if integration_test["status"] == "working":
            print(f"✅ Financial Data: {integration_test['has_balances']}")
            print(f"✅ AI Insights: {integration_test['has_ai_insights']}")
        else:
            print(f"❌ Integration Failed: {integration_test.get('error', 'Unknown error')}")
            all_healthy = False
    else:
        print("⚠️  Skipping Integration Bridge test - service not available")
    
    print()
    
    # Test ARTHA-BHIV integration
    if (service_results.get("ARTHA Backend", {}).get("status") == "healthy" and 
        service_results.get("BHIV Simple API", {}).get("status") == "healthy"):
        
        print("🏢 Testing ARTHA-BHIV Integration:")
        print("-" * 35)
        
        integration_test = test_artha_bhiv_integration()
        if integration_test["status"] == "connected":
            print(f"✅ Integration Status: {integration_test['bhiv_status']}")
            print(f"   └─ Simple API: {integration_test['simple_api']}")
            print(f"   └─ MCP Bridge: {integration_test['mcp_bridge']}")
        else:
            print(f"❌ Integration Failed: {integration_test.get('error', 'Unknown error')}")
            all_healthy = False
    else:
        print("⚠️  Skipping ARTHA integration test - required services not available")
    
    print()
    print("=" * 60)
    
    if all_healthy:
        print("🎉 All tests passed! BHIV Minimal is properly integrated with ARTHA.")
        print()
        print("🚀 Ready to use:")
        print("   • Open ARTHA: http://localhost:5173")
        print("   • Login: admin@artha.local / admin123")
        print("   • Check Dashboard → BHIV AI Integration")
        print("   • BHIV Web Interface: http://localhost:8003")
        return 0
    else:
        print("⚠️  Some tests failed. Check the errors above.")
        print()
        print("💡 Common solutions:")
        print("   • Run: start-bhiv-minimal.bat")
        print("   • Wait 30 seconds for services to fully start")
        print("   • Check individual service windows for errors")
        return 1

if __name__ == "__main__":
    sys.exit(main())