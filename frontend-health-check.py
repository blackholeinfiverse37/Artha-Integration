#!/usr/bin/env python3
"""
Frontend Health Check Script
Verifies all required services are running before frontend starts
"""

import requests
import json
import time
import sys
from datetime import datetime

class FrontendHealthCheck:
    def __init__(self):
        self.services = {
            'ARTHA Backend': 'http://localhost:5000/api/health',
            'BHIV Core': 'http://localhost:8001/health',
            'BHIV Central': 'http://localhost:8000/health',
            'Integration Bridge': 'http://localhost:8004/health'
        }
        
    def check_service(self, name, url):
        """Check if a service is healthy"""
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                return True, "Healthy"
            else:
                return False, f"HTTP {response.status_code}"
        except requests.exceptions.ConnectionError:
            return False, "Connection refused - service not running"
        except requests.exceptions.Timeout:
            return False, "Timeout - service not responding"
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    def run_health_check(self):
        """Run health check for all services"""
        print("🏥 Frontend Health Check")
        print("=" * 50)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        all_healthy = True
        results = {}
        
        for service_name, url in self.services.items():
            print(f"Checking {service_name}...")
            is_healthy, status = self.check_service(service_name, url)
            results[service_name] = {'healthy': is_healthy, 'status': status}
            
            if is_healthy:
                print(f"✅ {service_name}: {status}")
            else:
                print(f"❌ {service_name}: {status}")
                all_healthy = False
        
        print()
        print("=" * 50)
        
        if all_healthy:
            print("🎉 All services are healthy! Frontend can start safely.")
            print()
            print("🚀 You can now:")
            print("   1. Start the frontend: npm run dev")
            print("   2. Access ARTHA: http://localhost:5173")
            print("   3. Login with: admin@artha.local / Admin@123456")
            return 0
        else:
            print("⚠️  Some services are not healthy. Please start missing services:")
            print()
            
            for service_name, result in results.items():
                if not result['healthy']:
                    if service_name == 'ARTHA Backend':
                        print(f"   • {service_name}: cd backend && npm run dev")
                    elif service_name == 'BHIV Core':
                        print(f"   • {service_name}: cd v1-BHIV_CORE-main && python simple_api.py --port 8001")
                    elif service_name == 'BHIV Central':
                        print(f"   • {service_name}: cd BHIV_Central_Depository-main && python main.py")
                    elif service_name == 'Integration Bridge':
                        print(f"   • {service_name}: node integration-bridge.js")
            
            print()
            print("💡 Or run the complete startup script:")
            print("   start-integrated-system.bat")
            return 1

def main():
    checker = FrontendHealthCheck()
    return checker.run_health_check()

if __name__ == "__main__":
    sys.exit(main())