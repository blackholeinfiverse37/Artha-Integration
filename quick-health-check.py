#!/usr/bin/env python3
"""
Quick Health Check for BHIV + ARTHA Integration
Verifies all services are running and responsive
"""

import requests
import json
import time
from datetime import datetime

def check_service(name, url, timeout=5):
    """Check if a service is healthy"""
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            return True, "healthy", response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        else:
            return False, f"HTTP {response.status_code}", None
    except requests.exceptions.ConnectionError:
        return False, "connection_refused", None
    except requests.exceptions.Timeout:
        return False, "timeout", None
    except Exception as e:
        return False, str(e), None

def main():
    print("🔍 Quick Health Check - BHIV + ARTHA Integration")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    services = [
        ("ARTHA Backend", "http://localhost:5000/api/health"),
        ("BHIV Core API", "http://localhost:8001/health"),
        ("BHIV Central", "http://localhost:8000/health"),
        ("Integration Bridge", "http://localhost:8004/health"),
        ("ARTHA Frontend", "http://localhost:5173")  # This might not have a health endpoint
    ]
    
    results = []
    
    for name, url in services:
        print(f"Checking {name}...")
        healthy, status, data = check_service(name, url)
        
        if healthy:
            print(f"✅ {name}: {status}")
        else:
            print(f"❌ {name}: {status}")
            
        results.append((name, healthy, status))
        time.sleep(0.5)
    
    print()
    print("=" * 60)
    print("📊 Summary:")
    
    healthy_count = sum(1 for _, healthy, _ in results if healthy)
    total_count = len(results)
    
    for name, healthy, status in results:
        icon = "✅" if healthy else "❌"
        print(f"{icon} {name}: {status}")
    
    print()
    print(f"📈 Health Score: {healthy_count}/{total_count} services healthy")
    
    if healthy_count >= 4:  # At least core services should be running
        print("🎉 System is ready for integration testing!")
        print("Run: python test-bhiv-artha-integration.py")
        return 0
    else:
        print("⚠️  Some services are not running. Please start missing services.")
        print("Run: start-integrated-system.bat")
        return 1

if __name__ == "__main__":
    exit(main())