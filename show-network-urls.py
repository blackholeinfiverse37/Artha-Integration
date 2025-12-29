#!/usr/bin/env python3
"""
Network Access URL Generator
Detects local IP and shows network access URLs
"""

import socket
import subprocess
import sys
import platform

def get_local_ip():
    """Get the local IP address"""
    try:
        # Connect to a remote address to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return None

def get_ip_windows():
    """Get IP address on Windows using ipconfig"""
    try:
        result = subprocess.run(['ipconfig'], capture_output=True, text=True)
        lines = result.stdout.split('\n')
        for line in lines:
            if 'IPv4 Address' in line and '192.168.' in line:
                ip = line.split(':')[1].strip()
                return ip
    except Exception:
        pass
    return None

def main():
    print("🌐 ARTHA + BHIV Network Access URLs")
    print("=" * 50)
    
    # Try to get local IP
    local_ip = get_local_ip()
    if not local_ip and platform.system() == 'Windows':
        local_ip = get_ip_windows()
    
    if not local_ip:
        print("❌ Could not detect local IP address")
        print("💡 Manually find your IP with: ipconfig (Windows) or ifconfig (Linux/Mac)")
        local_ip = "[YOUR_IP]"
    else:
        print(f"✅ Detected Local IP: {local_ip}")
    
    print()
    print("🏠 Local Access URLs:")
    print(f"   • Frontend:     http://localhost:5173")
    print(f"   • Backend:      http://localhost:5000")
    print(f"   • BHIV Core:    http://localhost:8001")
    print(f"   • BHIV Central: http://localhost:8000")
    print(f"   • Bridge:       http://localhost:8004")
    
    print()
    print("🌐 Network Access URLs:")
    print(f"   • Frontend:     http://{local_ip}:5173")
    print(f"   • Backend:      http://{local_ip}:5000")
    print(f"   • BHIV Core:    http://{local_ip}:8001")
    print(f"   • BHIV Central: http://{local_ip}:8000")
    print(f"   • Bridge:       http://{local_ip}:8004")
    
    print()
    print("📱 Mobile/Tablet Access:")
    print(f"   1. Connect device to same WiFi network")
    print(f"   2. Open browser and go to: http://{local_ip}:5173")
    print(f"   3. Login with: admin@artha.local / Admin@123456")
    
    print()
    print("🔐 Login Credentials:")
    print("   • Admin:      admin@artha.local / Admin@123456")
    print("   • Accountant: accountant@artha.local / Accountant@123")
    print("   • Viewer:     user@example.com / testuser123")
    
    print()
    print("🛠️ Network Setup:")
    print("   • Run: start-network-system.bat")
    print("   • Or: start-integrated-system.bat (with network env vars)")
    
    print()
    if local_ip != "[YOUR_IP]":
        print("✅ Ready for network access!")
    else:
        print("⚠️  Please find your IP address manually")

if __name__ == "__main__":
    main()