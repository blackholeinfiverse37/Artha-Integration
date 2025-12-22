#!/usr/bin/env python3
"""
BHIV Service Diagnostic - Test what ARTHA sees
"""

import requests
import json

def test_endpoint(name, url):
    """Test an endpoint and show detailed response"""
    print(f"\n🔍 Testing {name}: {url}")
    print("-" * 50)
    
    try:
        response = requests.get(url, timeout=5)
        print(f"✅ Status Code: {response.status_code}")
        print(f"✅ Response Time: {response.elapsed.total_seconds():.2f}s")
        
        try:
            data = response.json()
            print(f"✅ Response Data:")
            print(json.dumps(data, indent=2))
        except:
            print(f"✅ Response Text: {response.text[:200]}...")
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection Error: Service not running or not reachable")
    except requests.exceptions.Timeout:
        print(f"❌ Timeout: Service took too long to respond")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_bhiv_functionality():
    """Test BHIV AI functionality"""
    print(f"\n🧠 Testing BHIV AI Functionality")
    print("-" * 50)
    
    try:
        response = requests.post(
            "http://localhost:8001/ask-vedas",
            json={
                "query": "How do I record a cash sale?",
                "user_id": "diagnostic_test"
            },
            timeout=10
        )
        
        print(f"✅ Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Query ID: {data.get('query_id', 'N/A')}")
            print(f"✅ Response Length: {len(data.get('response', ''))}")
            print(f"✅ Sources: {len(data.get('sources', []))}")
            print(f"✅ Response Preview: {data.get('response', '')[:100]}...")
        else:
            print(f"❌ Error Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def main():
    print("🔍 BHIV Service Diagnostic Tool")
    print("=" * 60)
    
    # Test all health endpoints
    endpoints = [
        ("BHIV Simple API Health", "http://localhost:8001/health"),
        ("BHIV Simple API Root", "http://localhost:8001/"),
        ("BHIV MCP Bridge Health", "http://localhost:8002/health"),
        ("BHIV MCP Bridge Root", "http://localhost:8002/"),
        ("BHIV Web Interface Health", "http://localhost:8003/health"),
        ("Integration Bridge Health", "http://localhost:8004/health"),
    ]
    
    for name, url in endpoints:
        test_endpoint(name, url)
    
    # Test AI functionality
    test_bhiv_functionality()
    
    print(f"\n" + "=" * 60)
    print("🎯 Summary:")
    print("- If all health endpoints return 200 OK, services are running correctly")
    print("- If ARTHA still shows 'Disconnected', check ARTHA backend logs")
    print("- ARTHA Backend should be running on port 5000")
    print("- Try refreshing the ARTHA Dashboard page")

if __name__ == "__main__":
    main()