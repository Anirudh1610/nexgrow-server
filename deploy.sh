#!/bin/bash

# Deployment script for nexgrow-server to DigitalOcean

echo "🚀 Starting deployment to production..."

# Build the production version
echo "📦 Building production bundle..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to server
# Replace with your actual server details
SERVER_USER="root"
SERVER_IP="209.38.122.225"  # Your api subdomain IP
DEPLOY_PATH="/var/www/nex-grow.co.in"

echo "📤 Deploying to server $SERVER_IP..."

# Option 1: Using rsync (recommended)
rsync -avz --delete build/ $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/

# Option 2: Using scp (alternative)
# scp -r build/* $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/

echo "✅ Deployment complete!"
echo "🌐 Your site should be live at https://nex-grow.co.in"
