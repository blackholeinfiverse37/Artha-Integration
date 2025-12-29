# 🌐 ARTHA + BHIV Network Access Guide

## 🎯 **Quick Network Setup**

### **Option 1: Automated Network Startup**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration"
start-network-system.bat
```

### **Option 2: Manual Network Configuration**
```cmd
# Set environment variables for network mode
set HOST=0.0.0.0
set VITE_NETWORK_MODE=true
set FASTAPI_HOST=0.0.0.0
set INTEGRATION_BRIDGE_HOST=0.0.0.0

# Then run normal startup
start-integrated-system.bat
```

## 🔧 **Network Configuration Details**

### **Frontend (React/Vite)**
- **Local**: http://localhost:5173
- **Network**: http://[YOUR_IP]:5173
- **Configuration**: `vite.config.js` → `host: '0.0.0.0'`

### **Backend (Node.js/Express)**
- **Local**: http://localhost:5000
- **Network**: http://[YOUR_IP]:5000
- **Configuration**: Binds to `0.0.0.0:5000`
- **CORS**: Automatically allows network origins

### **BHIV Core (Python/FastAPI)**
- **Local**: http://localhost:8001
- **Network**: http://[YOUR_IP]:8001
- **Configuration**: `--host 0.0.0.0 --port 8001`

### **BHIV Central (Python/FastAPI)**
- **Local**: http://localhost:8000
- **Network**: http://[YOUR_IP]:8000
- **Configuration**: `host="0.0.0.0", port=8000`

### **Integration Bridge (Node.js)**
- **Local**: http://localhost:8004
- **Network**: http://[YOUR_IP]:8004
- **Configuration**: Binds to `0.0.0.0:8004`

## 📱 **Finding Your IP Address**

### **Windows:**
```cmd
ipconfig | findstr "IPv4 Address"
```

### **Example Output:**
```
IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

### **Your Network URLs:**
- Frontend: http://192.168.1.100:5173
- Backend: http://192.168.1.100:5000
- BHIV Core: http://192.168.1.100:8001
- BHIV Central: http://192.168.1.100:8000
- Integration Bridge: http://192.168.1.100:8004

## 🔐 **Security Considerations**

### **CORS Configuration**
- Backend automatically allows origins matching `http://[IP]:5173`
- Safe for local network use
- Blocks external/internet access

### **Firewall Settings**
- Windows may prompt to allow network access
- Allow for "Private networks" only
- Do NOT allow for "Public networks"

### **Network Access**
- ✅ Same WiFi network: Works
- ✅ Same LAN: Works
- ❌ Internet access: Blocked (by design)
- ❌ Different networks: Blocked

## 🧪 **Testing Network Access**

### **From Another Device:**
1. Connect to same WiFi network
2. Open browser
3. Navigate to: http://[HOST_IP]:5173
4. Login with: admin@artha.local / Admin@123456

### **Verification Script:**
```cmd
# Run on host machine
python test-bhiv-artha-integration.py
```

### **Mobile Testing:**
1. Connect phone to same WiFi
2. Open mobile browser
3. Go to: http://192.168.1.100:5173 (replace with your IP)
4. Should see ARTHA login page

## 🛠️ **Troubleshooting**

### **Frontend Not Accessible on Network**
```cmd
# Check Vite config
cd frontend
npm run dev -- --host 0.0.0.0
```

### **Backend CORS Errors**
- Check browser console for CORS errors
- Verify origin matches pattern: http://[IP]:5173
- Backend logs will show blocked origins

### **Services Not Binding to Network**
```cmd
# Check if services are listening on 0.0.0.0
netstat -an | findstr :5000
netstat -an | findstr :5173
netstat -an | findstr :8000
netstat -an | findstr :8001
netstat -an | findstr :8004
```

### **IP Address Changes**
- Restart services if IP changes
- Update any hardcoded references
- Use dynamic IP detection in scripts

## 📊 **Network Performance**

| Access Type | Speed | Latency | Recommended |
|-------------|-------|---------|-------------|
| **Localhost** | Fastest | <1ms | Development |
| **Same WiFi** | Fast | 1-5ms | Testing |
| **Same LAN** | Good | 5-20ms | Demo |
| **VPN** | Slower | 20-100ms | Remote Access |

## 🎉 **Success Indicators**

### **All Working When:**
- ✅ Frontend loads on network IP
- ✅ Login works from network device
- ✅ Dashboard shows BHIV integration
- ✅ AI responses work
- ✅ All health checks pass

### **Common Issues:**
- ❌ Connection refused → Service not bound to 0.0.0.0
- ❌ CORS error → Origin not allowed
- ❌ Timeout → Firewall blocking
- ❌ 404 errors → Wrong IP/port

## 🚀 **Production Notes**

For production deployment:
- Use proper domain names
- Configure SSL/HTTPS
- Set up reverse proxy (nginx)
- Use environment-specific configs
- Enable proper authentication
- Set up monitoring and logging