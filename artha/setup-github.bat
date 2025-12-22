@echo off
echo Setting up GitHub repository...
git remote remove origin
git remote add origin https://github.com/blackholeinfiverse37/Artha-Integration.git
git branch -M main
git push -u origin main
echo Repository pushed successfully!