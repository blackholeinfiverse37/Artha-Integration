#!/usr/bin/env python3
"""
Test ARTHA-BHIV Connection
"""

import requests
import json

def test_artha_bhiv_status():
    """Test BHIV status through ARTHA API"""
    print("🏢 Testing ARTHA-BHIV Integration")
    print("=" * 50)
    
    try:
        # Step 1: Login to ARTHA
        print("Step 1: Logging into ARTHA...")
        login_response = requests.post(
            "http://localhost:5000/api/v1/auth/login",
            json={
                "email": "admin@artha.local",
                "password": "admin123"
            },
            timeout=10
        )
        
        if login_response.status_code != 200:
            print(f"❌ ARTHA login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return
        
        token = login_response.json().get("data", {}).get("token")
        if not token:
            print("❌ No auth token received from ARTHA")
            return
        
        print("✅ ARTHA login successful")
        
        # Step 2: Check BHIV status through ARTHA
        print("Step 2: Checking BHIV status through ARTHA...")
        headers = {"Authorization": f"Bearer {token}"}
        
        status_response = requests.get(
            "http://localhost:5000/api/v1/bhiv/status",
            headers=headers,
            timeout=10
        )
        
        print(f"Status Code: {status_response.status_code}")
        
        if status_response.status_code == 200:
            status_data = status_response.json()
            print("✅ BHIV status response received:")
            print(json.dumps(status_data, indent=2))
        else:
            print(f"❌ BHIV status check failed: {status_response.status_code}")
            print(f"Response: {status_response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_direct_bhiv_services():
    """Test BHIV services directly"""
    print("\n🔍 Testing BHIV Services Directly")
    print("=" * 50)
    
    services = [
        ("Simple API", "http://localhost:8001/health"),
        ("MCP Bridge", "http://localhost:8002/health")
    ]
    
    for name, url in services:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✅ {name}: Healthy")
            else:
                print(f"⚠️ {name}: Status {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"❌ {name}: Not reachable")
        except Exception as e:
            print(f"❌ {name}: Error - {str(e)}")

def main():
    print("🧪 ARTHA-BHIV Connection Test")
    print("=" * 60)
    
    # Test direct BHIV services first
    test_direct_bhiv_services()
    
    # Test through ARTHA
    test_artha_bhiv_status()
    
    print("\n" + "=" * 60)
    print("💡 Troubleshooting Tips:")
    print("1. Ensure all 4 BHIV services are running")
    print("2. Ensure ARTHA backend is running on port 5000")
    print("3. Check ARTHA backend logs for errors")
    print("4. Try refreshing the ARTHA Dashboard")
    print("5. Check Windows Firewall settings")

if __name__ == "__main__":
    main()