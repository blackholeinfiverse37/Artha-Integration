#!/usr/bin/env python3
"""
Test Minimal BHIV Core API
"""

import requests
import time

def test_minimal_bhiv_core():
    """Test the minimal BHIV Core API"""
    print("🧪 Testing Minimal BHIV Core API")
    print("=" * 40)
    
    base_url = "http://localhost:8001"
    
    # Test health endpoint
    print("1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check: OK")
            data = response.json()
            print(f"   Status: {data.get('status')}")
            print(f"   Uptime: {data.get('uptime_seconds', 0):.1f}s")
        else:
            print(f"❌ Health check failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Test ask-vedas endpoint
    print("\n2. Testing ask-vedas endpoint...")
    try:
        response = requests.get(f"{base_url}/ask-vedas?query=test", timeout=10)
        if response.status_code == 200:
            print("✅ Ask-vedas: OK")
            data = response.json()
            print(f"   Response length: {len(data.get('response', ''))}")
        else:
            print(f"❌ Ask-vedas failed: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Ask-vedas error: {e}")
    
    # Test integration bridge response
    print("\n3. Testing integration bridge...")
    try:
        response = requests.get("http://localhost:8004/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            bhiv_core_status = data.get('services', {}).get('bhivCore', {}).get('status')
            print(f"✅ Integration bridge sees BHIV Core as: {bhiv_core_status}")
            
            if bhiv_core_status == 'healthy':
                print("🎉 BHIV Core timeout issue RESOLVED!")
                return True
            else:
                print("⚠️  Integration bridge still sees issues")
                return False
        else:
            print(f"❌ Integration bridge error: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Integration bridge error: {e}")
        return False

if __name__ == "__main__":
    success = test_minimal_bhiv_core()
    if success:
        print("\n🎉 All tests passed! BHIV Core is working correctly.")
        print("Run: python test-bhiv-artha-integration.py for full integration test")
    else:
        print("\n⚠️  Some tests failed. Check service status.")
    
    exit(0 if success else 1)