#!/usr/bin/env python3
"""
BHIV Services Health Check Script
Verifies that all BHIV AI services are running correctly
"""

import requests
import json
import sys
from datetime import datetime

def check_service(name, url, timeout=5):
    """Check if a service is healthy"""
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            print(f"✅ {name}: HEALTHY ({url})")
            return True
        else:
            print(f"⚠️  {name}: DEGRADED - Status {response.status_code} ({url})")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ {name}: NOT RUNNING - Connection refused ({url})")
        return False
    except requests.exceptions.Timeout:
        print(f"⏰ {name}: TIMEOUT - Service not responding ({url})")
        return False
    except Exception as e:
        print(f"❌ {name}: ERROR - {str(e)} ({url})")
        return False

def test_bhiv_functionality():
    """Test basic BHIV functionality"""
    print("\n🧪 Testing BHIV Functionality...")
    
    # Test Simple API
    try:
        response = requests.post(
            "http://localhost:8001/ask-vedas",
            json={"query": "test query", "user_id": "health_check"},
            timeout=10
        )
        if response.status_code == 200:
            print("✅ Simple API: Functional - Can process queries")
            return True
        else:
            print(f"⚠️  Simple API: Response error - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Simple API: Functionality test failed - {str(e)}")
        return False

def main():
    print("🔍 BHIV AI Services Health Check")
    print("=" * 50)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    services = [
        ("Simple API", "http://localhost:8001/health"),
        ("MCP Bridge", "http://localhost:8002/health"),
        ("Artha Backend", "http://localhost:5000/health")
    ]
    
    healthy_count = 0
    total_services = len(services)
    
    print("📊 Service Status Check:")
    for name, url in services:
        if check_service(name, url):
            healthy_count += 1
    
    print(f"\n📈 Health Summary: {healthy_count}/{total_services} services healthy")
    
    if healthy_count == total_services:
        print("🎉 All services are running correctly!")
        
        # Test functionality if all services are up
        if test_bhiv_functionality():
            print("🚀 BHIV AI integration is fully operational!")
            sys.exit(0)
        else:
            print("⚠️  Services are running but functionality test failed")
            sys.exit(1)
    else:
        print("❌ Some services are not running properly")
        print("\n💡 Troubleshooting:")
        print("1. Run 'start-bhiv-services.bat' to start BHIV services")
        print("2. Run 'npm start' in backend/ to start Artha backend")
        print("3. Check if ports 8001, 8002, and 5000 are available")
        print("4. Verify Python and Node.js are installed")
        sys.exit(1)

if __name__ == "__main__":
    main()