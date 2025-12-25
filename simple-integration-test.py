#!/usr/bin/env python3
"""
Simple BHIV + ARTHA Integration Test
Tests the complete integration between BHIV and ARTHA systems
"""

import requests
import json
import time
import sys
from datetime import datetime

class SimpleIntegrationTest:
    def __init__(self):
        self.artha_base_url = "http://localhost:5000/api/v1"
        self.bhiv_core_url = "http://localhost:8001"
        self.bhiv_central_url = "http://localhost:8000"
        self.integration_bridge_url = "http://localhost:8004"
        self.auth_token = None
        
    def login_to_artha(self):
        """Login to ARTHA and get auth token"""
        try:
            response = requests.post(
                f"{self.artha_base_url}/auth/login",
                json={
                    "email": "admin@artha.local",
                    "password": "Admin@123456"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                self.auth_token = response.json().get("data", {}).get("token")
                return True, "Login successful"
            else:
                return False, f"Login failed: HTTP {response.status_code}"
                
        except Exception as e:
            return False, f"Login error: {str(e)}"
    
    def get_auth_headers(self):
        """Get authorization headers"""
        if not self.auth_token:
            return {}
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    def test_service_health(self, service_name, url):
        """Test service health"""
        try:
            response = requests.get(f"{url}/health", timeout=10)
            if response.status_code == 200:
                return True, f"{service_name}: Healthy"
            else:
                return False, f"{service_name}: Unhealthy (HTTP {response.status_code})"
        except Exception as e:
            return False, f"{service_name}: Error - {str(e)}"
    
    def test_bhiv_integration(self):
        """Test BHIV integration through ARTHA"""
        try:
            response = requests.get(
                f"{self.artha_base_url}/bhiv/status",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json().get("data", {})
                return True, f"BHIV Integration: {data.get('status', 'unknown')}"
            else:
                return False, f"BHIV Integration failed: HTTP {response.status_code}"
                
        except Exception as e:
            return False, f"BHIV Integration error: {str(e)}"
    
    def test_agent_execution(self):
        """Test agent execution"""
        try:
            response = requests.post(
                f"{self.artha_base_url}/bhiv/guidance",
                headers=self.get_auth_headers(),
                json={"query": "What is accounting?"},
                timeout=20
            )
            
            if response.status_code == 200:
                return True, "Agent execution: Working"
            else:
                return False, f"Agent execution failed: HTTP {response.status_code}"
                
        except Exception as e:
            return False, f"Agent execution error: {str(e)}"
    
    def run_tests(self):
        """Run all integration tests"""
        print("BHIV + ARTHA Integration Test Suite")
        print("=" * 50)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        tests = [
            ("ARTHA Authentication", self.login_to_artha),
            ("ARTHA Backend", lambda: self.test_service_health("ARTHA Backend", "http://localhost:5000/api")),
            ("BHIV Central", lambda: self.test_service_health("BHIV Central", self.bhiv_central_url)),
            ("BHIV Core", lambda: self.test_service_health("BHIV Core", self.bhiv_core_url)),
            ("Integration Bridge", lambda: self.test_service_health("Integration Bridge", self.integration_bridge_url)),
            ("BHIV Integration", self.test_bhiv_integration),
            ("Agent Execution", self.test_agent_execution)
        ]
        
        results = []
        
        for test_name, test_func in tests:
            print(f"Testing: {test_name}")
            
            try:
                success, message = test_func()
                
                if success:
                    print(f"  PASS: {message}")
                else:
                    print(f"  FAIL: {message}")
                
                results.append((test_name, success, message))
                
            except Exception as e:
                print(f"  ERROR: {str(e)}")
                results.append((test_name, False, f"Exception: {str(e)}"))
            
            print()
        
        # Summary
        print("=" * 50)
        print("Test Summary:")
        print("-" * 25)
        
        passed = sum(1 for _, success, _ in results if success)
        total = len(results)
        
        for test_name, success, message in results:
            status = "PASS" if success else "FAIL"
            print(f"{status}: {test_name}")
            if not success:
                print(f"      {message}")
        
        print()
        print(f"Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("SUCCESS: All tests passed! Integration is working correctly.")
            return 0
        else:
            print(f"WARNING: {total - passed} test(s) failed. Integration needs attention.")
            return 1

def main():
    tester = SimpleIntegrationTest()
    return tester.run_tests()

if __name__ == "__main__":
    sys.exit(main())