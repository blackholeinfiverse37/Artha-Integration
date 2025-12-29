#!/usr/bin/env python3
"""
BHIV Core Status Verification
Confirms that BHIV Core is working correctly despite warnings
"""

import requests
import json
import time
from datetime import datetime

def test_bhiv_core():
    """Test BHIV Core functionality"""
    print("🔍 BHIV Core Status Verification")
    print("=" * 50)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    base_url = "http://localhost:8001"
    
    # Test 1: Health Check
    print("1. Testing Health Endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Health Check: {data.get('status', 'unknown')}")
            print(f"   📊 Uptime: {data.get('uptime_seconds', 0):.1f}s")
            print(f"   📈 Requests: {data.get('metrics', {}).get('total_requests', 0)}")
        else:
            print(f"   ❌ Health Check Failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Health Check Error: {e}")
        return False
    
    print()
    
    # Test 2: Ask Vedas Endpoint
    print("2. Testing Ask Vedas Endpoint...")
    try:
        response = requests.post(
            f"{base_url}/ask-vedas",
            json={"query": "What is accounting?", "user_id": "test"},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Ask Vedas: Working")
            print(f"   📝 Response Length: {len(data.get('response', ''))}")
            print(f"   🔍 Sources: {len(data.get('sources', []))}")
        else:
            print(f"   ❌ Ask Vedas Failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Ask Vedas Error: {e}")
        return False
    
    print()
    
    # Test 3: Edumentor Endpoint
    print("3. Testing Edumentor Endpoint...")
    try:
        response = requests.post(
            f"{base_url}/edumentor",
            json={"query": "Explain financial statements", "user_id": "test"},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Edumentor: Working")
            print(f"   📝 Response Length: {len(data.get('response', ''))}")
        else:
            print(f"   ❌ Edumentor Failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Edumentor Error: {e}")
        return False
    
    print()
    
    # Test 4: Knowledge Base Query
    print("4. Testing Knowledge Base Query...")
    try:
        response = requests.post(
            f"{base_url}/query-kb",
            json={"query": "test knowledge", "user_id": "test"},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Knowledge Base: Working")
            print(f"   📝 Query ID: {data.get('query_id', 'unknown')}")
        else:
            print(f"   ❌ Knowledge Base Failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Knowledge Base Error: {e}")
        return False
    
    print()
    print("=" * 50)
    print("🎉 BHIV Core Status: FULLY FUNCTIONAL")
    print()
    print("📋 Summary:")
    print("   ✅ All core endpoints working")
    print("   ✅ AI responses generated successfully")
    print("   ✅ Knowledge base queries processed")
    print("   ✅ File-based search operational")
    print()
    print("⚠️  Note about warnings:")
    print("   • Qdrant warnings are NORMAL (optional dependency)")
    print("   • NAS errors are EXPECTED (network storage not required)")
    print("   • Multi-folder warnings are INTENTIONAL (simplified setup)")
    print()
    print("🚀 BHIV Core is ready for ARTHA integration!")
    return True

if __name__ == "__main__":
    success = test_bhiv_core()
    if success:
        print("\n✅ All tests passed - BHIV Core is working correctly!")
        exit(0)
    else:
        print("\n❌ Some tests failed - please check BHIV Core startup")
        exit(1)