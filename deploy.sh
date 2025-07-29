#!/bin/bash

# MineCash Discord Bot Deployment Script

echo "🚀 Starting MineCash Discord Bot deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy env.example to .env and fill in your configuration."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Deploy slash commands
echo "🔧 Deploying slash commands..."
npm run deploy-commands

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo "✅ Slash commands deployed successfully!"
else
    echo "❌ Failed to deploy slash commands!"
    exit 1
fi

# Start the bot
echo "🤖 Starting Discord bot server..."
npm start 