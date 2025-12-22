#!/usr/bin/env python3
"""
BHIV Core + ARTHA Integration Test Suite
Tests the complete integration between BHIV AI and ARTHA accounting system
"""

import requests
import json
import time
import sys
from datetime import datetime

class BHIVARTHAIntegrationTest:
    def __init__(self):
        self.artha_base_url = "http://localhost:5000/api/v1"
        self.bhiv_simple_api = "http://localhost:8001"
        self.bhiv_mcp_bridge = "http://localhost:8002"
        self.integration_bridge = "http://localhost:8004"
        self.auth_token = None
        
    def login_to_artha(self):
        """Login to ARTHA and get auth token"""
        try:
            response = requests.post(
                f"{self.artha_base_url}/auth/login",
                json={
                    "email": "admin@artha.local",
                    "password": "admin123"
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
    
    def test_bhiv_status_via_artha(self):
        """Test BHIV status through ARTHA API"""
        try:
            response = requests.get(
                f"{self.artha_base_url}/bhiv/status",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json().get("data", {})
                status = data.get("status", "unknown")
                return True, f"BHIV Status: {status}", data
            else:
                return False, f"Status check failed: HTTP {response.status_code}", None
                
        except Exception as e:
            return False, f"Status check error: {str(e)}", None
    
    def test_ai_guidance_via_artha(self):
        """Test AI guidance through ARTHA API"""
        try:
            test_query = "How do I record a cash sale transaction in double-entry bookkeeping?"
            
            response = requests.post(
                f"{self.artha_base_url}/bhiv/guidance",
                headers=self.get_auth_headers(),
                json={"query": test_query},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json().get("data", {})
                ai_response = data.get("response", "")
                return True, f"AI Guidance received: {len(ai_response)} characters", data
            else:
                return False, f"AI guidance failed: HTTP {response.status_code}", None
                
        except Exception as e:
            return False, f"AI guidance error: {str(e)}", None
    
    def test_direct_bhiv_simple_api(self):
        """Test BHIV Simple API directly"""
        try:
            response = requests.post(
                f"{self.bhiv_simple_api}/ask-vedas",
                json={
                    "query": "What is the accounting equation?",
                    "user_id": "integration_test"
                },
                timeout=20
            )
            
            if response.status_code == 200:
                data = response.json()
                return True, "Direct BHIV API working", data
            else:
                return False, f"Direct BHIV API failed: HTTP {response.status_code}", None
                
        except Exception as e:
            return False, f"Direct BHIV API error: {str(e)}", None
    
    def test_integration_bridge_health(self):
        """Test Integration Bridge health"""
        try:
            response = requests.get(
                f"{self.integration_bridge}/health",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return True, "Integration Bridge healthy", data
            else:
                return False, f"Integration Bridge unhealthy: HTTP {response.status_code}", None
                
        except Exception as e:
            return False, f"Integration Bridge error: {str(e)}", None
    
    def test_artha_ledger_access(self):
        """Test ARTHA ledger access"""
        try:
            response = requests.get(
                f"{self.artha_base_url}/ledger/entries?limit=5",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json().get("data", {})
                entries = data.get("entries", [])
                return True, f"Ledger access: {len(entries)} entries found", data
            else:
                return False, f"Ledger access failed: HTTP {response.status_code}", None
                
        except Exception as e:
            return False, f"Ledger access error: {str(e)}", None
    
    def run_comprehensive_test(self):
        """Run all integration tests"""
        print("🧪 BHIV Core + ARTHA Integration Test Suite")
        print("=" * 60)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        tests = [
            ("🔐 ARTHA Authentication", self.login_to_artha),
            ("📊 BHIV Status via ARTHA", self.test_bhiv_status_via_artha),
            ("🧠 AI Guidance via ARTHA", self.test_ai_guidance_via_artha),
            ("📡 Direct BHIV Simple API", self.test_direct_bhiv_simple_api),
            ("🔗 Integration Bridge Health", self.test_integration_bridge_health),
            ("📚 ARTHA Ledger Access", self.test_artha_ledger_access)
        ]
        
        results = []
        
        for test_name, test_func in tests:
            print(f"Running: {test_name}")
            print("-" * 40)
            
            try:
                result = test_func()
                if isinstance(result, tuple) and len(result) >= 2:
                    success, message = result[0], result[1]
                    data = result[2] if len(result) > 2 else None
                else:
                    success, message, data = result, "Unknown result", None
                
                if success:
                    print(f"✅ PASS: {message}")
                    if data and isinstance(data, dict):
                        # Show relevant data snippets
                        if "status" in data:
                            print(f"   └─ Status: {data['status']}")
                        if "response" in data and len(str(data['response'])) > 0:
                            response_preview = str(data['response'])[:100]
                            print(f"   └─ Response: {response_preview}...")
                else:
                    print(f"❌ FAIL: {message}")
                
                results.append((test_name, success, message))
                
            except Exception as e:
                print(f"💥 ERROR: {str(e)}")
                results.append((test_name, False, f"Exception: {str(e)}"))
            
            print()
            time.sleep(1)  # Brief pause between tests
        
        # Summary
        print("=" * 60)
        print("📋 Test Summary:")
        print("-" * 30)
        
        passed = sum(1 for _, success, _ in results if success)
        total = len(results)
        
        for test_name, success, message in results:
            status_icon = "✅" if success else "❌"
            print(f"{status_icon} {test_name}")
            if not success:
                print(f"   └─ {message}")
        
        print()
        print(f"📊 Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! BHIV Core is fully integrated with ARTHA.")
            print()
            print("🚀 Integration is working correctly:")
            print("   • BHIV AI services are running")
            print("   • ARTHA can communicate with BHIV")
            print("   • AI guidance is functional")
            print("   • All APIs are responding")
            print()
            print("💡 You can now use BHIV AI features in ARTHA:")
            print("   1. Open ARTHA Frontend: http://localhost:5173")
            print("   2. Go to Dashboard")
            print("   3. Use the BHIV AI Integration widget")
            print("   4. Ask for accounting guidance")
            return 0
        else:
            print(f"⚠️  {total - passed} test(s) failed. Integration needs attention.")
            print()
            print("🔧 Troubleshooting steps:")
            print("   1. Ensure all BHIV services are running")
            print("   2. Check service logs for errors")
            print("   3. Verify network connectivity")
            print("   4. Run: fix-bhiv-connection.bat")
            return 1

def main():
    tester = BHIVARTHAIntegrationTest()
    return tester.run_comprehensive_test()

if __name__ == "__main__":
    sys.exit(main())