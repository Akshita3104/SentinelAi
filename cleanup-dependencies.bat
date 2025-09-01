@echo off
echo Cleaning up network capture dependencies...

echo.
echo Removing backend node_modules...
cd backend
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo Reinstalling backend dependencies (without cap library)...
npm install

echo.
echo Updating Python requirements (removing pyshark)...
cd ..\model
pip uninstall -y pyshark

echo.
echo Cleanup complete! Network capture dependencies removed.
echo The system now uses simulation mode only.
echo.
pause