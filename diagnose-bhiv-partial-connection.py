#!/usr/bin/env python3
"""
Comprehensive BHIV Status Checker
Diagnoses why BHIV shows "Partially Connected"
"""

import requests
import json
import time

def check_service_health(name, url, timeout=8):
    """Check individual service health"""
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            return True, "healthy", response.json()
        else:
            return False, f"HTTP {response.status_code}", None
    except requests.exceptions.ConnectionError:
        return False, "not running", None
    except requests.exceptions.Timeout:
        return False, "timeout", None
    except Exception as e:
        return False, str(e), None

def check_artha_bhiv_status():
    """Check ARTHA's view of BHIV status"""
    try:
        # First login to get token
        login_response = requests.post(
            "http://localhost:5000/api/v1/auth/login",
            json={"email": "admin@artha.local", "password": "admin123"},
            timeout=10
        )
        
        if login_response.status_code != 200:
            return False, "ARTHA login failed", None
            
        token = login_response.json().get("data", {}).get("token")
        if not token:
            return False, "No auth token received", None
        
        # Check BHIV status via ARTHA
        status_response = requests.get(
            "http://localhost:5000/api/v1/bhiv/status",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if status_response.status_code == 200:
            return True, "success", status_response.json().get("data", {})
        else:
            return False, f"HTTP {status_response.status_code}", None
            
    except Exception as e:
        return False, str(e), None

def main():
    print("🔍 Comprehensive BHIV Status Analysis")
    print("=" * 60)
    
    # Check individual services
    services = [
        ("ARTHA Backend", "http://localhost:5000/api/health"),
        ("BHIV Core", "http://localhost:8001/health"),
        ("BHIV Central", "http://localhost:8000/health"),
        ("Integration Bridge", "http://localhost:8004/health")
    ]
    
    service_status = {}
    
    print("1. Individual Service Health:")
    print("-" * 30)
    
    for name, url in services:
        healthy, status, data = check_service_health(name, url)
        service_status[name] = healthy
        
        icon = "✅" if healthy else "❌"
        print(f"{icon} {name}: {status}")
        
        if healthy and data:
            if name == "Integration Bridge" and "services" in data:
                bridge_services = data["services"]
                for svc_name, svc_data in bridge_services.items():
                    svc_status = svc_data.get("status", "unknown")
                    svc_icon = "✅" if svc_status == "healthy" else "❌"
                    print(f"   {svc_icon} {svc_name}: {svc_status}")
    
    print("\n2. ARTHA's View of BHIV:")
    print("-" * 30)
    
    artha_healthy, artha_status, artha_data = check_artha_bhiv_status()
    
    if artha_healthy and artha_data:
        bhiv_status = artha_data.get("status", "unknown")
        print(f"📊 BHIV Status via ARTHA: {bhiv_status}")
        
        if "services" in artha_data:
            services_data = artha_data["services"]
            
            # BHIV Core
            if "bhivCore" in services_data:
                core_data = services_data["bhivCore"]
                core_status = core_data.get("status", "unknown")
                core_icon = "✅" if core_status == "healthy" else "❌"
                print(f"   {core_icon} BHIV Core: {core_status}")
                if core_data.get("error"):
                    print(f"      Error: {core_data['error']}")
            
            # BHIV Central
            if "bhivCentralDepository" in services_data:
                central_data = services_data["bhivCentralDepository"]
                central_status = central_data.get("status", "unknown")
                central_icon = "✅" if central_status == "healthy" else "❌"
                print(f"   {central_icon} BHIV Central: {central_status}")
                if central_data.get("errors"):
                    errors = central_data["errors"]
                    for error_type, error_msg in errors.items():
                        if error_msg:
                            print(f"      {error_type}: {error_msg}")
        
        # Show troubleshooting info
        if "troubleshooting" in artha_data:
            troubleshooting = artha_data["troubleshooting"]
            print(f"\n💡 {troubleshooting.get('message', 'No message')}")
            if troubleshooting.get("solution"):
                print(f"🔧 Solution: {troubleshooting['solution']}")
    else:
        print(f"❌ Failed to get ARTHA BHIV status: {artha_status}")
    
    print("\n3. Diagnosis & Recommendations:")
    print("-" * 30)
    
    # Analyze the situation
    core_running = service_status.get("BHIV Core", False)
    central_running = service_status.get("BHIV Central", False)
    artha_running = service_status.get("ARTHA Backend", False)
    bridge_running = service_status.get("Integration Bridge", False)
    
    if not artha_running:
        print("❌ ARTHA Backend is not running")
        print("   Fix: cd backend && npm run dev")
    
    if not core_running:
        print("❌ BHIV Core is not running")
        print("   Fix: cd v1-BHIV_CORE-main && python simple_api_minimal.py --port 8001")
    
    if not central_running:
        print("❌ BHIV Central is not running")
        print("   Fix: cd BHIV_Central_Depository-main && python main.py")
    
    if not bridge_running:
        print("❌ Integration Bridge is not running")
        print("   Fix: node integration-bridge.js")
    
    if core_running and central_running and artha_running and bridge_running:
        if artha_healthy and artha_data.get("status") == "partial":
            print("⚠️  All services running but status is 'partial'")
            print("   This might be due to:")
            print("   • Service initialization still in progress")
            print("   • Network connectivity issues")
            print("   • Service health check timeouts")
            print("   Fix: Wait 30 seconds and refresh ARTHA frontend")
        elif artha_healthy and artha_data.get("status") == "connected":
            print("🎉 All services are healthy and connected!")
        else:
            print("⚠️  Services running but integration has issues")
            print("   Fix: Restart ARTHA backend to refresh connections")
    
    print("\n4. Quick Fix Commands:")
    print("-" * 30)
    print("• Full restart: ensure-full-bhiv-connectivity.bat")
    print("• Test integration: python test-bhiv-artha-integration.py")
    print("• Check logs in service terminal windows")

if __name__ == "__main__":
    main()