#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime

def check_service(name, url, timeout=10):
    """Check if a service is running and healthy"""
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            print(f"✅ {name}: Running ({response.status_code})")
            return True
        else:
            print(f"⚠️  {name}: Unhealthy (HTTP {response.status_code})")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ {name}: Not running (Connection refused)")
        return False
    except requests.exceptions.Timeout:
        print(f"⏰ {name}: Timeout (Service may be slow)")
        return False
    except Exception as e:
        print(f"💥 {name}: Error - {str(e)}")
        return False

def test_login():
    """Test login functionality"""
    try:
        login_data = {
            "email": "admin@artha.local",
            "password": "Admin@123456"
        }
        
        response = requests.post(
            "http://localhost:5000/api/v1/auth/login",
            json=login_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Login Test: Admin login successful")
                return True
            else:
                print(f"❌ Login Test: Failed - {data.get('message', 'Unknown error')}")
                return False
        else:
            print(f"❌ Login Test: HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('message', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"💥 Login Test: Error - {str(e)}")
        return False

def main():
    print("🔍 ARTHA + BHIV System Health Check")
    print("=" * 50)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    services = [
        ("ARTHA Backend", "http://localhost:5000/api/health"),
        ("ARTHA Frontend", "http://localhost:5173"),
        ("BHIV Core API", "http://localhost:8001/health"),
        ("BHIV Central", "http://localhost:8000/health"),
        ("Integration Bridge", "http://localhost:8004/health")
    ]
    
    print("🌐 Service Status:")
    print("-" * 30)
    
    healthy_services = 0
    for name, url in services:
        if check_service(name, url):
            healthy_services += 1
    
    print()
    print("🔐 Authentication Test:")
    print("-" * 30)
    
    login_success = test_login()
    
    print()
    print("📊 Summary:")
    print("-" * 20)
    print(f"Services Running: {healthy_services}/{len(services)}")
    print(f"Login Test: {'✅ PASS' if login_success else '❌ FAIL'}")
    
    if healthy_services == len(services) and login_success:
        print("\n🎉 All systems operational!")
        print("\n🚀 Ready to use:")
        print("   • Frontend: http://localhost:5173")
        print("   • Admin Login: admin@artha.local / Admin@123456")
        return 0
    else:
        print("\n⚠️  Issues detected:")
        if healthy_services < len(services):
            print(f"   • {len(services) - healthy_services} service(s) not running")
        if not login_success:
            print("   • Login authentication failed")
        print("\n🔧 Troubleshooting:")
        print("   1. Run: start-integrated-system.bat")
        print("   2. Run: node backend/scripts/ensure-admin.js")
        print("   3. Check service logs for errors")
        return 1

if __name__ == "__main__":
    sys.exit(main())