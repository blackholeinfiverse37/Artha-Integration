#!/usr/bin/env python3
"""
Service Status Checker for BHIV + ARTHA Integration
Diagnoses specific service issues based on port 8004 response
"""

import requests
import json
import subprocess
import time

def check_service_detailed(name, url, expected_path="/health"):
    """Check service with detailed diagnostics"""
    print(f"\n🔍 Checking {name}...")
    print(f"   URL: {url}{expected_path}")
    
    try:
        # Try the health endpoint
        response = requests.get(f"{url}{expected_path}", timeout=10)
        print(f"   ✅ Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"   📊 Response: {json.dumps(data, indent=2)[:200]}...")
            except:
                print(f"   📄 Response: {response.text[:100]}...")
        
        return True, response.status_code
        
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection refused - service not running")
        return False, "connection_refused"
    except requests.exceptions.Timeout:
        print(f"   ⏰ Timeout - service too slow or hanging")
        return False, "timeout"
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False, str(e)

def check_port_process(port):
    """Check what process is using a port"""
    try:
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True, shell=True)
        lines = result.stdout.split('\n')
        
        for line in lines:
            if f":{port}" in line and "LISTENING" in line:
                parts = line.split()
                if len(parts) >= 5:
                    pid = parts[-1]
                    print(f"   🔍 Port {port} is used by PID: {pid}")
                    
                    # Try to get process name
                    try:
                        tasklist_result = subprocess.run(['tasklist', '/FI', f'PID eq {pid}'], 
                                                       capture_output=True, text=True, shell=True)
                        if tasklist_result.stdout:
                            lines = tasklist_result.stdout.split('\n')
                            for line in lines:
                                if pid in line:
                                    process_name = line.split()[0]
                                    print(f"   📋 Process: {process_name}")
                                    break
                    except:
                        pass
                    return True
        
        print(f"   ❌ Port {port} is not in use")
        return False
        
    except Exception as e:
        print(f"   ❌ Error checking port: {e}")
        return False

def main():
    print("🔍 Detailed Service Status Check")
    print("=" * 50)
    
    # Check each service individually
    services = [
        ("ARTHA Backend", "http://localhost:5000", "/api/health", 5000),
        ("BHIV Core", "http://localhost:8001", "/health", 8001),
        ("BHIV Central", "http://localhost:8000", "/health", 8000),
        ("Integration Bridge", "http://localhost:8004", "/health", 8004)
    ]
    
    results = []
    
    for name, url, health_path, port in services:
        print(f"\n{'='*20} {name} {'='*20}")
        
        # Check if port is in use
        port_in_use = check_port_process(port)
        
        if port_in_use:
            # Check service health
            healthy, status = check_service_detailed(name, url, health_path)
            results.append((name, healthy, status))
        else:
            print(f"   ❌ Service not running on port {port}")
            results.append((name, False, "not_running"))
    
    # Summary
    print(f"\n{'='*50}")
    print("📊 SUMMARY")
    print(f"{'='*50}")
    
    for name, healthy, status in results:
        icon = "✅" if healthy else "❌"
        print(f"{icon} {name}: {status}")
    
    # Specific recommendations based on the 8004 response
    print(f"\n🔧 SPECIFIC FIXES NEEDED:")
    print("-" * 30)
    
    # Check ARTHA Backend issue (404 error)
    artha_healthy = any(name == "ARTHA Backend" and healthy for name, healthy, _ in results)
    if not artha_healthy:
        print("1. ARTHA Backend Issue:")
        print("   • Start ARTHA Backend: cd backend && npm run dev")
        print("   • Check if /api/health endpoint exists")
        print("   • Verify backend/.env configuration")
    
    # Check BHIV Core issue (timeout)
    bhiv_core_healthy = any(name == "BHIV Core" and healthy for name, healthy, _ in results)
    if not bhiv_core_healthy:
        print("2. BHIV Core Issue:")
        print("   • Start BHIV Core: cd v1-BHIV_CORE-main && python simple_api.py --port 8001")
        print("   • Check if service is hanging or slow to respond")
        print("   • Verify Python dependencies are installed")
    
    print(f"\n💡 Quick Fix Command:")
    print("   start-integrated-system.bat")

if __name__ == "__main__":
    main()