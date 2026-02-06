#!/bin/bash

# Setup script for PM2 autostart on Raspberry Pi boot
# This script configures PM2 to automatically start the temperature monitoring app on system boot

set -e

echo "🚀 Setting up PM2 autostart for temperature monitoring application"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing PM2 globally..."
    npm install -g pm2
else
    echo "✅ PM2 is already installed"
fi

# Get the current directory
APP_DIR="$HOME/www/temperature"

# Check if we're in the right directory
if [ ! -f "$APP_DIR/package.json" ]; then
    echo "❌ Error: package.json not found in $APP_DIR"
    echo "Please run this script from the temperature project directory or update APP_DIR"
    exit 1
fi

echo "📁 Application directory: $APP_DIR"
echo ""

# Build the application
echo "🔨 Building the application..."
cd "$APP_DIR"
npm run build

# Stop any existing PM2 processes
echo "🛑 Stopping any existing PM2 processes..."
pm2 stop temperature 2>/dev/null || true
pm2 delete temperature 2>/dev/null || true

# Start the application with PM2
echo "▶️  Starting application with PM2..."
pm2 start dist/index.js --name temperature --time

# Save the PM2 process list
echo "💾 Saving PM2 process list..."
pm2 save

# Generate PM2 startup script
echo "🔧 Generating PM2 startup script..."
pm2 startup systemd -u $USER --hp $HOME

echo ""
echo "⚠️  IMPORTANT: Copy and run the command shown above (if any) with sudo"
echo ""
echo "After running the sudo command, the setup will be complete!"
echo ""
echo "📋 Useful commands:"
echo "  pm2 status          - Check application status"
echo "  pm2 logs temperature - View application logs"
echo "  pm2 restart temperature - Restart the application"
echo "  pm2 stop temperature - Stop the application"
echo "  pm2 monit           - Monitor all processes"
echo ""
echo "✅ Setup complete! The application will now start automatically on boot."
echo "To disable auto-start, run 'pm2 stop temperature', 'pm2 delete temperature' and 'pm2 unstartup systemd'"
exit 0;