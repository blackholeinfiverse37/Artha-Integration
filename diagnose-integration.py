#!/usr/bin/env python3
"""
BHIV + ARTHA Integration Troubleshooting Tool
Diagnoses common issues and provides solutions
"""

import requests
import json
import os
import subprocess
import sys
from pathlib import Path

def check_port_usage(port):
    """Check if a port is in use"""
    try:
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True, shell=True)
        return f":{port}" in result.stdout
    except:
        return False

def check_file_exists(filepath):
    """Check if a file exists"""
    return Path(filepath).exists()

def check_env_variable(filepath, variable):
    """Check if environment variable is set in .env file"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            return variable in content
    except:
        return False

def diagnose_services():
    """Diagnose service issues"""
    print("🔍 Diagnosing BHIV + ARTHA Integration Issues")
    print("=" * 60)
    
    issues = []
    solutions = []
    
    # Check if required files exist
    required_files = [
        ("backend/.env", "ARTHA Backend configuration"),
        ("backend/src/server.js", "ARTHA Backend server"),
        ("frontend/src/App.jsx", "ARTHA Frontend"),
        ("v1-BHIV_CORE-main/simple_api.py", "BHIV Core API"),
        ("BHIV_Central_Depository-main/main.py", "BHIV Central Depository"),
        ("integration-bridge.js", "Integration Bridge")
    ]
    
    print("📁 Checking required files...")
    for filepath, description in required_files:
        if check_file_exists(filepath):
            print(f"✅ {description}: Found")
        else:
            print(f"❌ {description}: Missing")
            issues.append(f"Missing {description}")
            solutions.append(f"Ensure {filepath} exists in the project directory")
    
    print()
    
    # Check environment configuration
    print("⚙️  Checking environment configuration...")
    if check_file_exists("backend/.env"):
        env_checks = [
            ("BHIV_INTEGRATION_ENABLED=true", "BHIV integration enabled"),
            ("BHIV_CENTRAL_DEPOSITORY_URL=http://localhost:8000", "Central Depository URL"),
            ("BHIV_SIMPLE_API_URL=http://localhost:8001", "BHIV Core URL")
        ]
        
        for env_var, description in env_checks:
            if check_env_variable("backend/.env", env_var):
                print(f"✅ {description}: Configured")
            else:
                print(f"❌ {description}: Not configured")
                issues.append(f"Missing environment variable: {env_var}")
                solutions.append(f"Add {env_var} to backend/.env file")
    else:
        issues.append("Backend .env file missing")
        solutions.append("Create backend/.env file with required BHIV configuration")
    
    print()
    
    # Check port usage
    print("🌐 Checking port availability...")
    ports = [
        (5000, "ARTHA Backend"),
        (5173, "ARTHA Frontend"),
        (8000, "BHIV Central"),
        (8001, "BHIV Core"),
        (8004, "Integration Bridge")
    ]
    
    for port, service in ports:
        if check_port_usage(port):
            print(f"⚠️  Port {port} ({service}): In use")
        else:
            print(f"✅ Port {port} ({service}): Available")
    
    print()
    
    # Check service health
    print("🏥 Checking service health...")
    services = [
        ("ARTHA Backend", "http://localhost:5000/api/health"),
        ("BHIV Core", "http://localhost:8001/health"),
        ("BHIV Central", "http://localhost:8000/health"),
        ("Integration Bridge", "http://localhost:8004/health")
    ]
    
    for name, url in services:
        try:
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                print(f"✅ {name}: Healthy")
            else:
                print(f"❌ {name}: Unhealthy (HTTP {response.status_code})")
                issues.append(f"{name} service unhealthy")
                solutions.append(f"Restart {name} service")
        except requests.exceptions.ConnectionError:
            print(f"❌ {name}: Not running")
            issues.append(f"{name} service not running")
            solutions.append(f"Start {name} service")
        except Exception as e:
            print(f"❌ {name}: Error - {str(e)}")
    
    print()
    
    # Summary and recommendations
    print("=" * 60)
    print("📋 DIAGNOSIS SUMMARY")
    print("=" * 60)
    
    if not issues:
        print("🎉 No issues detected! System appears to be configured correctly.")
        print()
        print("Next steps:")
        print("1. Run: start-integrated-system.bat")
        print("2. Wait for all services to start")
        print("3. Run: python test-bhiv-artha-integration.py")
    else:
        print(f"⚠️  Found {len(issues)} issue(s):")
        print()
        
        for i, issue in enumerate(issues, 1):
            print(f"{i}. {issue}")
        
        print()
        print("🔧 RECOMMENDED SOLUTIONS:")
        print()
        
        for i, solution in enumerate(solutions, 1):
            print(f"{i}. {solution}")
        
        print()
        print("Quick fixes:")
        print("• Run: verify-integration-setup.bat")
        print("• Run: start-integrated-system.bat")
        print("• Check service logs for detailed error messages")
    
    return len(issues) == 0

def main():
    """Main function"""
    try:
        success = diagnose_services()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n\nDiagnosis interrupted by user.")
        return 1
    except Exception as e:
        print(f"\nUnexpected error during diagnosis: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())