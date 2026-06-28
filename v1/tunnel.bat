@echo off
echo ========================================
echo Starting Pinggy Tunnel
echo ========================================
echo.
echo Make sure your Flask app is running on port 5000 first!
echo.
echo This window must stay open for the tunnel to work.
echo Press Ctrl+C to stop the tunnel.
echo.
echo ========================================
echo.

ssh -p 443 -R0:localhost:5000 a.pinggy.io

pause






