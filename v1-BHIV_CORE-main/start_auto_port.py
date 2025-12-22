#!/usr/bin/env python3
"""
Auto-port BHIV Simple API
Automatically finds available port starting from 8001
"""

import socket
import uvicorn
from simple_api_minimal import app

def find_free_port(start_port=8001):
    """Find the first available port starting from start_port"""
    for port in range(start_port, start_port + 10):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
                return port
        except OSError:
            continue
    raise RuntimeError("No free ports found")

if __name__ == "__main__":
    try:
        port = find_free_port(8001)
        print(f"Starting BHIV Simple API on port {port}")
        print(f"URL: http://localhost:{port}")
        print(f"Health: http://localhost:{port}/health")
        uvicorn.run(app, host="0.0.0.0", port=port)
    except Exception as e:
        print(f"Failed to start: {e}")
        input("Press Enter to exit...")