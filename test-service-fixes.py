#!/usr/bin/env python3
"""
Quick Service Test - Verify fixes for 8004 port issues
"""

import requests
import time
import json

def test_service(name, url, timeout=10):
    """Test a single service"""
    try:
        print(f"Testing {name}...")
        response = requests.get(url, timeout=timeout)
        
        if response.status_code == 200:
            print(f"✅ {name}: OK (HTTP {response.status_code})")
            return True
        else:
            print(f"❌ {name}: HTTP {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ {name}: Connection refused")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ {name}: Timeout")
        return False
    except Exception as e:
        print(f"❌ {name}: {str(e)}")
        return False

def main():
    print("🧪 Quick Service Test")
    print("=" * 40)
    
    # Test the specific services that were failing
    services = [
        ("ARTHA Backend", "http://localhost:5000/api/health"),
        ("BHIV Core", "http://localhost:8001/health"),
        ("Integration Bridge", "http://localhost:8004/health")
    ]
    
    results = []
    
    for name, url in services:
        result = test_service(name, url)
        results.append((name, result))
        time.sleep(1)
    
    print("\n" + "=" * 40)
    print("📊 Results:")
    
    all_healthy = True
    for name, healthy in results:
        icon = "✅" if healthy else "❌"
        print(f"{icon} {name}")
        if not healthy:
            all_healthy = False
    
    print("\n" + "=" * 40)
    
    if all_healthy:
        print("🎉 All services are now healthy!")
        print("Run: python test-bhiv-artha-integration.py")
    else:
        print("⚠️  Some services still have issues.")
        print("Run: fix-service-issues.bat")
    
    # Test integration bridge specifically
    print("\n🔍 Testing Integration Bridge Response:")
    try:
        response = requests.get("http://localhost:8004/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2))
        else:
            print(f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()