#!/usr/bin/env python3
"""
ARTHA + BHIV Startup Verification Script
Ensures all services are properly configured and running before frontend starts
"""

import requests
import json
import time
import sys
import os
from datetime import datetime

class StartupVerification:
    def __init__(self):
        self.base_path = os.path.dirname(os.path.abspath(__file__))
        self.services = {
            'ARTHA Backend': {
                'url': 'http://localhost:5000/api/health',
                'required': True,
                'startup_cmd': 'cd backend && npm run dev'
            },
            'BHIV Core': {
                'url': 'http://localhost:8001/health',
                'required': True,
                'startup_cmd': 'cd v1-BHIV_CORE-main && python simple_api.py --port 8001'
            },
            'BHIV Central': {
                'url': 'http://localhost:8000/health',
                'required': True,
                'startup_cmd': 'cd BHIV_Central_Depository-main && python main.py'
            },
            'Integration Bridge': {
                'url': 'http://localhost:8004/health',
                'required': True,
                'startup_cmd': 'node integration-bridge.js'
            }
        }
        
    def check_service(self, name, config):
        """Check if a service is healthy"""
        try:
            response = requests.get(config['url'], timeout=10)
            if response.status_code == 200:
                data = response.json()
                return True, "Healthy", data
            else:
                return False, f"HTTP {response.status_code}", None
        except requests.exceptions.ConnectionError:
            return False, "Connection refused - service not running", None
        except requests.exceptions.Timeout:
            return False, "Timeout - service not responding", None
        except Exception as e:
            return False, f"Error: {str(e)}", None
    
    def test_login_endpoint(self):
        """Test the login endpoint specifically"""
        try:
            response = requests.post(
                'http://localhost:5000/api/v1/auth/login',
                json={
                    'email': 'admin@artha.local',
                    'password': 'Admin@123456'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('data', {}).get('token'):
                    return True, "Login endpoint working", data
                else:
                    return False, "Login endpoint returned invalid response", data
            elif response.status_code == 401:
                return False, "Invalid credentials - admin user may not exist", None
            else:
                return False, f"Login endpoint returned HTTP {response.status_code}", None
                
        except Exception as e:
            return False, f"Login test error: {str(e)}", None
    
    def check_file_structure(self):
        """Check if required files exist"""
        required_files = [
            'backend/src/server.js',
            'frontend/src/App.jsx',
            'v1-BHIV_CORE-main/simple_api.py',
            'BHIV_Central_Depository-main/main.py',
            'integration-bridge.js'
        ]
        
        missing_files = []
        for file_path in required_files:
            full_path = os.path.join(self.base_path, file_path)
            if not os.path.exists(full_path):
                missing_files.append(file_path)
        
        return len(missing_files) == 0, missing_files
    
    def run_verification(self):
        """Run complete startup verification"""
        print("🔍 ARTHA + BHIV Startup Verification")
        print("=" * 60)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Check file structure
        print("📁 Checking file structure...")
        files_ok, missing_files = self.check_file_structure()
        if files_ok:
            print("✅ All required files present")
        else:
            print("❌ Missing files:")
            for file in missing_files:
                print(f"   • {file}")
            print()
            return 1
        
        print()
        
        # Check services
        print("🏥 Checking services...")
        all_healthy = True
        results = {}
        
        for service_name, config in self.services.items():
            print(f"   Checking {service_name}...")
            is_healthy, status, data = self.check_service(service_name, config)
            results[service_name] = {
                'healthy': is_healthy, 
                'status': status, 
                'data': data,
                'config': config
            }
            
            if is_healthy:
                print(f"   ✅ {service_name}: {status}")
            else:
                print(f"   ❌ {service_name}: {status}")
                if config['required']:
                    all_healthy = False
        
        print()
        
        # Test login endpoint specifically
        if results.get('ARTHA Backend', {}).get('healthy'):
            print("🔐 Testing login endpoint...")
            login_ok, login_status, login_data = self.test_login_endpoint()
            if login_ok:
                print(f"   ✅ Login test: {login_status}")
            else:
                print(f"   ❌ Login test: {login_status}")
                if "admin user may not exist" in login_status:
                    print("   💡 Run: cd backend && node scripts/ensure-admin.js")
                all_healthy = False
            print()
        
        # Summary
        print("=" * 60)
        
        if all_healthy:
            print("🎉 All systems ready! Frontend can start safely.")
            print()
            print("🚀 Next steps:")
            print("   1. Start frontend: cd frontend && npm run dev")
            print("   2. Access ARTHA: http://localhost:5173")
            print("   3. Login with: admin@artha.local / Admin@123456")
            print()
            print("📊 Service Status:")
            for service_name, result in results.items():
                if result['healthy']:
                    print(f"   ✅ {service_name}: Running")
                else:
                    print(f"   ❌ {service_name}: Not running")
            return 0
        else:
            print("⚠️  Some services are not ready. Please start missing services:")
            print()
            
            for service_name, result in results.items():
                if not result['healthy'] and result['config']['required']:
                    print(f"   • {service_name}:")
                    print(f"     Command: {result['config']['startup_cmd']}")
                    print(f"     Status: {result['status']}")
                    print()
            
            print("💡 Quick fixes:")
            print("   • Run complete startup: start-integrated-system.bat")
            print("   • Fix login issues: fix-frontend-login.bat")
            print("   • Create admin user: cd backend && node scripts/ensure-admin.js")
            return 1

def main():
    verifier = StartupVerification()
    return verifier.run_verification()

if __name__ == "__main__":
    sys.exit(main())