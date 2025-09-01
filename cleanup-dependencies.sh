#!/bin/bash
echo "Cleaning up network capture dependencies..."

echo ""
echo "Removing backend node_modules..."
cd backend
rm -rf node_modules package-lock.json

echo ""
echo "Reinstalling backend dependencies (without cap library)..."
npm install

echo ""
echo "Updating Python requirements (removing pyshark)..."
cd ../model
pip uninstall -y pyshark

echo ""
echo "Cleanup complete! Network capture dependencies removed."
echo "The system now uses simulation mode only."