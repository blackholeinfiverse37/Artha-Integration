@echo off
echo ========================================
echo ARTHA + BHIV Integration Auto-Commit
echo ========================================

cd /d "c:\Users\Ashmit Pandey\Desktop\Artha Integration"

echo [1/6] Configuring Git...
git config user.name "ARTHA-BHIV Integration"
git config user.email "integration@artha-bhiv.local"

echo [2/6] Adding remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/blackholeinfiverse37/Artha-Integration.git

echo [3/6] Adding all files...
git add .

echo [4/6] Creating commit...
git commit -m "Complete ARTHA + BHIV Integration System

✅ ARTHA Accounting System
- React frontend with modern UI
- Node.js backend with MongoDB
- Complete accounting features: ledger, invoices, expenses, GST

✅ BHIV AI Integration
- 4 minimal microservices (ports 8001-8004)
- AI-powered accounting guidance
- Document processing and analysis
- Real-time health monitoring

✅ Integration Features
- Fixed BHIV connection in ARTHA backend
- Automated startup scripts
- Comprehensive testing tools
- Production-ready deployment

✅ Documentation
- Complete setup guide
- Troubleshooting documentation
- API reference and examples
- Health monitoring tools"

echo [5/6] Setting main branch...
git branch -M main

echo [6/6] Pushing to GitHub...
git push -u origin main

echo.
echo ========================================
echo ✅ COMMIT COMPLETED SUCCESSFULLY!
echo ========================================
echo Repository: https://github.com/blackholeinfiverse37/Artha-Integration.git
echo.
pause