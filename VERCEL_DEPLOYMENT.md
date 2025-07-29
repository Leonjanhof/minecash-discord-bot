# Vercel Deployment Guide for MineCash Discord Bot

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **Environment Variables**: All required environment variables ready

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 2: Login to Vercel

```bash
vercel login
```

## Step 3: Set Environment Variables

You need to set these environment variables in Vercel:

### Required Environment Variables:
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_GUILD_ID` - Your Discord server ID
- `ADMIN_ROLE_ID` - Admin role ID for ticket management
- `SUPPORT_CATEGORY_ID` - Category ID for support tickets
- `DEPOSIT_WITHDRAW_CATEGORY_ID` - Category ID for deposit/withdraw tickets
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `DISCORD_BOT_SECRET` - Secret for API authentication

### How to set environment variables:

#### Option A: Via Vercel Dashboard
1. Go to your project in Vercel dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with its value

#### Option B: Via Vercel CLI
```bash
vercel env add DISCORD_BOT_TOKEN
vercel env add DISCORD_GUILD_ID
vercel env add ADMIN_ROLE_ID
vercel env add SUPPORT_CATEGORY_ID
vercel env add DEPOSIT_WITHDRAW_CATEGORY_ID
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add DISCORD_BOT_SECRET
```

## Step 4: Deploy to Vercel

### Option A: Deploy via GitHub Integration (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository: `leonjanhof/minecash-discord-bot`
4. Configure the project:
   - Framework Preset: Node.js
   - Root Directory: `./`
   - Build Command: `npm run vercel-build`
   - Output Directory: `./`
5. Add environment variables in the dashboard
6. Deploy!

### Option B: Deploy via CLI
```bash
vercel --prod
```

## Step 5: Configure Discord Bot

### Update Bot Gateway Intents
Make sure your Discord bot has these Gateway Intents enabled:
- Server Members Intent
- Message Content Intent
- Presence Intent (if needed)

### Update Bot Permissions
Your bot needs these permissions:
- Manage Channels
- Send Messages
- Read Message History
- View Channels
- Manage Messages

## Step 6: Test Your Deployment

### Health Check
```bash
curl https://your-vercel-app.vercel.app/health
```

### Test API Endpoints
```bash
# Check if user is in server
curl -X POST https://your-vercel-app.vercel.app/check-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DISCORD_BOT_SECRET" \
  -d '{"userId": "USER_ID_HERE"}'

# Create a ticket
curl -X POST https://your-vercel-app.vercel.app/create-ticket \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DISCORD_BOT_SECRET" \
  -d '{"userId": "USER_ID_HERE", "type": "support", "description": "Test ticket"}'
```

## Important Notes

### Discord Bot Limitations
- **Serverless Functions**: Vercel uses serverless functions, so your Discord bot won't stay "online" 24/7
- **WebSocket Connections**: Discord bots require persistent WebSocket connections, which don't work well with serverless
- **Alternative**: Consider using a traditional hosting service (Railway, Heroku, DigitalOcean) for the Discord bot itself

### Recommended Architecture
1. **Discord Bot**: Host on Railway/Heroku for persistent connection
2. **API Server**: Host on Vercel for webhook endpoints
3. **Database**: Supabase (already configured)

### For Full Discord Bot Functionality
If you need the Discord bot to stay online, consider:
- **Railway**: Great for Discord bots
- **Heroku**: Reliable hosting
- **DigitalOcean**: More control
- **AWS EC2**: Full server control

## Troubleshooting

### Common Issues:
1. **Environment Variables**: Make sure all are set correctly
2. **Discord Permissions**: Verify bot has required permissions
3. **Supabase Connection**: Check Supabase URL and keys
4. **CORS Issues**: API endpoints should handle CORS properly

### Logs
Check Vercel function logs in the dashboard for debugging.

## API Endpoints

Your deployed API will have these endpoints:
- `GET /health` - Health check
- `POST /check-user` - Check if user is in Discord server
- `POST /create-ticket` - Create a Discord ticket

All endpoints require the `Authorization: Bearer YOUR_SECRET` header. 